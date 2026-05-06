"use client";

import { BookText } from "lucide-react";
import { useState } from "react";
import { Chat } from "@/components/chat";
import { Uploader, type IngestedDoc } from "@/components/uploader";

export default function Home() {
  const [doc, setDoc] = useState<IngestedDoc | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-2 text-white shadow-sm">
            <BookText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight">NotebookLM RAG</div>
            <div className="text-xs text-ink-500 dark:text-ink-400">
              Upload a document, chat with its actual contents
            </div>
          </div>
        </div>
        {doc && (
          <div className="hidden items-center gap-2 text-xs text-ink-500 dark:text-ink-400 sm:flex">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Indexed · {doc.chunkCount} chunks
          </div>
        )}
      </header>

      <section className="mb-4">
        <Uploader doc={doc} onIngested={setDoc} onClear={() => setDoc(null)} />
      </section>

      <section className="flex-1 min-h-[60vh]">
        {doc ? (
          <Chat doc={doc} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-ink-500 dark:text-ink-400 py-12">
            <p className="max-w-md text-sm">
              Upload a PDF or text file to start. Your document is chunked, embedded with
              OpenAI, stored in Qdrant, and queried with RAG so answers stay grounded in the source.
            </p>
          </div>
        )}
      </section>

      <footer className="py-4 text-center text-xs text-ink-400 dark:text-ink-500">
        RAG pipeline: parse → chunk → embed → Qdrant → retrieve → generate
      </footer>
    </main>
  );
}
