-- Ustrukturyzowany, zawsze ten sam układ artykułu: Kontekst / Kroki / Wskazówki.
-- body_html zostaje w schemacie jako fallback dla starszych wpisów (nowy formularz go nie wypełnia).

alter table public.smart_home_kb_articles
  add column if not exists context_html text not null default '',
  add column if not exists steps jsonb not null default '[]'::jsonb,
  add column if not exists tips_html text not null default '';
