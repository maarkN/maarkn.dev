import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as getAsset, HEAD as headAsset, PUT as putAsset } from "@/app/api/claude-remote/updates/assets/[hash]/route";
import { GET as getManifest } from "@/app/api/claude-remote/updates/manifest/route";
import { POST as postManifest } from "@/app/api/claude-remote/updates/manifests/route";
import { authorized } from "./auth";
import { multipartManifest, parseManifestRequest } from "./protocol";
import { sha256Base64Url, UpdatesStore } from "./store";

const ORIGIN = "https://maarkn.dev";
const TOKEN = "test-token-0123456789";
const DEV_TOKEN = "dev-token-0123456789";
let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cr-updates-"));
  process.env.CLAUDE_REMOTE_UPDATES_DIR = dir;
  process.env.CLAUDE_REMOTE_UPDATES_TOKEN = TOKEN;
  process.env.CLAUDE_REMOTE_UPDATES_DEV_TOKEN = DEV_TOKEN;
});
afterEach(async () => {
  delete process.env.CLAUDE_REMOTE_UPDATES_DIR;
  delete process.env.CLAUDE_REMOTE_UPDATES_TOKEN;
  delete process.env.CLAUDE_REMOTE_UPDATES_DEV_TOKEN;
  await rm(dir, { recursive: true, force: true });
});

const ctx = (hash: string) => ({ params: Promise.resolve({ hash }) });
const auth = { authorization: `Bearer ${TOKEN}` };
const devAuth = { authorization: `Bearer ${DEV_TOKEN}` };
const appHeaders = (platform = "ios", runtime = "rt-1", channel?: string) => ({
  ...(channel ? { "expo-channel-name": channel } : {}),
  "expo-protocol-version": "1",
  "expo-platform": platform,
  "expo-runtime-version": runtime,
  accept: "multipart/mixed,application/expo+json,application/json",
});

async function upload(data: string, type = "application/javascript") {
  const bytes = new TextEncoder().encode(data);
  const hash = sha256Base64Url(bytes);
  const res = await putAsset(
    new Request(`${ORIGIN}/x`, { method: "PUT", headers: { ...auth, "content-type": type }, body: bytes }),
    ctx(hash),
  );
  return { hash, res };
}

function manifestFor(hash: string, createdAt: string, runtimeVersion = "rt-1") {
  const asset = {
    hash,
    key: "bundle",
    contentType: "application/javascript",
    url: `${ORIGIN}/api/claude-remote/updates/assets/${hash}`,
  };
  return JSON.stringify({ id: randomUUID(), createdAt, runtimeVersion, launchAsset: asset, assets: [], metadata: {} });
}

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const signed = (manifest: string) =>
  `sig="${sign("sha256", Buffer.from(manifest), privateKey).toString("base64")}", keyid="main"`;

function publish(body: unknown, headers: Record<string, string> = auth) {
  return postManifest(new Request(`${ORIGIN}/x`, { method: "POST", headers, body: JSON.stringify(body) }));
}

describe("protocol", () => {
  it("parses the app request", () => {
    expect(parseManifestRequest(new Headers(appHeaders()))).toEqual({
      ok: true,
      platform: "ios",
      runtimeVersion: "rt-1",
      channel: "production",
      multipart: true,
    });
    expect(parseManifestRequest(new Headers(appHeaders("ios", "rt-1", "development")))).toMatchObject({
      channel: "development",
    });
    expect(parseManifestRequest(new Headers(appHeaders("ios", "rt-1", "../x")))).toMatchObject({ status: 400 });
    expect(parseManifestRequest(new Headers(appHeaders("ios", "rt-1", "ios")))).toMatchObject({ status: 400 });
    expect(parseManifestRequest(new Headers({ ...appHeaders(), "expo-protocol-version": "0" }))).toMatchObject({
      status: 406,
    });
    expect(parseManifestRequest(new Headers(appHeaders("web")))).toMatchObject({ status: 400 });
    expect(parseManifestRequest(new Headers(appHeaders("ios", "../x")))).toMatchObject({ status: 400 });
  });

  it("builds a byte-exact multipart part", () => {
    const { body, contentType } = multipartManifest('{"a":"é"}', 'sig="x"', "b");
    expect(contentType).toBe("multipart/mixed; boundary=b");
    expect(body).toContain('expo-signature: sig="x"\r\n\r\n{"a":"é"}\r\n--b--');
  });
});

describe("auth", () => {
  it("needs the exact bearer token", () => {
    expect(authorized(new Headers(auth))).toBe(true);
    expect(authorized(new Headers({ authorization: "Bearer nope" }))).toBe(false);
    expect(authorized(new Headers())).toBe(false);
    expect(authorized(new Headers(auth), null, {})).toBe(false);
    expect(authorized(new Headers(devAuth), "development")).toBe(true);
    expect(authorized(new Headers(devAuth), "production")).toBe(false);
    expect(authorized(new Headers(devAuth))).toBe(true);
  });
});

describe("store", () => {
  it("refuses hashes that could escape the directory", async () => {
    await expect(new UpdatesStore(dir).hasAsset("../../etc/passwd")).rejects.toThrow("invalid_hash");
  });
});

describe("routes", () => {
  it("serves nothing (204) before the first update", async () => {
    const res = await getManifest(new Request(`${ORIGIN}/m`, { headers: appHeaders() }));
    expect(res.status).toBe(204);
    expect(res.headers.get("expo-protocol-version")).toBe("1");
  });

  it("publishes assets and a signed manifest, then serves the newest one", async () => {
    const { hash, res } = await upload("console.log(1)");
    expect(res.status).toBe(201);
    expect((await headAsset(new Request(`${ORIGIN}/x`), ctx(hash))).status).toBe(200);

    const older = manifestFor(hash, "2026-10-15T10:00:00.000Z");
    const newer = manifestFor(hash, "2026-10-15T12:00:00.000Z");
    for (const manifest of [newer, older]) {
      const r = await publish({ platform: "ios", runtimeVersion: "rt-1", manifest, signature: signed(manifest) });
      expect(r.status).toBe(201);
    }

    const res2 = await getManifest(new Request(`${ORIGIN}/m`, { headers: appHeaders() }));
    expect(res2.status).toBe(200);
    expect(res2.headers.get("content-type")).toMatch(/^multipart\/mixed; boundary=/);
    expect(res2.headers.get("cache-control")).toBe("private, max-age=0");
    const text = await res2.text();
    expect(text).toContain(newer);
    expect(text).toContain(`expo-signature: ${signed(newer)}`);

    // Other platform and runtime stay empty.
    expect((await getManifest(new Request(`${ORIGIN}/m`, { headers: appHeaders("android") }))).status).toBe(204);
    expect((await getManifest(new Request(`${ORIGIN}/m`, { headers: appHeaders("ios", "rt-2") }))).status).toBe(204);

    const asset = await getAsset(new Request(`${ORIGIN}/x`), ctx(hash));
    expect(await asset.text()).toBe("console.log(1)");
    expect(asset.headers.get("content-type")).toBe("application/javascript");
    expect(asset.headers.get("cache-control")).toContain("immutable");
  });

  it("answers JSON with the signature header when multipart is not accepted", async () => {
    const { hash } = await upload("x");
    const manifest = manifestFor(hash, "2026-10-15T10:00:00.000Z");
    await publish({ platform: "ios", runtimeVersion: "rt-1", manifest, signature: signed(manifest) });
    const res = await getManifest(
      new Request(`${ORIGIN}/m`, { headers: { ...appHeaders(), accept: "application/expo+json" } }),
    );
    expect(await res.text()).toBe(manifest);
    expect(res.headers.get("expo-signature")).toBe(signed(manifest));
  });

  it("rejects bad tokens, wrong hashes and inconsistent manifests", async () => {
    const bytes = new TextEncoder().encode("abc");
    const hash = sha256Base64Url(bytes);
    const noAuth = await putAsset(new Request(`${ORIGIN}/x`, { method: "PUT", body: bytes }), ctx(hash));
    expect(noAuth.status).toBe(401);
    const wrong = await putAsset(
      new Request(`${ORIGIN}/x`, { method: "PUT", headers: auth, body: new TextEncoder().encode("abd") }),
      ctx(hash),
    );
    expect(wrong.status).toBe(400);
    expect((await headAsset(new Request(`${ORIGIN}/x`), ctx(hash))).status).toBe(404);

    const missing = manifestFor(hash, "2026-10-15T10:00:00.000Z");
    const r1 = await publish({ platform: "ios", runtimeVersion: "rt-1", manifest: missing, signature: signed(missing) });
    expect(r1.status).toBe(409);

    const { hash: real } = await upload("abc");
    const ok = manifestFor(real, "2026-10-15T10:00:00.000Z");
    expect((await publish({ platform: "ios", runtimeVersion: "rt-2", manifest: ok, signature: signed(ok) })).status).toBe(400);
    expect((await publish({ platform: "ios", runtimeVersion: "rt-1", manifest: ok, signature: "keyid=\"main\"" })).status).toBe(400);
    const foreign = ok.replace("/api/claude-remote/updates/assets/", "/evil/");
    expect((await publish({ platform: "ios", runtimeVersion: "rt-1", manifest: foreign, signature: signed(foreign) })).status).toBe(400);
    expect((await publish({ platform: "ios", runtimeVersion: "rt-1", manifest: ok, signature: signed(ok) }, {})).status).toBe(401);
  });

  it("keeps channels apart and limits the development token to development", async () => {
    const { hash } = await upload("dev bundle");
    const dev = manifestFor(hash, "2026-10-15T13:00:00.000Z");
    const body = { platform: "ios", runtimeVersion: "rt-1", manifest: dev, signature: signed(dev) };

    expect((await publish({ ...body, channel: "production" }, devAuth)).status).toBe(403);
    expect((await publish(body, devAuth)).status).toBe(403); // no channel = production
    expect((await publish({ ...body, channel: "development" }, devAuth)).status).toBe(201);

    const fetchFor = (channel?: string) =>
      getManifest(new Request(`${ORIGIN}/m`, { headers: appHeaders("ios", "rt-1", channel) }));
    expect((await fetchFor("development")).status).toBe(200);
    expect((await fetchFor()).status).toBe(204);
    expect((await fetchFor("production")).status).toBe(204);

    // The full token publishes anywhere; the dev token can upload assets.
    const prod = manifestFor(hash, "2026-10-15T14:00:00.000Z");
    expect((await publish({ ...body, manifest: prod, signature: signed(prod) }, auth)).status).toBe(201);
    expect(await (await fetchFor()).text()).toContain(prod);
    expect(await (await fetchFor("development")).text()).toContain(dev);
    const bytes = new TextEncoder().encode("asset by ci");
    const put = await putAsset(
      new Request(`${ORIGIN}/x`, { method: "PUT", headers: devAuth, body: bytes }),
      ctx(sha256Base64Url(bytes)),
    );
    expect(put.status).toBe(201);
  });

  it("serves manifests published before channels as production", async () => {
    const { hash } = await upload("legacy");
    const legacy = manifestFor(hash, "2026-10-15T09:00:00.000Z");
    const legacyDir = join(dir, "manifests", "ios", "rt-1");
    await mkdir(legacyDir, { recursive: true });
    await writeFile(join(legacyDir, `20261015T090000000Z-${randomUUID()}.json`), JSON.stringify({ manifest: legacy, signature: signed(legacy) }));
    const res = await getManifest(new Request(`${ORIGIN}/m`, { headers: appHeaders() }));
    expect(await res.text()).toContain(legacy);

    // A newer production update wins over the legacy one.
    const newer = manifestFor(hash, "2026-10-15T10:00:00.000Z");
    await publish({ platform: "ios", runtimeVersion: "rt-1", manifest: newer, signature: signed(newer) });
    expect(await (await getManifest(new Request(`${ORIGIN}/m`, { headers: appHeaders() }))).text()).toContain(newer);
  });

  it("is off without a token", async () => {
    delete process.env.CLAUDE_REMOTE_UPDATES_TOKEN;
    delete process.env.CLAUDE_REMOTE_UPDATES_DEV_TOKEN;
    expect((await publish({}, auth)).status).toBe(404);
  });
});
