import { createHash, timingSafeEqual } from "node:crypto";

/** Publishing is off (404) without `CLAUDE_REMOTE_UPDATES_TOKEN`. */
export function publishEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.CLAUDE_REMOTE_UPDATES_TOKEN);
}

/** `Authorization: Bearer <token>`, compared in constant time over SHA-256 digests (same length). */
export function authorized(headers: Headers, env: NodeJS.ProcessEnv = process.env): boolean {
  const expected = env.CLAUDE_REMOTE_UPDATES_TOKEN;
  const presented = /^Bearer (.+)$/.exec(headers.get("authorization") ?? "")?.[1];
  if (!expected || !presented) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(expected), digest(presented));
}
