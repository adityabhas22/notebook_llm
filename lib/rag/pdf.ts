import { extractText, getDocumentProxy } from "unpdf";

export type PdfPage = { page: number; text: string };

/**
 * Extract text from a PDF as a list of pages. Uses `unpdf`, a serverless-
 * friendly fork of pdfjs that runs on Vercel without native binaries.
 */
export async function extractPdfPages(buffer: ArrayBuffer): Promise<PdfPage[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  return pages.map((t, i) => ({ page: i + 1, text: (t ?? "").trim() }));
}

export function pagesToText(pages: PdfPage[]): string {
  return pages.map((p) => p.text).join("\n\n");
}
