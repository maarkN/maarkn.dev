import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ASSET_HASH, type Platform, RUNTIME_VERSION } from "./protocol";

/** A mounted volume in production (see docker-compose.prod.yml). */
export function updatesDir(): string {
  return process.env.CLAUDE_REMOTE_UPDATES_DIR || join(process.cwd(), "claude-remote-updates");
}

export function sha256Base64Url(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("base64url");
}

export type StoredManifest = { manifest: string; signature: string };

async function writeAtomic(path: string, data: Uint8Array | string): Promise<void> {
  const tmp = `${path}.${randomUUID()}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, path);
}

function assertHash(hash: string): void {
  if (!ASSET_HASH.test(hash)) throw new Error("invalid_hash");
}

/** Files under `dir`: `assets/<hash>` (+ `.type`) and `manifests/<platform>/<runtime>/<createdAt>-<id>.json`. */
export class UpdatesStore {
  constructor(private readonly dir = updatesDir()) {}

  private assetPath(hash: string): string {
    assertHash(hash);
    return join(this.dir, "assets", hash);
  }

  private manifestsDir(platform: Platform, runtimeVersion: string): string {
    if (!RUNTIME_VERSION.test(runtimeVersion)) throw new Error("invalid_runtime_version");
    return join(this.dir, "manifests", platform, runtimeVersion);
  }

  async hasAsset(hash: string): Promise<boolean> {
    return stat(this.assetPath(hash)).then(
      () => true,
      () => false,
    );
  }

  async readAsset(hash: string): Promise<{ data: Buffer; contentType: string } | null> {
    try {
      const path = this.assetPath(hash);
      const [data, contentType] = await Promise.all([readFile(path), readFile(`${path}.type`, "utf8")]);
      return { data, contentType };
    } catch {
      return null;
    }
  }

  /** Stores an asset when `data` hashes to `hash`; false otherwise. Idempotent. */
  async putAsset(hash: string, data: Uint8Array, contentType: string): Promise<boolean> {
    const path = this.assetPath(hash);
    if (sha256Base64Url(data) !== hash) return false;
    await mkdir(join(this.dir, "assets"), { recursive: true });
    // Type first: a reader that sees the asset always finds its type.
    await writeAtomic(`${path}.type`, contentType);
    await writeAtomic(path, data);
    return true;
  }

  async putManifest(
    platform: Platform,
    runtimeVersion: string,
    meta: { id: string; createdAt: string },
    stored: StoredManifest,
  ): Promise<void> {
    const dir = this.manifestsDir(platform, runtimeVersion);
    await mkdir(dir, { recursive: true });
    // Compact UTC timestamp first, so the newest is the last name in lexicographic order.
    const stamp = new Date(meta.createdAt).toISOString().replace(/[-:.]/g, "");
    await writeAtomic(join(dir, `${stamp}-${meta.id}.json`), JSON.stringify(stored));
  }

  async latestManifest(platform: Platform, runtimeVersion: string): Promise<StoredManifest | null> {
    const dir = this.manifestsDir(platform, runtimeVersion);
    const names = await readdir(dir).catch(() => [] as string[]);
    const latest = names.filter((n) => n.endsWith(".json")).sort().at(-1);
    if (!latest) return null;
    return JSON.parse(await readFile(join(dir, latest), "utf8")) as StoredManifest;
  }
}
