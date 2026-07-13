-- Badge zespołu: klient wypełnił ankietę funkcji, zespół jeszcze nie otworzył zakładki.

alter table public.project_functionality_surveys
  add column if not exists team_reviewed_at timestamptz;

create index if not exists project_functionality_surveys_team_review_pending_idx
  on public.project_functionality_surveys (completed_at desc)
  where status = 'completed' and team_reviewed_at is null;

comment on column public.project_functionality_surveys.team_reviewed_at is
  'Kiedy zespół po raz pierwszy otworzył wypełnioną ankietę — badge znika.';

notify pgrst, 'reload schema';
