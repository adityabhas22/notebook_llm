"use client";

import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type IngestedDoc = {
  documentId: string;
  filename: string;
  uploadedAt: string;
  pageCount?: number;
  charCount: number;
  chunkCount: number;
};

type Props = {
  doc: IngestedDoc | null;
  onIngested: (doc: IngestedDoc) => void;
  onClear: () => void;
};

export function Uploader({ doc, onIngested, onClear }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      setProgress(`Reading ${file.name}…`);
      try {
        const fd = new FormData();
        fd.append("file", file);
        setProgress("Chunking and embedding…");
        const res = await fetch("/api/ingest", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Upload failed (${res.status})`);
        }
        const data = (await res.json()) as IngestedDoc;
        onIngested(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
        setProgress("");
      }
    },
    [onIngested],
  );

  if (doc) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 shadow-soft dark:border-ink-800 dark:bg-ink-900 animate-fade-in">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink-900 dark:text-ink-50">
            {doc.filename}
          </div>
          <div className="text-xs text-ink-500 dark:text-ink-400">
            {doc.pageCount ? `${doc.pageCount} pages · ` : ""}
            {doc.chunkCount} chunks · {(doc.charCount / 1000).toFixed(1)}k chars
          </div>
        </div>
        <button
          onClick={onClear}
          className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          aria-label="Remove document"
          title="Remove and upload another"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) upload(f);
      }}
      className={cn(
        "group relative block cursor-pointer rounded-2xl border-2 border-dashed bg-white p-10 text-center shadow-soft transition-all duration-150",
        "dark:bg-ink-900",
        drag
          ? "border-accent-500 bg-accent-50/60 dark:bg-accent-950/40"
          : "border-ink-300 hover:border-accent-400 dark:border-ink-700 dark:hover:border-accent-500",
        busy && "pointer-events-none opacity-90",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
        disabled={busy}
      />
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition",
            busy
              ? "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
              : "bg-ink-100 text-ink-600 group-hover:bg-accent-100 group-hover:text-accent-700 dark:bg-ink-800 dark:text-ink-300 dark:group-hover:bg-accent-900/40 dark:group-hover:text-accent-300",
          )}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud className="h-5 w-5" />
          )}
        </div>
        <div>
          <div className="text-sm font-medium text-ink-900 dark:text-ink-50">
            {busy ? progress || "Working…" : "Drop a PDF or text file"}
          </div>
          <div className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            {busy ? "Usually 5 to 30 seconds." : "Or click to browse · up to 25 MB"}
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</div>
      )}
    </label>
  );
}
