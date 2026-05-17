import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { env } from "@/lib/env";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

export async function generateHyDE(question: string): Promise<string> {
  const { text } = await generateText({
    model: openai(env.OPENAI_CHAT_MODEL),
    temperature: 0.3,
    prompt: `Write a 2-3 sentence plausible answer to the question, in the style of a textbook excerpt. Sound factual; do not say you are unsure. The text will be embedded and used to retrieve passages from a real document, so phrasing it like a likely answer improves retrieval.

Question: ${question}

Answer:`,
  });
  return text.trim();
}
