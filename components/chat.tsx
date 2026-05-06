"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, BookOpen, Bot, Loader2, Sparkles, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { IngestedDoc } from "./uploader";

type Source = { n: number; page?: number; score: number; excerpt: string };

const SUGGESTIONS = [
  "Summarize this document in 5 bullets.",
  "What are the key takeaways?",
  "List any definitions or terminology introduced.",
  "Are there any examples? Walk me through one.",
];

export function Chat({ doc }: { doc: IngestedDoc }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { documentId: doc.documentId, filename: doc.filename },
      }),
    [doc.documentId, doc.filename],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    id: doc.documentId,
    transport,
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isStreaming = status === "streaming" || status === "submitted";

  const submit = (text: string) => {
    if (!text.trim() || isStreaming) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1">
        {messages.length === 0 ? (
          <EmptyState onPick={(s) => submit(s)} filename={doc.filename} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 py-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {status === "submitted" && (
              <div className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400 pl-12">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching the document…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-auto max-w-3xl w-full mb-3 px-4 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm">
          {error.message || "Something went wrong."}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="mx-auto w-full max-w-3xl"
      >
        <div className="relative rounded-2xl border border-ink-200 dark:border-ink-700 bg-white/90 dark:bg-ink-900/80 backdrop-blur shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/30 transition">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder={`Ask anything about ${doc.filename}…`}
            rows={1}
            className="block w-full resize-none bg-transparent px-4 py-3.5 pr-14 outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500 max-h-48"
            disabled={isStreaming}
          />
          <button
            type={isStreaming ? "button" : "submit"}
            onClick={isStreaming ? () => stop() : undefined}
            disabled={!isStreaming && !input.trim()}
            className={cn(
              "absolute bottom-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl transition",
              isStreaming
                ? "bg-rose-500 text-white hover:bg-rose-600"
                : "bg-ink-900 text-white dark:bg-white dark:text-ink-900 disabled:bg-ink-300 dark:disabled:bg-ink-700 disabled:text-ink-500",
            )}
            aria-label={isStreaming ? "Stop" : "Send"}
          >
            {isStreaming ? <span className="h-3 w-3 rounded-sm bg-current" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 text-center text-xs text-ink-400 dark:text-ink-500">
          Answers are grounded only in the uploaded document. Press <kbd className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 font-mono">Enter</kbd> to send,
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 font-mono">Shift+Enter</kbd> for new line.
        </div>
      </form>
    </div>
  );
}

function EmptyState({ onPick, filename }: { onPick: (s: string) => void; filename: string }) {
  return (
    <div className="mx-auto max-w-3xl py-10 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 p-2.5">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Ready to chat</h2>
      </div>
      <p className="text-ink-600 dark:text-ink-300 mb-6">
        Ask anything about <span className="font-medium">{filename}</span>. Try one of these to get started:
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left rounded-xl border border-ink-200/80 dark:border-ink-700 bg-white/70 dark:bg-ink-900/60 backdrop-blur px-4 py-3 hover:border-indigo-400 hover:shadow-sm transition group"
          >
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 mt-0.5 text-ink-400 group-hover:text-indigo-500 transition" />
              <span className="text-sm">{s}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type ChatMessage = ReturnType<typeof useChat>["messages"][number];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
  const sources = (message.metadata as { sources?: Source[] } | undefined)?.sources ?? [];

  return (
    <div className={cn("flex gap-3 animate-slide-up", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-indigo-500 text-white"
            : "bg-ink-900 text-white dark:bg-white dark:text-ink-900",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-2", isUser && "items-end")}>
        <div
          className={cn(
            "prose-msg rounded-2xl px-4 py-3 text-[15px]",
            isUser
              ? "bg-indigo-500 text-white"
              : "bg-white/90 dark:bg-ink-900/80 border border-ink-200/80 dark:border-ink-700 backdrop-blur",
          )}
        >
          {text || <span className="text-ink-400">…</span>}
        </div>
        {!isUser && sources.length > 0 && <Sources sources={sources} />}
      </div>
    </div>
  );
}

function Sources({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((s) => (
        <div key={s.n} className="relative">
          <button
            onClick={() => setOpen(open === s.n ? null : s.n)}
            className="inline-flex items-center gap-1 rounded-full border border-ink-200 dark:border-ink-700 bg-white/70 dark:bg-ink-900/60 px-2.5 py-1 text-xs hover:border-indigo-400 transition"
          >
            <span className="font-mono text-ink-500 dark:text-ink-400">[{s.n}]</span>
            {s.page != null && <span>p. {s.page}</span>}
            <span className="text-ink-400 dark:text-ink-500">· {(s.score * 100).toFixed(0)}%</span>
          </button>
          {open === s.n && (
            <div className="absolute z-10 mt-1.5 w-80 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-3 text-xs shadow-lg animate-fade-in">
              <div className="text-ink-500 dark:text-ink-400 mb-1.5">
                Source [{s.n}]{s.page != null ? ` · page ${s.page}` : ""}
              </div>
              <div className="text-ink-700 dark:text-ink-200 leading-relaxed">{s.excerpt}…</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
