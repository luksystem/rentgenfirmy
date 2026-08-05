-- Pozwól jednemu projektowi w Rentgenie mieć powiązanie z więcej niż jednym archiwum AC
-- (np. dwa magazyny Decathlon albo dwa projekty tego samego klienta połączone w jeden w Rentgenie).

alter table public.project_ac_link drop constraint if exists project_ac_link_project_id_key;
drop index if exists project_ac_link_project_id_key;

create unique index if not exists project_ac_link_project_ac_idx
  on public.project_ac_link (project_id, ac_project_id);
