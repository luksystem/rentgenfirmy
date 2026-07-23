-- Wiedza Smart Home: klient-facing baza wiedzy (artykuły, kategorie, tagi, FAQ, galeria zdjęć)
-- Osobna od public.knowledge_sources (093) — ta jest wewnętrzna, do zasilania AI serwisowego.

create table if not exists public.smart_home_kb_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_home_kb_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.smart_home_kb_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.smart_home_kb_categories (id) on delete set null,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  body_html text not null default '',
  youtube_url text,
  cover_image_storage_path text,
  status text not null default 'published' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  created_by_name text not null default 'Zespół',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(body_html, ''))
  ) stored
);

create index if not exists smart_home_kb_articles_category_id_idx
  on public.smart_home_kb_articles (category_id, sort_order);

create index if not exists smart_home_kb_articles_status_idx
  on public.smart_home_kb_articles (status, created_at desc);

create index if not exists smart_home_kb_articles_search_idx
  on public.smart_home_kb_articles using gin (search_vector);

create table if not exists public.smart_home_kb_article_tags (
  article_id uuid not null references public.smart_home_kb_articles (id) on delete cascade,
  tag_id uuid not null references public.smart_home_kb_tags (id) on delete cascade,
  primary key (article_id, tag_id)
);

create index if not exists smart_home_kb_article_tags_tag_id_idx
  on public.smart_home_kb_article_tags (tag_id);

create table if not exists public.smart_home_kb_article_media (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.smart_home_kb_articles (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists smart_home_kb_article_media_article_id_idx
  on public.smart_home_kb_article_media (article_id, sort_order);

create table if not exists public.smart_home_kb_faq_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.smart_home_kb_categories (id) on delete set null,
  question text not null,
  answer_html text not null default '',
  sort_order int not null default 0,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(question, '') || ' ' || coalesce(answer_html, ''))
  ) stored
);

create index if not exists smart_home_kb_faq_items_category_id_idx
  on public.smart_home_kb_faq_items (category_id, sort_order);

create index if not exists smart_home_kb_faq_items_search_idx
  on public.smart_home_kb_faq_items using gin (search_vector);

alter table public.smart_home_kb_categories enable row level security;
alter table public.smart_home_kb_tags enable row level security;
alter table public.smart_home_kb_articles enable row level security;
alter table public.smart_home_kb_article_tags enable row level security;
alter table public.smart_home_kb_article_media enable row level security;
alter table public.smart_home_kb_faq_items enable row level security;

drop policy if exists "smart_home_kb_categories_select_all" on public.smart_home_kb_categories;
drop policy if exists "smart_home_kb_categories_insert_all" on public.smart_home_kb_categories;
drop policy if exists "smart_home_kb_categories_update_all" on public.smart_home_kb_categories;
drop policy if exists "smart_home_kb_categories_delete_all" on public.smart_home_kb_categories;
create policy "smart_home_kb_categories_select_all" on public.smart_home_kb_categories for select using (true);
create policy "smart_home_kb_categories_insert_all" on public.smart_home_kb_categories for insert with check (true);
create policy "smart_home_kb_categories_update_all" on public.smart_home_kb_categories for update using (true);
create policy "smart_home_kb_categories_delete_all" on public.smart_home_kb_categories for delete using (true);

drop policy if exists "smart_home_kb_tags_select_all" on public.smart_home_kb_tags;
drop policy if exists "smart_home_kb_tags_insert_all" on public.smart_home_kb_tags;
drop policy if exists "smart_home_kb_tags_update_all" on public.smart_home_kb_tags;
drop policy if exists "smart_home_kb_tags_delete_all" on public.smart_home_kb_tags;
create policy "smart_home_kb_tags_select_all" on public.smart_home_kb_tags for select using (true);
create policy "smart_home_kb_tags_insert_all" on public.smart_home_kb_tags for insert with check (true);
create policy "smart_home_kb_tags_update_all" on public.smart_home_kb_tags for update using (true);
create policy "smart_home_kb_tags_delete_all" on public.smart_home_kb_tags for delete using (true);

drop policy if exists "smart_home_kb_articles_select_all" on public.smart_home_kb_articles;
drop policy if exists "smart_home_kb_articles_insert_all" on public.smart_home_kb_articles;
drop policy if exists "smart_home_kb_articles_update_all" on public.smart_home_kb_articles;
drop policy if exists "smart_home_kb_articles_delete_all" on public.smart_home_kb_articles;
create policy "smart_home_kb_articles_select_all" on public.smart_home_kb_articles for select using (true);
create policy "smart_home_kb_articles_insert_all" on public.smart_home_kb_articles for insert with check (true);
create policy "smart_home_kb_articles_update_all" on public.smart_home_kb_articles for update using (true);
create policy "smart_home_kb_articles_delete_all" on public.smart_home_kb_articles for delete using (true);

drop policy if exists "smart_home_kb_article_tags_select_all" on public.smart_home_kb_article_tags;
drop policy if exists "smart_home_kb_article_tags_insert_all" on public.smart_home_kb_article_tags;
drop policy if exists "smart_home_kb_article_tags_update_all" on public.smart_home_kb_article_tags;
drop policy if exists "smart_home_kb_article_tags_delete_all" on public.smart_home_kb_article_tags;
create policy "smart_home_kb_article_tags_select_all" on public.smart_home_kb_article_tags for select using (true);
create policy "smart_home_kb_article_tags_insert_all" on public.smart_home_kb_article_tags for insert with check (true);
create policy "smart_home_kb_article_tags_update_all" on public.smart_home_kb_article_tags for update using (true);
create policy "smart_home_kb_article_tags_delete_all" on public.smart_home_kb_article_tags for delete using (true);

drop policy if exists "smart_home_kb_article_media_select_all" on public.smart_home_kb_article_media;
drop policy if exists "smart_home_kb_article_media_insert_all" on public.smart_home_kb_article_media;
drop policy if exists "smart_home_kb_article_media_update_all" on public.smart_home_kb_article_media;
drop policy if exists "smart_home_kb_article_media_delete_all" on public.smart_home_kb_article_media;
create policy "smart_home_kb_article_media_select_all" on public.smart_home_kb_article_media for select using (true);
create policy "smart_home_kb_article_media_insert_all" on public.smart_home_kb_article_media for insert with check (true);
create policy "smart_home_kb_article_media_update_all" on public.smart_home_kb_article_media for update using (true);
create policy "smart_home_kb_article_media_delete_all" on public.smart_home_kb_article_media for delete using (true);

drop policy if exists "smart_home_kb_faq_items_select_all" on public.smart_home_kb_faq_items;
drop policy if exists "smart_home_kb_faq_items_insert_all" on public.smart_home_kb_faq_items;
drop policy if exists "smart_home_kb_faq_items_update_all" on public.smart_home_kb_faq_items;
drop policy if exists "smart_home_kb_faq_items_delete_all" on public.smart_home_kb_faq_items;
create policy "smart_home_kb_faq_items_select_all" on public.smart_home_kb_faq_items for select using (true);
create policy "smart_home_kb_faq_items_insert_all" on public.smart_home_kb_faq_items for insert with check (true);
create policy "smart_home_kb_faq_items_update_all" on public.smart_home_kb_faq_items for update using (true);
create policy "smart_home_kb_faq_items_delete_all" on public.smart_home_kb_faq_items for delete using (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('smart-home-kb-media', 'smart-home-kb-media', false, 10485760)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "smart_home_kb_media_storage_select" on storage.objects;
drop policy if exists "smart_home_kb_media_storage_insert" on storage.objects;
drop policy if exists "smart_home_kb_media_storage_delete" on storage.objects;

create policy "smart_home_kb_media_storage_select"
  on storage.objects for select
  using (bucket_id = 'smart-home-kb-media');

create policy "smart_home_kb_media_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'smart-home-kb-media');

create policy "smart_home_kb_media_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'smart-home-kb-media');

insert into public.smart_home_kb_categories (slug, name, description, sort_order)
values
  ('automatyka-i-sterowanie', 'Automatyka i sterowanie', 'Sterowniki, aplikacje, sceny i harmonogramy.', 0),
  ('bezpieczenstwo', 'Bezpieczeństwo', 'Alarm, kamery, kontrola dostępu.', 1),
  ('multimedia-i-av', 'Multimedia i AV', 'Audio, wideo, ekrany, nagłośnienie pomieszczeń.', 2),
  ('rozwiazywanie-problemow', 'Rozwiązywanie problemów', 'Najczęstsze problemy i jak je samodzielnie naprawić.', 3)
on conflict (slug) do nothing;
