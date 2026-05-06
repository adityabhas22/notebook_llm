export type DocumentMeta = {
  documentId: string;
  filename: string;
  uploadedAt: string;
  pageCount?: number;
  charCount: number;
};

export type Chunk = {
  text: string;
  page?: number;
  index: number;
};

export type RetrievedChunk = Chunk & {
  documentId: string;
  filename: string;
  score: number;
};
