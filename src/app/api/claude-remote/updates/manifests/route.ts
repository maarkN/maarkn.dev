import { authorized, publishEnabled } from "@/lib/claude-remote-updates/auth";
import { UpdatesStore } from "@/lib/claude-remote-updates/store";
import { checkManifest, MAX_MANIFEST_BYTES, PublishBody } from "@/lib/claude-remote-updates/validate";

export const runtime = "nodejs";

/** Stores a manifest signed by the publisher; its assets must already be uploaded. */
export async function POST(request: Request) {
  if (!publishEnabled()) return new Response("Not found", { status: 404 });
  if (!authorized(request.headers)) return new Response("Unauthorized", { status: 401 });
  const text = await request.text();
  if (text.length > MAX_MANIFEST_BYTES * 2) return Response.json({ error: "too_large" }, { status: 413 });

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return Response.json({ error: "body_not_json" }, { status: 400 });
  }
  const body = PublishBody.safeParse(raw);
  if (!body.success) return Response.json({ error: "body_invalid" }, { status: 400 });
  const checked = checkManifest(body.data);
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 });

  const store = new UpdatesStore();
  for (const hash of checked.hashes) {
    if (!(await store.hasAsset(hash))) {
      return Response.json({ error: "asset_missing", hash }, { status: 409 });
    }
  }
  await store.putManifest(body.data.platform, body.data.runtimeVersion, checked.manifest, {
    manifest: body.data.manifest,
    signature: body.data.signature,
  });
  return Response.json({ id: checked.manifest.id }, { status: 201 });
}
