"use client";

import { ChevronDown, ChevronRight, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export type TraceStep = {
  name: string;
  detail: string;
  durationMs: number;
};

export type TraceInfo = {
  mode: "basic" | "corrective";
  correctionTriggered: boolean;
  steps: TraceStep[];
};

export function Trace({ trace }: { trace: TraceInfo }) {
  const [open, setOpen] = useState(false);
  const total = trace.steps.reduce((a, s) => a + s.durationMs, 0);

  return (
    <div className="mt-1.5 w-full max-w-[85%]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-ink-600 transition hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span>
          {trace.mode === "corrective" ? "Corrective RAG" : "Retrieval"}
        </span>
        <span className="text-ink-500 dark:text-ink-400">
          · {trace.steps.length} steps · {total}ms
        </span>
        {trace.correctionTriggered && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <Wand2 className="h-2.5 w-2.5" /> correction
          </span>
        )}
      </button>
      {open && (
        <ol className="mt-1.5 space-y-1 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 dark:border-ink-800 dark:bg-ink-900/40 animate-fade-in">
          {trace.steps.map((s, i) => (
            <li key={i} className="flex items-baseline gap-2 text-xs">
              <span className="w-4 shrink-0 text-right font-mono text-ink-500 dark:text-ink-500">
                {i + 1}
              </span>
              <span className="font-medium text-ink-800 dark:text-ink-100">
                {s.name}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-600 dark:text-ink-400">
                {s.detail}
              </span>
              {s.durationMs > 0 && (
                <span className="shrink-0 font-mono text-ink-500 dark:text-ink-500">
                  {s.durationMs}ms
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: "basic" | "corrective";
  onChange: (next: "basic" | "corrective") => void;
  disabled?: boolean;
}) {
  const on = mode === "corrective";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(on ? "basic" : "corrective")}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        on
          ? "border-accent-400 bg-accent-50 text-accent-700 hover:border-accent-500 dark:border-accent-700 dark:bg-accent-950/50 dark:text-accent-200"
          : "border-ink-300 bg-white text-ink-700 hover:border-ink-400 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-ink-600",
        disabled && "cursor-not-allowed opacity-50",
      )}
      title={
        on
          ? "Corrective RAG: grade chunks, rewrite query with HyDE if retrieval is weak."
          : "Basic retrieval: top-K cosine similarity."
      }
    >
      <Sparkles className={cn("h-3 w-3", on && "text-accent-600 dark:text-accent-300")} />
      Corrective RAG
      <span
        className={cn(
          "ml-0.5 inline-flex h-4 w-7 items-center rounded-full p-0.5 transition",
          on ? "bg-accent-600 dark:bg-accent-500" : "bg-ink-300 dark:bg-ink-700",
        )}
      >
        <span
          className={cn(
            "h-3 w-3 rounded-full bg-white transition",
            on ? "translate-x-3" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
