import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { env } from "@/lib/env";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
const model = openai.embedding(env.OPENAI_EMBEDDING_MODEL);

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({ model, value: text });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  // AI SDK batches automatically; OpenAI accepts up to 2048 inputs/request.
  const { embeddings } = await embedMany({ model, values: texts });
  return embeddings;
}

/**
 * Embedding dimension is fixed per model. Hardcoded for the two cheap defaults
 * so we can create the Qdrant collection ahead of the first embedding call.
 */
export function embeddingDimension(): number {
  switch (env.OPENAI_EMBEDDING_MODEL) {
    case "text-embedding-3-small":
      return 1536;
    case "text-embedding-3-large":
      return 3072;
    case "text-embedding-ada-002":
      return 1536;
    default:
      // Unknown model — embed once and measure. Slower path.
      return 0;
  }
}
