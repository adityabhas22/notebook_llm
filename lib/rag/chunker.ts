import type { Chunk } from "./types";

/**
 * Recursive character text splitter.
 *
 * Strategy: try to break on the most semantic separator first (paragraph),
 * fall back to weaker separators (sentence, word, char) until each piece
 * fits within `chunkSize`. Then we glue pieces back together greedily so
 * each emitted chunk approaches `chunkSize`, with `chunkOverlap` characters
 * of trailing context carried into the next chunk.
 *
 * This preserves semantic boundaries better than a fixed window splitter.
 */
const SEPARATORS = ["\n\n", "\n", ". ", " ", ""] as const;

type SplitOpts = { chunkSize: number; chunkOverlap: number };

function splitRecursive(text: string, size: number, sepIdx = 0): string[] {
  if (text.length <= size) return [text];
  const sep = SEPARATORS[sepIdx] ?? "";
  const parts = sep === "" ? Array.from(text) : text.split(sep);
  const out: string[] = [];
  for (const part of parts) {
    const piece = sep === "" ? part : part + sep;
    if (piece.length <= size) {
      out.push(piece);
    } else if (sepIdx < SEPARATORS.length - 1) {
      out.push(...splitRecursive(piece, size, sepIdx + 1));
    } else {
      // hard cut as last resort
      for (let i = 0; i < piece.length; i += size) {
        out.push(piece.slice(i, i + size));
      }
    }
  }
  return out;
}

function mergeWithOverlap(pieces: string[], { chunkSize, chunkOverlap }: SplitOpts): string[] {
  const chunks: string[] = [];
  let buf = "";
  for (const p of pieces) {
    if (buf.length + p.length <= chunkSize) {
      buf += p;
      continue;
    }
    if (buf.trim()) chunks.push(buf.trim());
    // start the next chunk with the tail of the previous one for context
    const overlap = chunkOverlap > 0 ? buf.slice(-chunkOverlap) : "";
    buf = overlap + p;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

export function chunkText(text: string, opts: SplitOpts): string[] {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  const pieces = splitRecursive(normalized, opts.chunkSize);
  return mergeWithOverlap(pieces, opts);
}

/** Chunk a list of pages, preserving page-number metadata on each chunk. */
export function chunkPages(
  pages: { page: number; text: string }[],
  opts: SplitOpts,
): Chunk[] {
  const chunks: Chunk[] = [];
  let i = 0;
  for (const { page, text } of pages) {
    for (const t of chunkText(text, opts)) {
      chunks.push({ text: t, page, index: i++ });
    }
  }
  return chunks;
}
