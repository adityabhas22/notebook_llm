"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Bot, Loader2, Sparkles, Square, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { IngestedDoc } from "./uploader";
import { ModeToggle, Trace, type TraceInfo } from "./trace";

type Source = {
  n: number;
  page?: number;
  score: number;
  excerpt: string;
  grade?: "relevant" | "partial" | "irrelevant";
};

const SUGGESTIONS = [
  "Summarize this document in 5 bullets.",
  "What are the key takeaways?",
  "List any definitions or terms introduced.",
  "Walk me through one example from the document.",
];

export function Chat({ doc }: { doc: IngestedDoc }) {
  const [mode, setMode] = useState<"basic" | "corrective">("basic");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          documentId: doc.documentId,
          filename: doc.filename,
          mode,
        }),
      }),
    [doc.documentId, doc.filename, mode],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    id: doc.documentId,
    transport,
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [doc.documentId]);

  const isStreaming = status === "streaming" || status === "submitted";

  const submit = (text: string) => {
    if (!text.trim() || isStreaming) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-1 py-4">
          {messages.length === 0 ? (
            <EmptyState onPick={submit} filename={doc.filename} />
          ) : (
            <div className="space-y-5">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {status === "submitted" && <ThinkingIndicator mode={mode} />}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-ink-200 bg-white/85 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/85">
        <div className="mx-auto w-full max-w-3xl px-1 pb-4 pt-3">
          {error && (
            <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {error.message || "Something went wrong."}
            </div>
          )}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <ModeToggle mode={mode} onChange={setMode} disabled={isStreaming} />
            <span className="text-xs text-ink-500 dark:text-ink-400">
              {mode === "corrective"
                ? "graded, reranked, HyDE fallback if weak"
                : "top-K cosine similarity"}
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <div className="relative rounded-2xl border border-ink-300 bg-white shadow-soft transition focus-within:border-accent-500 focus-within:shadow-card dark:border-ink-700 dark:bg-ink-900">
              <textarea
                ref={inputRef}
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
                className="block max-h-40 w-full resize-none bg-transparent px-4 py-3 pr-14 text-[15px] text-ink-900 placeholder:text-ink-500 outline-none dark:text-ink-50 dark:placeholder:text-ink-500"
                disabled={isStreaming}
              />
              <button
                type={isStreaming ? "button" : "submit"}
                onClick={isStreaming ? () => stop() : undefined}
                disabled={!isStreaming && !input.trim()}
                className={cn(
                  "absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-xl transition",
                  isStreaming
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "bg-ink-900 text-white hover:bg-ink-800 disabled:bg-ink-200 disabled:text-ink-400 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100 dark:disabled:bg-ink-800 dark:disabled:text-ink-600",
                )}
                aria-label={isStreaming ? "Stop" : "Send"}
              >
                {isStreaming ? (
                  <Square className="h-3 w-3 fill-current" />
                ) : (
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                )}
              </button>
            </div>
            <div className="mt-2 text-center text-[11px] text-ink-500 dark:text-ink-400">
              Answers stay grounded in the document.{" "}
              <kbd className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[10px] text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                Enter
              </kbd>{" "}
              send,{" "}
              <kbd className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[10px] text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                Shift+Enter
              </kbd>{" "}
              newline
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ThinkingIndicator({ mode }: { mode: "basic" | "corrective" }) {
  return (
    <div className="flex items-center gap-2.5 pl-12 text-sm text-ink-600 dark:text-ink-300">
      <Loader2 className="h-4 w-4 animate-spin text-accent-600 dark:text-accent-400" />
      <span>
        {mode === "corrective"
          ? "Retrieving, grading, and rewriting if needed…"
          : "Searching the document…"}
      </span>
    </div>
  );
}

function EmptyState({
  onPick,
  filename,
}: {
  onPick: (s: string) => void;
  filename: string;
}) {
  return (
    <div className="animate-fade-in py-8">
      <div className="mb-1 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-ink-900 dark:text-ink-50">
          Ready to chat
        </h2>
      </div>
      <p className="mb-5 text-sm text-ink-600 dark:text-ink-300">
        Ask anything about{" "}
        <span className="font-medium text-ink-900 dark:text-ink-50">{filename}</span>.
        Try one of these to get started.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="group rounded-xl border border-ink-200 bg-white px-4 py-3 text-left text-sm text-ink-700 shadow-soft transition hover:border-accent-400 hover:text-ink-900 hover:shadow-card dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-accent-500 dark:hover:text-ink-50"
          >
            {s}
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
  const meta = message.metadata as
    | { sources?: Source[]; trace?: TraceInfo }
    | undefined;
  const sources = meta?.sources ?? [];
  const trace = meta?.trace;

  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-accent-600 text-white"
            : "bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          "flex min-w-0 max-w-[85%] flex-col gap-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "prose-msg rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-accent-600 text-white"
              : "border border-ink-200 bg-white text-ink-900 shadow-soft dark:border-ink-800 dark:bg-ink-900 dark:text-ink-50",
          )}
        >
          {text || <span className="text-ink-400">…</span>}
        </div>
        {!isUser && sources.length > 0 && <Sources sources={sources} />}
        {!isUser && trace && <Trace trace={trace} />}
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
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
              s.grade === "relevant"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                : s.grade === "partial"
                  ? "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-ink-200 bg-white text-ink-700 hover:border-accent-400 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200",
            )}
          >
            <span className="font-mono text-[10px] opacity-70">[{s.n}]</span>
            {s.page != null && <span>p. {s.page}</span>}
            <span className="opacity-60">·</span>
            <span className="font-mono text-[10px]">{(s.score * 100).toFixed(0)}%</span>
          </button>
          {open === s.n && (
            <div className="absolute left-0 z-30 mt-1.5 w-80 rounded-lg border border-ink-200 bg-white p-3 text-xs shadow-pop dark:border-ink-700 dark:bg-ink-900">
              <div className="mb-1.5 text-ink-500 dark:text-ink-400">
                Source [{s.n}]
                {s.page != null ? ` · page ${s.page}` : ""}
                {s.grade ? ` · ${s.grade}` : ""}
              </div>
              <div className="leading-relaxed text-ink-700 dark:text-ink-200">
                {s.excerpt}…
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
