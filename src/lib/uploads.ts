import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";

/** Where uploaded media lives. A mounted volume in production (see compose). */
export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "uploads");

const ALLOWED = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/** Saves an uploaded image to UPLOAD_DIR and returns its public path. */
export async function saveUpload(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("file_too_large");
  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED.has(ext)) throw new Error("bad_type");

  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${randomUUID()}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}
