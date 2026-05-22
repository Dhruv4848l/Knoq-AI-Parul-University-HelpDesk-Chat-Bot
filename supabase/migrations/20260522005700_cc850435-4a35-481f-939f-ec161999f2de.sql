
-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Scraped pages from Parul University site
CREATE TABLE public.scraped_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  title text,
  description text,
  markdown text NOT NULL,
  content_hash text NOT NULL,
  embedding vector(1536),
  token_count int,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scraped_pages_embedding_idx ON public.scraped_pages
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX scraped_pages_url_idx ON public.scraped_pages (url);

ALTER TABLE public.scraped_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed users read pages" ON public.scraped_pages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage pages" ON public.scraped_pages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Crawl job tracking
CREATE TABLE public.crawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firecrawl_job_id text,
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, crawling, syncing, embedding, generating_faqs, completed, failed
  pages_discovered int NOT NULL DEFAULT 0,
  pages_scraped int NOT NULL DEFAULT 0,
  pages_embedded int NOT NULL DEFAULT 0,
  faqs_generated int NOT NULL DEFAULT 0,
  next_cursor text,
  error text,
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crawl_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crawl jobs" ON public.crawl_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER crawl_jobs_touch BEFORE UPDATE ON public.crawl_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER scraped_pages_touch BEFORE UPDATE ON public.scraped_pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Vector similarity search RPC
CREATE OR REPLACE FUNCTION public.match_scraped_pages(
  query_embedding vector(1536),
  match_count int DEFAULT 5
) RETURNS TABLE (
  id uuid,
  url text,
  title text,
  markdown text,
  similarity float
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.id, sp.url, sp.title, sp.markdown,
         1 - (sp.embedding <=> query_embedding) AS similarity
  FROM public.scraped_pages sp
  WHERE sp.embedding IS NOT NULL
  ORDER BY sp.embedding <=> query_embedding
  LIMIT match_count;
$$;
