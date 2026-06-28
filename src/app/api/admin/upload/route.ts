import { auth } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "no_file" }, { status: 400 });
  }

  try {
    const url = await saveUpload(file);
    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    const status = msg === "file_too_large" || msg === "bad_type" ? 400 : 500;
    return Response.json({ error: msg }, { status });
  }
}
