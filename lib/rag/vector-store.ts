import { QdrantClient } from "@qdrant/js-client-rest";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { embeddingDimension } from "./embeddings";
import type { Chunk, RetrievedChunk } from "./types";

const client = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY || undefined,
  checkCompatibility: false,
});

let ensured: Promise<void> | null = null;

/**
 * Lazily create the collection on first use. Cosine similarity is the
 * standard for OpenAI embeddings (which are unit-normalized).
 */
export async function ensureCollection(vectorSize: number): Promise<void> {
  if (ensured) return ensured;
  ensured = (async () => {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === env.QDRANT_COLLECTION);
    if (exists) return;
    await client.createCollection(env.QDRANT_COLLECTION, {
      vectors: { size: vectorSize, distance: "Cosine" },
    });
    // Index documentId so retrieval can filter cheaply.
    await client.createPayloadIndex(env.QDRANT_COLLECTION, {
      field_name: "documentId",
      field_schema: "keyword",
    });
  })();
  return ensured;
}

type UpsertChunk = Chunk & { embedding: number[] };

export async function upsertChunks(
  documentId: string,
  filename: string,
  chunks: UpsertChunk[],
): Promise<void> {
  if (chunks.length === 0) return;
  const dim = chunks[0].embedding.length;
  await ensureCollection(dim || embeddingDimension());

  const points = chunks.map((c) => ({
    id: randomUUID(),
    vector: c.embedding,
    payload: {
      documentId,
      filename,
      text: c.text,
      page: c.page,
      index: c.index,
    },
  }));

  // Chunked upsert to avoid hitting payload-size limits on large docs.
  const BATCH = 128;
  for (let i = 0; i < points.length; i += BATCH) {
    await client.upsert(env.QDRANT_COLLECTION, {
      wait: true,
      points: points.slice(i, i + BATCH),
    });
  }
}

export async function searchChunks(
  embedding: number[],
  documentId: string,
  topK: number,
): Promise<RetrievedChunk[]> {
  const res = await client.search(env.QDRANT_COLLECTION, {
    vector: embedding,
    limit: topK,
    with_payload: true,
    filter: {
      must: [{ key: "documentId", match: { value: documentId } }],
    },
  });
  return res.map((hit) => {
    const p = (hit.payload ?? {}) as Record<string, unknown>;
    return {
      score: hit.score ?? 0,
      text: String(p.text ?? ""),
      page: typeof p.page === "number" ? p.page : undefined,
      index: typeof p.index === "number" ? p.index : 0,
      documentId: String(p.documentId ?? ""),
      filename: String(p.filename ?? ""),
    };
  });
}

export async function deleteDocument(documentId: string): Promise<void> {
  await client.delete(env.QDRANT_COLLECTION, {
    wait: true,
    filter: { must: [{ key: "documentId", match: { value: documentId } }] },
  });
}
