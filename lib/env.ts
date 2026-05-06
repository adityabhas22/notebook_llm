import { z } from "zod";

const Env = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  QDRANT_URL: z.url().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION: z.string().default("notebooklm_rag"),

  RAG_TOP_K: z.coerce.number().int().positive().default(5),
  RAG_CHUNK_SIZE: z.coerce.number().int().positive().default(1200),
  RAG_CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(200),
});

export const env = Env.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL,
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
  QDRANT_URL: process.env.QDRANT_URL,
  QDRANT_API_KEY: process.env.QDRANT_API_KEY,
  QDRANT_COLLECTION: process.env.QDRANT_COLLECTION,
  RAG_TOP_K: process.env.RAG_TOP_K,
  RAG_CHUNK_SIZE: process.env.RAG_CHUNK_SIZE,
  RAG_CHUNK_OVERLAP: process.env.RAG_CHUNK_OVERLAP,
});

export type Env = typeof env;
