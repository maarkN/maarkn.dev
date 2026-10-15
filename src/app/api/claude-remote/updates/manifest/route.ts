import { randomUUID } from "node:crypto";
import {
  multipartManifest,
  parseManifestRequest,
  PROTOCOL_HEADERS,
} from "@/lib/claude-remote-updates/protocol";
import { UpdatesStore } from "@/lib/claude-remote-updates/store";

export const runtime = "nodejs";

/** Latest signed update for the app's platform and runtime version (Expo Updates protocol 1). */
export async function GET(request: Request) {
  const parsed = parseManifestRequest(request.headers);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status, headers: PROTOCOL_HEADERS });
  }
  const stored = await new UpdatesStore().latestManifest(parsed.platform, parsed.runtimeVersion);
  if (!stored) return new Response(null, { status: 204, headers: PROTOCOL_HEADERS });

  if (!parsed.multipart) {
    return new Response(stored.manifest, {
      headers: {
        ...PROTOCOL_HEADERS,
        "content-type": "application/expo+json",
        "expo-signature": stored.signature,
      },
    });
  }
  const { body, contentType } = multipartManifest(stored.manifest, stored.signature, randomUUID());
  return new Response(body, { headers: { ...PROTOCOL_HEADERS, "content-type": contentType } });
}
