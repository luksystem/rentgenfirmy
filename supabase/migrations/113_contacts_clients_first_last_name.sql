-- Kontakty i klienci: rozbicie full_name na first_name + last_name

alter table public.clients rename column full_name to last_name;
alter table public.clients add column if not exists first_name text not null default '';

alter index if exists clients_full_name_idx rename to clients_last_name_idx;

alter table public.contacts rename column full_name to last_name;
alter table public.contacts add column if not exists first_name text not null default '';

alter index if exists contacts_full_name_idx rename to contacts_last_name_idx;
