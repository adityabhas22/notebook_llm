import { NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300; // embedding a 100-page PDF can take ~30s

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
    }
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing 'file' in form data." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1e6).toFixed(1)} MB). Limit is 25 MB.` },
        { status: 413 },
      );
    }

    const filename = file.name || "document";
    const lower = filename.toLowerCase();
    const buffer = await file.arrayBuffer();

    const result =
      lower.endsWith(".pdf") || file.type === "application/pdf"
        ? await ingestDocument({ kind: "pdf", filename, buffer })
        : await ingestDocument({
            kind: "text",
            filename,
            text: new TextDecoder().decode(buffer),
          });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    console.error("[ingest]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
