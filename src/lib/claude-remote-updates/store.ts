import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ASSET_HASH, DEFAULT_CHANNEL, isChannel, type Platform, RUNTIME_VERSION } from "./protocol";

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

/**
 * Files under `dir`: `assets/<hash>` (+ `.type`) and
 * `manifests/<channel>/<platform>/<runtime>/<createdAt>-<id>.json`. Manifests published before
 * channels existed (`manifests/<platform>/<runtime>/`) belong to `production`.
 */
export class UpdatesStore {
  constructor(private readonly dir = updatesDir()) {}

  private assetPath(hash: string): string {
    assertHash(hash);
    return join(this.dir, "assets", hash);
  }

  private manifestsDir(channel: string, platform: Platform, runtimeVersion: string): string {
    if (!RUNTIME_VERSION.test(runtimeVersion)) throw new Error("invalid_runtime_version");
    if (!isChannel(channel)) throw new Error("invalid_channel");
    return join(this.dir, "manifests", channel, platform, runtimeVersion);
  }

  private legacyManifestsDir(platform: Platform, runtimeVersion: string): string {
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
    channel: string,
    platform: Platform,
    runtimeVersion: string,
    meta: { id: string; createdAt: string },
    stored: StoredManifest,
  ): Promise<void> {
    const dir = this.manifestsDir(channel, platform, runtimeVersion);
    await mkdir(dir, { recursive: true });
    // Compact UTC timestamp first, so the newest is the last name in lexicographic order.
    const stamp = new Date(meta.createdAt).toISOString().replace(/[-:.]/g, "");
    await writeAtomic(join(dir, `${stamp}-${meta.id}.json`), JSON.stringify(stored));
  }

  async latestManifest(
    channel: string,
    platform: Platform,
    runtimeVersion: string,
  ): Promise<StoredManifest | null> {
    const dirs = [this.manifestsDir(channel, platform, runtimeVersion)];
    if (channel === DEFAULT_CHANNEL) dirs.push(this.legacyManifestsDir(platform, runtimeVersion));
    let latest: { name: string; path: string } | null = null;
    for (const dir of dirs) {
      const names = await readdir(dir).catch(() => [] as string[]);
      for (const name of names) {
        if (name.endsWith(".json") && (!latest || name > latest.name)) latest = { name, path: join(dir, name) };
      }
    }
    if (!latest) return null;
    return JSON.parse(await readFile(latest.path, "utf8")) as StoredManifest;
  }
}
