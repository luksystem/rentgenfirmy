-- Osoba odpowiedzialna i podpis wewnętrzny przy elemencie procesu projektu

alter table public.project_process_items
  add column if not exists assignee_id uuid references public.profiles (id) on delete set null,
  add column if not exists assignee_name text,
  add column if not exists signed_at timestamptz,
  add column if not exists signed_by uuid references public.profiles (id) on delete set null,
  add column if not exists signed_by_name text,
  add column if not exists signature_note text;

create index if not exists project_process_items_assignee_idx
  on public.project_process_items (assignee_id);

-- Zespół widoczny dla zalogowanych użytkowników (wybór odpowiedzialnego)
drop policy if exists profiles_select_team on public.profiles;
create policy profiles_select_team
  on public.profiles for select
  using (
    auth.uid() is not null
    and is_active = true
    and role in ('administrator', 'manager', 'pracownik')
  );
