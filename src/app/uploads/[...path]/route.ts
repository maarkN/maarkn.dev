import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { UPLOAD_DIR } from "@/lib/uploads";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  // Resolve under UPLOAD_DIR and reject any path traversal.
  const rel = normalize(path.join("/")).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = join(UPLOAD_DIR, rel);
  if (!full.startsWith(UPLOAD_DIR)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    await stat(full);
    const data = await readFile(full);
    const type = TYPES[extname(full).toLowerCase()] ?? "application/octet-stream";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
