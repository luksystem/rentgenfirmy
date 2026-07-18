-- Przypomnienia o wygasającej ofercie (e-mail/SMS do klienta, push do zespołu).

create table if not exists public.offer_expiry_reminder_log (
  id uuid primary key,
  service_id uuid not null references public.services (id) on delete cascade,
  offer_kind text not null check (offer_kind in ('estimate', 'settlement')),
  expires_at timestamptz not null,
  days_before integer not null check (days_before >= 1 and days_before <= 60),
  channels text[] not null default '{}',
  sent_at timestamptz not null default now()
);

create unique index if not exists offer_expiry_reminder_log_uniq
  on public.offer_expiry_reminder_log (service_id, offer_kind, expires_at, days_before);

comment on table public.offer_expiry_reminder_log is
  'Deduplikacja przypomnień o wygaśnięciu oferty / rozliczenia (cron).';

alter table public.offer_expiry_reminder_log enable row level security;

alter table public.user_notifications drop constraint if exists user_notifications_kind_check;

alter table public.user_notifications
  add constraint user_notifications_kind_check check (
    kind in (
      'kanban_mention',
      'kanban_new_activity',
      'warranty_expiring',
      'agreement_client_created',
      'client_stage_rating',
      'service_intake_preliminary_offer',
      'inspection_billing_due',
      'goal_review_due',
      'goal_period_ending',
      'goal_at_risk',
      'goal_recurring_created',
      'leave_request_created',
      'leave_request_decided',
      'client_offer_accepted',
      'settlement_offer_accepted',
      'client_offer_expiring',
      'work_item_assigned',
      'work_item_sent',
      'work_item_changed',
      'work_item_acceptance_needed',
      'work_item_obstacle_reported',
      'work_item_overdue',
      'work_item_verification_needed',
      'work_item_takeover_requested',
      'change_request_client_responded'
    )
  );

-- Cron godzinowy → API Next.js (sprawdza godzinę Europe/Warsaw w aplikacji).
create or replace function public.trigger_offer_expiry_reminders_cron()
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  app_url text;
  cron_secret text;
  sync_url text;
begin
  select
    nullif(trim(s.app_url), ''),
    nullif(trim(s.cron_secret), '')
  into app_url, cron_secret
  from public.integration_cron_settings s
  where s.id = 'default';

  if app_url is null or cron_secret is null then
    return;
  end if;

  sync_url := rtrim(app_url, '/') || '/api/cron/offer-expiry-reminders';

  perform net.http_post(
    url := sync_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'pg_cron'),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function public.trigger_offer_expiry_reminders_cron() from public;
grant execute on function public.trigger_offer_expiry_reminders_cron() to postgres;

do $do$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'offer-expiry-reminders';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$do$;

-- Co godzinę (o :05 UTC) — filtr godziny PL jest w aplikacji.
select cron.schedule(
  'offer-expiry-reminders',
  '5 * * * *',
  'select public.trigger_offer_expiry_reminders_cron();'
);
