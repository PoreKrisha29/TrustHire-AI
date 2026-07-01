-- TrustHire AI — pgvector migration
-- Run this ONCE after `npm run db:push` to add vector columns
-- for semantic embedding storage.
--
-- Run via: psql $DATABASE_URL -f drizzle/pgvector_setup.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to candidate_embeddings table
ALTER TABLE candidate_embeddings
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Add embedding column to job_embeddings table
ALTER TABLE job_embeddings
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Create HNSW indexes for fast ANN (Approximate Nearest Neighbor) search
-- Only create if the table has data; safe to run on empty tables.
CREATE INDEX IF NOT EXISTS candidate_embeddings_embedding_idx
  ON candidate_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS job_embeddings_embedding_idx
  ON job_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
