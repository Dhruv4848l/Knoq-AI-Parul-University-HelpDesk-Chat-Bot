
CREATE OR REPLACE FUNCTION public.match_scraped_pages(
  query_embedding vector(1536),
  match_count int DEFAULT 5
) RETURNS TABLE (
  id uuid,
  url text,
  title text,
  markdown text,
  similarity float
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT sp.id, sp.url, sp.title, sp.markdown,
         1 - (sp.embedding <=> query_embedding) AS similarity
  FROM public.scraped_pages sp
  WHERE sp.embedding IS NOT NULL
  ORDER BY sp.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.match_scraped_pages(vector, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.match_scraped_pages(vector, int) TO authenticated;
