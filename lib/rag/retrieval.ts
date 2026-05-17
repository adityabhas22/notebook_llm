import { env } from "@/lib/env";
import { embedQuery } from "./embeddings";
import { generateHyDE } from "./hyde";
import { gradeChunks, type Grade } from "./judge";
import { searchChunks } from "./vector-store";
import type { RetrievedChunk } from "./types";

export type RetrievalMode = "basic" | "corrective";

export type TraceStep = {
  name: string;
  detail: string;
  durationMs: number;
};

export type GradedChunk = RetrievedChunk & { grade?: Grade };

export type RetrievalResult = {
  mode: RetrievalMode;
  steps: TraceStep[];
  chunks: GradedChunk[];
  correctionTriggered: boolean;
};

async function timed<T>(
  name: string,
  fn: () => Promise<T>,
  detail: (v: T) => string,
): Promise<{ value: T; step: TraceStep }> {
  const t0 = performance.now();
  const value = await fn();
  return {
    value,
    step: {
      name,
      detail: detail(value),
      durationMs: Math.round(performance.now() - t0),
    },
  };
}

export async function retrieveBasic(
  documentId: string,
  query: string,
  topK = env.RAG_TOP_K,
): Promise<RetrievalResult> {
  const steps: TraceStep[] = [];

  const { value: embedding, step: s1 } = await timed(
    "embed query",
    () => embedQuery(query),
    () => `${query.length} chars in`,
  );
  steps.push(s1);

  const { value: chunks, step: s2 } = await timed(
    "vector search",
    () => searchChunks(embedding, documentId, topK),
    (c) => `top ${c.length} by cosine`,
  );
  steps.push(s2);

  return { mode: "basic", steps, chunks, correctionTriggered: false };
}

export async function retrieveCorrective(
  documentId: string,
  query: string,
  topK = env.RAG_TOP_K,
): Promise<RetrievalResult> {
  const steps: TraceStep[] = [];
  const candidateK = Math.max(8, topK * 2);

  const { value: emb1, step: s1 } = await timed(
    "embed query",
    () => embedQuery(query),
    () => `${query.length} chars in`,
  );
  steps.push(s1);

  const { value: initial, step: s2 } = await timed(
    "vector search",
    () => searchChunks(emb1, documentId, candidateK),
    (c) => `top ${c.length} candidates`,
  );
  steps.push(s2);

  let grades = new Map<number, Grade>();
  try {
    const { value, step: s3 } = await timed(
      "grade relevance",
      () => gradeChunks(query, initial),
      (g) => summarizeGrades(g, initial.length),
    );
    grades = value;
    steps.push(s3);
  } catch {
    steps.push({ name: "grade relevance", detail: "grader failed, keeping all", durationMs: 0 });
  }

  let kept = applyGrades(initial, grades);
  let correctionTriggered = false;

  if (kept.length < 2) {
    correctionTriggered = true;
    try {
      const { value: hyde, step: hs1 } = await timed(
        "HyDE rewrite",
        () => generateHyDE(query),
        (h) => `${h.length} char hypothetical`,
      );
      steps.push(hs1);

      const { value: emb2, step: hs2 } = await timed(
        "embed HyDE",
        () => embedQuery(hyde),
        () => "embedding ready",
      );
      steps.push(hs2);

      const { value: corrected, step: hs3 } = await timed(
        "re-search",
        () => searchChunks(emb2, documentId, candidateK),
        (c) => `top ${c.length} candidates`,
      );
      steps.push(hs3);

      const seen = new Set(initial.map((c) => c.index));
      const merged = [...initial];
      for (const c of corrected) if (!seen.has(c.index)) merged.push(c);

      const { value: regrades, step: hs4 } = await timed(
        "re-grade",
        () => gradeChunks(query, merged),
        (g) => summarizeGrades(g, merged.length),
      );
      steps.push(hs4);

      kept = applyGrades(merged, regrades);
    } catch {
      steps.push({ name: "correction failed", detail: "falling back to initial chunks", durationMs: 0 });
      kept = initial.map((c, i) => ({ ...c, grade: grades.get(i) }));
    }
  }

  kept.sort((a, b) => {
    const order: Record<Grade, number> = { relevant: 0, partial: 1, irrelevant: 2 };
    const ga = order[a.grade ?? "irrelevant"];
    const gb = order[b.grade ?? "irrelevant"];
    if (ga !== gb) return ga - gb;
    return b.score - a.score;
  });

  const final = kept.slice(0, topK);
  steps.push({
    name: "rerank + select",
    detail: `${final.length} chunks passed to generator`,
    durationMs: 0,
  });

  return { mode: "corrective", steps, chunks: final, correctionTriggered };
}

function applyGrades(
  chunks: RetrievedChunk[],
  grades: Map<number, Grade>,
): GradedChunk[] {
  if (grades.size === 0) return chunks.map((c) => ({ ...c }));
  return chunks
    .map((c, i) => ({ ...c, grade: grades.get(i) }))
    .filter((c) => c.grade === "relevant" || c.grade === "partial");
}

function summarizeGrades(grades: Map<number, Grade>, total: number): string {
  const counts: Record<Grade, number> = { relevant: 0, partial: 0, irrelevant: 0 };
  for (const v of grades.values()) counts[v]++;
  const ungraded = total - grades.size;
  const parts = [`${counts.relevant} relevant`, `${counts.partial} partial`, `${counts.irrelevant} irrelevant`];
  if (ungraded > 0) parts.push(`${ungraded} ungraded`);
  return parts.join(", ");
}
