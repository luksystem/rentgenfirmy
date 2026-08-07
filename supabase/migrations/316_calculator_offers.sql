-- Moduł Kalkulator ofert (Sprzedaż): ankieta pytań -> wyliczona wycena Smart Home (pakiet
-- OPTIMUM) -> pozycje trafiają do nowej Umowy. Ustawienia cennika (progi, stawki, dodatki)
-- żyją w istniejącej generycznej tabeli `app_settings` (wzorem `contract_module_settings`) —
-- tu tylko instancje wycen, jeden wiersz z szerokim jsonb `answers`, wzorem `contracts`.

create table if not exists public.calculator_offers (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft', 'ready', 'converted')),
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  title text not null default '',
  client_full_name text not null default '',
  client_location text not null default '',
  client_email text not null default '',
  client_phone text not null default '',
  answers jsonb not null default '{}'::jsonb,
  contract_id uuid references public.contracts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calculator_offers_client_id_idx on public.calculator_offers (client_id);
create index if not exists calculator_offers_contact_id_idx on public.calculator_offers (contact_id);

alter table public.calculator_offers enable row level security;

drop policy if exists "calculator_offers_select_all" on public.calculator_offers;
drop policy if exists "calculator_offers_insert_all" on public.calculator_offers;
drop policy if exists "calculator_offers_update_all" on public.calculator_offers;
drop policy if exists "calculator_offers_delete_all" on public.calculator_offers;

create policy "calculator_offers_select_all" on public.calculator_offers for select using (true);
create policy "calculator_offers_insert_all" on public.calculator_offers for insert with check (true);
create policy "calculator_offers_update_all" on public.calculator_offers for update using (true);
create policy "calculator_offers_delete_all" on public.calculator_offers for delete using (true);
