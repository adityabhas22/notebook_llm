# NotebookLM RAG

Submission for Assignment 03 (Gen AI). Upload a PDF or text file and ask questions about it. Answers come from the document, with page-level citations.

Live: https://notebooklm-rag.vercel.app

## Pipeline

1. Parse the PDF page by page with `unpdf`.
2. Split each page into chunks with a recursive character splitter (paragraph, then line, then sentence, then word, then char).
3. Embed every chunk with OpenAI `text-embedding-3-small`.
4. Upsert the vectors into a Qdrant collection. Each chunk's payload stores its text, page number, and a `documentId`.
5. When the user asks a question, embed the question and run a cosine similarity search in Qdrant, filtered to that document's chunks. Take the top 5.
6. Send the question and the retrieved chunks to `gpt-4o-mini` with a strict system prompt:
   - answer only from the provided chunks
   - cite using `[1]`, `[2]`, etc.
   - if the chunks don't contain the answer, say "I couldn't find that in the document"

The answer is streamed back to the UI. The retrieved chunks are sent as message metadata so the UI can render citation chips with page numbers.

## Chunking strategy

Recursive character splitter in `lib/rag/chunker.ts`. About 50 lines, no extra dependency.

- Default chunk size: 1200 characters.
- Default overlap: 200 characters (carries the tail of one chunk into the next so ideas spanning a boundary still get retrieved).
- Splits are attempted in order on `\n\n`, `\n`, `. `, ` `, character. Whichever separator first produces small enough pieces wins.
- For PDFs, chunking happens per page so each chunk keeps its page number for citations.

These knobs are configurable via `RAG_CHUNK_SIZE` and `RAG_CHUNK_OVERLAP`.

## Stack

- Next.js 16 (App Router)
- Vercel AI SDK v6 (`streamText`, `embedMany`, `useChat`)
- Qdrant for the vector store (cosine similarity, payload index on `documentId`)
- OpenAI `text-embedding-3-small` for embeddings
- OpenAI `gpt-4o-mini` for generation
- `unpdf` for PDF parsing
- Tailwind v3 + lucide icons

## Run locally

Needs Node 20+ and Docker (or a Qdrant Cloud cluster).

```bash
git clone https://github.com/adityabhas22/notebook_llm.git
cd notebook_llm
npm install
cp .env.example .env.local       # then fill in OPENAI_API_KEY
npm run qdrant:up                # local Qdrant on :6333
npm run dev                      # http://localhost:3000
```

## Deploy

Spin up a Qdrant Cloud cluster, import the repo into Vercel, set the four env vars and deploy:

- `OPENAI_API_KEY`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION` (any name, created on first ingest)

## Project layout

```
app/
  api/ingest/route.ts     upload, chunk, embed, store
  api/chat/route.ts       retrieve, stream answer with citations
  page.tsx                UI
components/
  uploader.tsx
  chat.tsx
lib/
  env.ts                  zod-validated env
  rag/
    pdf.ts                unpdf
    chunker.ts            recursive splitter
    embeddings.ts         AI SDK embed/embedMany
    vector-store.ts       Qdrant client
    pipeline.ts           orchestration
```
