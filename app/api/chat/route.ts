import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { formatContext, retrieveContext } from "@/lib/rag/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

function buildSystemPrompt(filename: string, contextBlock: string): string {
  return `You are a careful research assistant. Answer the user's question using ONLY the context excerpts below, which were retrieved from the document "${filename}".

Strict rules:
- Ground every claim in the provided context. Do not use outside knowledge.
- If the context does not contain the answer, say so plainly: "I couldn't find that in the document." Do not guess.
- When you state a fact, cite the source like [1], [2] using the bracketed numbers shown in the context. Multiple cites are fine: [1][3].
- Quote sparingly when a phrasing matters; otherwise paraphrase.
- Be concise and structured. Use short paragraphs or bullets.

CONTEXT
=======
${contextBlock}
=======`;
}

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const text = m.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

export async function POST(req: Request) {
  try {
    let body: { messages?: UIMessage[]; documentId?: string; filename?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Expected JSON body." }, { status: 400 });
    }
    const { messages, documentId, filename } = body;

    if (!messages?.length || !documentId) {
      return NextResponse.json(
        { error: "Missing 'messages' or 'documentId'." },
        { status: 400 },
      );
    }

    const query = lastUserText(messages);
    if (!query) {
      return NextResponse.json({ error: "No user message to answer." }, { status: 400 });
    }

    const retrieved = await retrieveContext(documentId, query);
    const system = buildSystemPrompt(filename || "the document", formatContext(retrieved));

    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: openai(env.OPENAI_CHAT_MODEL),
      system,
      messages: modelMessages,
      temperature: 0.2,
    });

    const sources = retrieved.map((c, i) => ({
      n: i + 1,
      page: c.page,
      score: Number(c.score.toFixed(3)),
      excerpt: c.text.slice(0, 240),
    }));

    return result.toUIMessageStreamResponse({
      // Attach citations once at stream start so the UI can render them.
      messageMetadata: ({ part }) => (part.type === "start" ? { sources } : undefined),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    console.error("[chat]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
