-- Do tej pory KAZDY zalogowany uzytkownik z dostepem do projektu mogl kliknac "Akceptuje" w
-- imieniu roli wewnetrznej ("Administrator") - polityka RLS byla otwarta (using (true)), a pole
-- responded_by_name to dowolny tekst, niepowiazany z kontem. Teraz: akceptacja roli zespolowej
-- wymaga administratora lub managera (ta sama definicja co has_full_app_access() z migracji 098),
-- a w historii zapisujemy prawdziwy profil (id), nie tylko wpisana nazwe.

alter table public.project_agreement_approvals
  add column if not exists responded_by_profile_id uuid references public.profiles (id);

drop policy if exists "project_agreement_approvals_all" on public.project_agreement_approvals;

create policy "project_agreement_approvals_select"
  on public.project_agreement_approvals for select using (true);

create policy "project_agreement_approvals_insert"
  on public.project_agreement_approvals for insert with check (true);

create policy "project_agreement_approvals_delete"
  on public.project_agreement_approvals for delete using (true);

-- Klient/branze odpowiadaja przez publiczny link (bez sesji Supabase) - te wiersze zostaja
-- otwarte. Rola zespolowa ("Administrator") wymaga administratora lub managera.
create policy "project_agreement_approvals_update"
  on public.project_agreement_approvals for update
  using (
    public.has_full_app_access()
    or not exists (
      select 1
      from public.project_agreement_approver_roles r
      where r.id = project_agreement_approvals.role_id
        and r.is_team_role
    )
  )
  with check (
    public.has_full_app_access()
    or not exists (
      select 1
      from public.project_agreement_approver_roles r
      where r.id = project_agreement_approvals.role_id
        and r.is_team_role
    )
  );
