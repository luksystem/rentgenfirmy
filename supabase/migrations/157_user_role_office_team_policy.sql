-- Dopiero po commit migracji 156 wolno użyć wartości enum „office”.

drop policy if exists profiles_select_team on public.profiles;
create policy profiles_select_team
  on public.profiles for select
  using (
    auth.uid() is not null
    and is_active = true
    and role in ('administrator', 'manager', 'instalator', 'office', 'podwykonawca')
  );

notify pgrst, 'reload schema';
