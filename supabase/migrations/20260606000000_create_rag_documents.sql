-- Migration: RAG vector store for the paleontology agent (Phase 2).
--
-- Creates the pgvector-backed knowledge base the n8n agent retrieves from.
-- Uses the standard LangChain/Supabase schema (table `documents` +
-- `match_documents` function) so the n8n "Supabase Vector Store" node works
-- with its default settings. See Capstone-PathA-Build-Plan.md (Phase 2) and
-- rag-corpus/MANIFEST.md.
--
-- Apply via the Supabase SQL Editor (paste + Run), the Supabase CLI
-- (`supabase db push`), or the Supabase MCP (`apply_migration`).

-- 1. Enable the pgvector extension (provides the `vector` column type).
create extension if not exists vector;

-- 2. Knowledge-base table. One row per CHUNK of a corpus document.
--    - content:   the chunk text (what gets shown/grounded on)
--    - metadata:  the doc's front-matter (title, source_url, published,
--                 category, …) so the agent can cite sources and dates
--    - embedding: OpenAI `text-embedding-3-small` → 1536 dimensions
create table documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1536)
);

-- 3. Cosine-similarity index for fast nearest-neighbour search. HNSW needs no
--    training step and performs well at this corpus size.
create index on documents using hnsw (embedding vector_cosine_ops);

-- 4. Row Level Security. This is a SHARED knowledge base, not user data: n8n
--    reads/writes it with the Supabase service-role key, which bypasses RLS.
--    The Next.js app never queries it with the anon key. We enable RLS with NO
--    anon policies, so the public anon key cannot read or write it — only the
--    server-side service-role connection can. (No permissive `USING (true)`.)
alter table documents enable row level security;

-- 5. Matching function the n8n Supabase Vector Store node calls at query time.
--    Returns the top `match_count` chunks most similar to `query_embedding`,
--    optionally filtered by a metadata subset (e.g. {"category":"discovery"}).
--    `similarity` is 1 - cosine_distance (higher = closer), usable as a
--    relevance score for the Phase 3 relevance-grading guardrail.
create or replace function match_documents (
  query_embedding vector(1536),
  match_count int default 5,
  filter jsonb default '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
