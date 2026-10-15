import { authorized, publishEnabled } from "@/lib/claude-remote-updates/auth";
import { ASSET_HASH } from "@/lib/claude-remote-updates/protocol";
import { UpdatesStore } from "@/lib/claude-remote-updates/store";
import { MAX_ASSET_BYTES } from "@/lib/claude-remote-updates/validate";

export const runtime = "nodejs";

type Context = { params: Promise<{ hash: string }> };

const NOT_FOUND = () => new Response("Not found", { status: 404 });

/** Content-addressed asset: the URL never changes meaning, so it is cached forever. */
export async function GET(_request: Request, { params }: Context) {
  const { hash } = await params;
  if (!ASSET_HASH.test(hash)) return NOT_FOUND();
  const asset = await new UpdatesStore().readAsset(hash);
  if (!asset) return NOT_FOUND();
  return new Response(new Uint8Array(asset.data), {
    headers: {
      "content-type": asset.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

/** Lets the publisher skip assets that are already stored. */
export async function HEAD(_request: Request, { params }: Context) {
  const { hash } = await params;
  if (!ASSET_HASH.test(hash)) return NOT_FOUND();
  return new Response(null, { status: (await new UpdatesStore().hasAsset(hash)) ? 200 : 404 });
}

export async function PUT(request: Request, { params }: Context) {
  if (!publishEnabled()) return NOT_FOUND();
  if (!authorized(request.headers)) return new Response("Unauthorized", { status: 401 });
  const { hash } = await params;
  if (!ASSET_HASH.test(hash)) return Response.json({ error: "invalid_hash" }, { status: 400 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_ASSET_BYTES) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }
  const data = new Uint8Array(await request.arrayBuffer());
  if (data.byteLength > MAX_ASSET_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const stored = await new UpdatesStore().putAsset(hash, data, contentType.slice(0, 128));
  if (!stored) return Response.json({ error: "hash_mismatch" }, { status: 400 });
  return new Response(null, { status: 201 });
}
