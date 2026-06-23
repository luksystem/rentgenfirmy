-- Hasła do systemów w dashboardzie klienta (szyfrowane, bez bezpośredniego odczytu z klienta DB)

create table if not exists public.project_system_credentials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  system_url text,
  login_username text,
  password_ciphertext text not null,
  password_iv text not null,
  password_tag text not null,
  notes text,
  visible_to_client boolean not null default true,
  position integer not null default 0,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_system_credentials_project_idx
  on public.project_system_credentials (project_id, position);

alter table public.project_system_credentials enable row level security;

-- Brak polityk RLS: anon i authenticated nie mogą czytać ani pisać.
-- Dostęp wyłącznie przez service role (API serwerowe).
