"use client";

import { FileText, Loader2, UploadCloud, XCircle } from "lucide-react";
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
        setProgress("Chunking & embedding…");
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
      <div className="rounded-2xl border border-ink-200/70 dark:border-ink-700 bg-white/70 dark:bg-ink-900/60 backdrop-blur p-4 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/40 p-2.5 text-emerald-700 dark:text-emerald-300">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{doc.filename}</div>
            <div className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
              {doc.pageCount ? `${doc.pageCount} pages · ` : ""}
              {doc.chunkCount} chunks · {(doc.charCount / 1000).toFixed(1)}k chars
            </div>
          </div>
          <button
            onClick={onClear}
            className="text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 transition"
            aria-label="Remove document"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
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
        "group relative block cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200",
        "p-8 text-center bg-white/50 dark:bg-ink-900/40 backdrop-blur",
        drag
          ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 scale-[1.01]"
          : "border-ink-200 dark:border-ink-700 hover:border-indigo-400",
        busy && "opacity-80 pointer-events-none",
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
            "rounded-2xl p-3 transition-all",
            busy
              ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300"
              : "bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600",
          )}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <UploadCloud className="h-6 w-6" />
          )}
        </div>
        <div>
          <div className="font-medium">
            {busy ? progress || "Working…" : "Drop a PDF or text file"}
          </div>
          <div className="text-sm text-ink-500 dark:text-ink-400 mt-1">
            {busy ? "This usually takes 5–30 seconds." : "Or click to browse · up to 25 MB"}
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</div>
      )}
    </label>
  );
}
