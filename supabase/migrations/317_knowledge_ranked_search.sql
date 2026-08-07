-- D: wyszukiwanie w bazie wiedzy (i w historii zgloszen serwisowych uzywanej jako jej rozszerzenie)
-- nie sortowalo trafien wg trafnosci — `.textSearch(...).limit(n)` zwracalo pierwsze n wierszy w
-- dowolnej/fizycznej kolejnosci tabeli, bez `ORDER BY` po `ts_rank`. Przy duzym zrodle (np.
-- archiwum zgloszen z ActiveCollab — setki wycinkow) oznaczalo to, ze najlepiej pasujace fragmenty
-- czesto w ogole nie trafialy do limitu, bo skan zatrzymywal sie na pierwszych napotkanych
-- dopasowaniach. Funkcje ponizej licza `ts_rank_cd` i sortuja po nim, zanim przytna do limitu.
--
-- GIN po `to_tsvector('simple', ...)` przyspiesza sam skan (wczesniej sekwencyjny per zapytanie).

create index if not exists knowledge_chunks_content_fts_idx
  on public.knowledge_chunks using gin (to_tsvector('simple', content));

create index if not exists service_intake_requests_description_fts_idx
  on public.service_intake_requests using gin (to_tsvector('simple', description));

create index if not exists service_intake_comments_body_fts_idx
  on public.service_intake_comments using gin (to_tsvector('simple', body));

create or replace function public.search_knowledge_chunks_ranked(p_query text, p_limit integer)
returns table (content text, source_id uuid, rank real)
language sql
stable
set search_path = public
as $$
  select c.content, c.source_id, ts_rank_cd(to_tsvector('simple', c.content), to_tsquery('simple', p_query)) as rank
  from public.knowledge_chunks c
  where to_tsvector('simple', c.content) @@ to_tsquery('simple', p_query)
  order by rank desc
  limit p_limit;
$$;

create or replace function public.search_service_intake_descriptions_ranked(p_query text, p_limit integer)
returns table (description text, rank real)
language sql
stable
set search_path = public
as $$
  select r.description, ts_rank_cd(to_tsvector('simple', r.description), to_tsquery('simple', p_query)) as rank
  from public.service_intake_requests r
  where to_tsvector('simple', r.description) @@ to_tsquery('simple', p_query)
  order by rank desc
  limit p_limit;
$$;

create or replace function public.search_service_intake_comments_ranked(p_query text, p_limit integer)
returns table (body text, rank real)
language sql
stable
set search_path = public
as $$
  select cm.body, ts_rank_cd(to_tsvector('simple', cm.body), to_tsquery('simple', p_query)) as rank
  from public.service_intake_comments cm
  where to_tsvector('simple', cm.body) @@ to_tsquery('simple', p_query)
  order by rank desc
  limit p_limit;
$$;

comment on function public.search_knowledge_chunks_ranked is
  'Baza wiedzy: wycinki tresci posortowane wg trafnosci (ts_rank_cd), nie wg kolejnosci fizycznej.';
comment on function public.search_service_intake_descriptions_ranked is
  'Historia zgloszen serwisowych (opisy) jako rozszerzenie bazy wiedzy — wyniki wg trafnosci.';
comment on function public.search_service_intake_comments_ranked is
  'Historia zgloszen serwisowych (komentarze) jako rozszerzenie bazy wiedzy — wyniki wg trafnosci.';

-- Wolane wylacznie z serwera przez getSupabaseAdmin() (service_role) w knowledge-search-server.ts —
-- stad grant na service_role, nie authenticated (klient przegladarki nigdy tego nie wywoluje).
grant execute on function public.search_knowledge_chunks_ranked(text, integer) to service_role;
grant execute on function public.search_service_intake_descriptions_ranked(text, integer) to service_role;
grant execute on function public.search_service_intake_comments_ranked(text, integer) to service_role;
revoke execute on function public.search_knowledge_chunks_ranked(text, integer) from public, anon, authenticated;
revoke execute on function public.search_service_intake_descriptions_ranked(text, integer) from public, anon, authenticated;
revoke execute on function public.search_service_intake_comments_ranked(text, integer) from public, anon, authenticated;
