"use client";

import { BookText } from "lucide-react";
import { useState } from "react";
import { Chat } from "@/components/chat";
import { Uploader, type IngestedDoc } from "@/components/uploader";

export default function Home() {
  const [doc, setDoc] = useState<IngestedDoc | null>(null);

  return (
    <div className="flex h-dvh flex-col bg-ink-50 dark:bg-ink-950">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/85 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/85">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-soft">
              <BookText className="h-4.5 w-4.5" strokeWidth={2.25} />
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-ink-900 dark:text-ink-50">
                NotebookLM RAG
              </div>
              <div className="text-xs text-ink-500 dark:text-ink-400">
                Upload a document, chat with its contents
              </div>
            </div>
          </div>
          {doc && (
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              <span className="text-ink-600 dark:text-ink-300">
                Indexed · {doc.chunkCount} chunks
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="pt-4 pb-3">
          <Uploader doc={doc} onIngested={setDoc} onClear={() => setDoc(null)} />
        </div>

        <div className="flex-1 overflow-hidden">
          {doc ? (
            <Chat doc={doc} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="max-w-md text-sm text-ink-600 dark:text-ink-300">
                Drop in a PDF or text file. It gets chunked, embedded with OpenAI,
                stored in Qdrant, and answered with grounded retrieval.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
