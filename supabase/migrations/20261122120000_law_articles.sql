create extension if not exists vector with schema extensions;

create table public.law_articles (
  id text primary key,
  law text not null,
  article text not null,
  body text not null,
  embedding extensions.vector(768) not null
);

alter table public.law_articles enable row level security;

revoke all on public.law_articles from anon, authenticated;
grant select on public.law_articles to anon, authenticated;

create policy "law articles are public" on public.law_articles
  for select to anon, authenticated using (true);

create index law_articles_embedding_idx on public.law_articles
  using hnsw (embedding extensions.vector_cosine_ops);

create function public.match_law_articles(query_embedding extensions.vector(768), match_count int default 1)
returns table (law text, article text, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.law, a.article, 1 - (a.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.law_articles a
  order by a.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 5);
$$;

revoke all on function public.match_law_articles(extensions.vector, int) from public;
grant execute on function public.match_law_articles(extensions.vector, int) to anon, authenticated;
