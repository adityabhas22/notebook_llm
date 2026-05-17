import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";
import type { RetrievedChunk } from "./types";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

export type Grade = "relevant" | "partial" | "irrelevant";

const GradeSchema = z.object({
  grades: z.array(
    z.object({
      id: z.number(),
      relevance: z.enum(["relevant", "partial", "irrelevant"]),
    }),
  ),
});

export async function gradeChunks(
  question: string,
  chunks: RetrievedChunk[],
): Promise<Map<number, Grade>> {
  if (chunks.length === 0) return new Map();

  const list = chunks
    .map((c, i) => `[${i + 1}] ${c.text.slice(0, 800)}`)
    .join("\n\n");

  const { text } = await generateText({
    model: openai(env.OPENAI_CHAT_MODEL),
    temperature: 0,
    prompt: `For each numbered chunk below, decide whether it could help answer the question.

Grades:
- "relevant": directly answers or contains the requested information
- "partial": touches the topic but does not fully answer it
- "irrelevant": off-topic or unrelated

Question: ${question}

Chunks:
${list}

Reply with strict JSON in this shape:
{"grades":[{"id":1,"relevance":"relevant"},{"id":2,"relevance":"irrelevant"}]}

Include one entry per chunk by id (1-indexed).`,
  });

  const map = new Map<number, Grade>();
  try {
    const parsed = GradeSchema.parse(JSON.parse(stripFences(text)));
    for (const g of parsed.grades) map.set(g.id - 1, g.relevance);
  } catch (err) {
    console.error("[judge] parse failed:", err, "raw:", text.slice(0, 300));
    return new Map();
  }
  return map;
}

function stripFences(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  return trimmed;
}
