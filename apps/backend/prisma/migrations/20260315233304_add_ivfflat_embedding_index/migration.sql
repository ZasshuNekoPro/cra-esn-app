-- IVFFlat index for pgvector approximate nearest neighbor search
-- lists = 100 is suitable for up to ~1M vectors (rule of thumb: sqrt(n_rows))
CREATE INDEX IF NOT EXISTS embeddings_vector_idx
  ON embeddings USING ivfflat (vector vector_cosine_ops)
  WITH (lists = 100);