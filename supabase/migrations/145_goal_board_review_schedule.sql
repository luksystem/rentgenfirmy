-- Harmonogram przeglądów per tablica celów + rzeczywisty czas spotkania przeglądu.

alter table public.goal_boards
  add column if not exists review_frequency text
    check (review_frequency is null or review_frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  add column if not exists review_weekday smallint
    check (review_weekday is null or (review_weekday between 0 and 6)),
  add column if not exists review_responsible_id uuid references public.profiles (id) on delete set null,
  add column if not exists review_notify boolean not null default true;

comment on column public.goal_boards.review_frequency is 'Częstotliwość przeglądu tablicy: daily/weekly/monthly/quarterly/annual';
comment on column public.goal_boards.review_weekday is 'Dzień tygodnia przeglądu (0=niedziela … 6=sobota), używane przy weekly';
comment on column public.goal_boards.review_responsible_id is 'Osoba odpowiedzialna za przegląd tablicy';
comment on column public.goal_boards.review_notify is 'Czy wysyłać powiadomienie w dniu przeglądu do osoby odpowiedzialnej';

alter table public.goal_review_meetings
  add column if not exists actual_duration_seconds int
    check (actual_duration_seconds is null or actual_duration_seconds >= 0);

comment on column public.goal_review_meetings.actual_duration_seconds is 'Rzeczywisty czas trwania przeglądu (suma slotów lub wall-clock)';
