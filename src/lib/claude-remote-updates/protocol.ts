/**
 * Expo Updates protocol v1 (https://docs.expo.dev/technical-specs/expo-updates-1/) for the
 * Claude Remote app. Pure: request parsing and response bodies, no I/O.
 */

export const PLATFORMS = ["ios", "android"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** SHA-256 in base64url without padding: 43 chars. Also the asset file name, so no traversal. */
export const ASSET_HASH = /^[A-Za-z0-9_-]{43}$/;
export const RUNTIME_VERSION = /^[\w.-]{1,128}$/;
export const ASSETS_PATH = "/api/claude-remote/updates/assets/";

/** Update channel (`expo-channel-name`); builds without the header follow `production`. */
export const DEFAULT_CHANNEL = "production";
export const DEVELOPMENT_CHANNEL = "development";
const CHANNEL = /^[a-z][a-z0-9-]{0,31}$/;

/** Platform names were the first path segment before channels existed, so they are not channels. */
export function isChannel(value: string): boolean {
  return CHANNEL.test(value) && !PLATFORMS.includes(value as Platform);
}

export type ManifestRequest =
  | { ok: true; platform: Platform; runtimeVersion: string; channel: string; multipart: boolean }
  | { ok: false; status: 400 | 406; error: string };

export function parseManifestRequest(headers: Headers): ManifestRequest {
  const protocol = headers.get("expo-protocol-version");
  if (protocol !== null && protocol !== "1") {
    return { ok: false, status: 406, error: "unsupported_protocol_version" };
  }
  const platform = headers.get("expo-platform");
  if (!PLATFORMS.includes(platform as Platform)) {
    return { ok: false, status: 400, error: "invalid_platform" };
  }
  const runtimeVersion = headers.get("expo-runtime-version") ?? "";
  if (!RUNTIME_VERSION.test(runtimeVersion)) {
    return { ok: false, status: 400, error: "invalid_runtime_version" };
  }
  const channel = headers.get("expo-channel-name") ?? DEFAULT_CHANNEL;
  if (!isChannel(channel)) return { ok: false, status: 400, error: "invalid_channel" };
  const accept = headers.get("accept") ?? "";
  // The client prefers multipart; plain JSON only when it is all it accepts.
  const multipart = accept === "" || accept.includes("multipart/mixed") || accept.includes("*/*");
  return { ok: true, platform: platform as Platform, runtimeVersion, channel, multipart };
}

/** Headers every manifest response carries (protocol 1, short cache). */
export const PROTOCOL_HEADERS = {
  "expo-protocol-version": "1",
  "expo-sfv-version": "0",
  "cache-control": "private, max-age=0",
} as const;

/**
 * `expo-manifest-filters` for a channel: the app sets aside stored updates whose signed
 * `metadata.channel` differs, so switching channels never keeps running the other channel's
 * newer update. Updates without the key (published before channels) still pass.
 */
export function manifestFilters(channel: string): string {
  return `channel="${channel}"`;
}

/** `multipart/mixed` body with a single signed `manifest` part, byte-exact. */
export function multipartManifest(
  manifest: string,
  signature: string,
  boundary: string,
): { body: string; contentType: string } {
  const body = [
    `--${boundary}`,
    'content-disposition: form-data; name="manifest"',
    "content-type: application/json; charset=utf-8",
    `expo-signature: ${signature}`,
    "",
    manifest,
    `--${boundary}--`,
    "",
  ].join("\r\n");
  return { body, contentType: `multipart/mixed; boundary=${boundary}` };
}
