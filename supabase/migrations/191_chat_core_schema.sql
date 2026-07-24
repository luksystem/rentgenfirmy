-- Moduł Czatu wewnętrznego — Faza 1: schemat podstawowy
-- Pokoje per projekt (Główny/Klient/custom), wiadomości, załączniki, reakcje,
-- potwierdzenia przeczytania, wzmianki, piny. RLS włączone tutaj — polityki w 193_.

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  service_intake_request_id uuid references public.service_intake_requests (id) on delete set null,
  kind text not null check (kind in ('main', 'client', 'custom')),
  name text not null,
  slug text not null,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_rooms_project_id_idx on public.chat_rooms (project_id);
create index if not exists chat_rooms_client_id_idx on public.chat_rooms (client_id)
  where client_id is not null;
create unique index if not exists chat_rooms_project_slug_key
  on public.chat_rooms (project_id, slug);

create table if not exists public.chat_room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role_in_room text not null default 'member' check (role_in_room in ('owner', 'member')),
  muted boolean not null default false,
  pinned_room boolean not null default false,
  last_read_message_id uuid,
  last_read_at timestamptz,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (room_id, profile_id)
);

create index if not exists chat_room_members_profile_id_idx on public.chat_room_members (profile_id);
create index if not exists chat_room_members_room_id_idx on public.chat_room_members (room_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  is_system boolean not null default false,
  system_event_kind text,
  system_event_payload jsonb,
  body text not null default '',
  reply_to_id uuid references public.chat_messages (id) on delete set null,
  is_edited boolean not null default false,
  edited_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  is_important boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_idx
  on public.chat_messages (room_id, created_at desc);
create index if not exists chat_messages_reply_to_idx on public.chat_messages (reply_to_id)
  where reply_to_id is not null;

alter table public.chat_room_members
  add constraint chat_room_members_last_read_message_id_fkey
  foreign key (last_read_message_id) references public.chat_messages (id) on delete set null;

create table if not exists public.chat_message_edits (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  previous_body text not null,
  edited_by uuid not null references public.profiles (id) on delete cascade,
  edited_at timestamptz not null default now()
);

create index if not exists chat_message_edits_message_id_idx on public.chat_message_edits (message_id);

create table if not exists public.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  project_document_id uuid references public.project_documents (id) on delete set null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  kind text not null default 'other' check (kind in ('image', 'video', 'pdf', 'office', 'cad', 'other')),
  created_at timestamptz not null default now()
);

create index if not exists chat_attachments_message_id_idx on public.chat_attachments (message_id);
create index if not exists chat_attachments_project_document_id_idx
  on public.chat_attachments (project_document_id) where project_document_id is not null;

create table if not exists public.chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, profile_id, emoji)
);

create index if not exists chat_reactions_message_id_idx on public.chat_reactions (message_id);

create table if not exists public.chat_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (message_id, profile_id)
);

create index if not exists chat_reads_message_id_idx on public.chat_reads (message_id);
create index if not exists chat_reads_profile_id_idx on public.chat_reads (profile_id);

create table if not exists public.chat_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  mentioned_profile_id uuid references public.profiles (id) on delete cascade,
  is_all boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_mentions_message_id_idx on public.chat_mentions (message_id);
create index if not exists chat_mentions_mentioned_profile_id_idx
  on public.chat_mentions (mentioned_profile_id) where mentioned_profile_id is not null;

create table if not exists public.chat_pins (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  pinned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (room_id, message_id)
);

create index if not exists chat_pins_room_id_idx on public.chat_pins (room_id);

alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_message_edits enable row level security;
alter table public.chat_attachments enable row level security;
alter table public.chat_reactions enable row level security;
alter table public.chat_reads enable row level security;
alter table public.chat_mentions enable row level security;
alter table public.chat_pins enable row level security;
