import { createHash, timingSafeEqual } from "node:crypto";
import { DEVELOPMENT_CHANNEL } from "./protocol";

/** Publishing is off (404) without any publish token. */
export function publishEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.CLAUDE_REMOTE_UPDATES_TOKEN || env.CLAUDE_REMOTE_UPDATES_DEV_TOKEN);
}

function matches(expected: string | undefined, presented: string): boolean {
  if (!expected) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(expected), digest(presented));
}

/**
 * `Authorization: Bearer <token>`, compared in constant time over SHA-256 digests (same length).
 * `CLAUDE_REMOTE_UPDATES_TOKEN` publishes to any channel; `CLAUDE_REMOTE_UPDATES_DEV_TOKEN` (the
 * one kept in CI) only to `development`. Assets are shared and content-addressed, so `channel`
 * null (an asset upload) accepts either.
 */
export function authorized(
  headers: Headers,
  channel: string | null = null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const presented = /^Bearer (.+)$/.exec(headers.get("authorization") ?? "")?.[1];
  if (!presented) return false;
  if (matches(env.CLAUDE_REMOTE_UPDATES_TOKEN, presented)) return true;
  return (
    (channel === null || channel === DEVELOPMENT_CHANNEL) &&
    matches(env.CLAUDE_REMOTE_UPDATES_DEV_TOKEN, presented)
  );
}
