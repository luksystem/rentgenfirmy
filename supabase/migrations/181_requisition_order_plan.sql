-- Zapotrzebowania: osoba odpowiedzialna za zamówienie + termin, alert o przeterminowaniu.

alter table public.requisitions
  add column if not exists order_owner_id uuid references public.profiles (id) on delete set null,
  add column if not exists order_due_at date;

create index if not exists requisitions_order_due_idx
  on public.requisitions (order_due_at)
  where order_due_at is not null;

comment on column public.requisitions.order_owner_id is
  'Osoba odpowiedzialna za złożenie zamówienia (ustawiane przy/po akceptacji).';
comment on column public.requisitions.order_due_at is
  'Termin, do którego zapotrzebowanie powinno zostać zamówione — napędza alert o przeterminowaniu.';

-- ── Log alertów o przeterminowanym zamówieniu (dedup — jeden alert dziennie na pozycję) ──
create table if not exists public.requisition_overdue_alert_log (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.requisitions (id) on delete cascade,
  alert_date date not null,
  created_at timestamptz not null default now()
);

create unique index if not exists requisition_overdue_alert_log_uniq
  on public.requisition_overdue_alert_log (requisition_id, alert_date);

alter table public.requisition_overdue_alert_log enable row level security;

drop policy if exists requisition_overdue_alert_log_select on public.requisition_overdue_alert_log;
create policy requisition_overdue_alert_log_select
  on public.requisition_overdue_alert_log for select
  using (auth.uid() is not null);

-- ── Rozszerzenie katalogu kind o alert przeterminowanego zapotrzebowania ──────────────
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
      'service_intake_assigned',
      'inspection_billing_due',
      'goal_review_due',
      'goal_period_ending',
      'goal_at_risk',
      'goal_recurring_created',
      'leave_request_created',
      'leave_request_decided',
      'monthly_review_self_submitted',
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
      'change_request_client_responded',
      'offer_approval_requested',
      'offer_approval_reviewed',
      'agreement_client_responded',
      'service_intake_submitted',
      'service_intake_status',
      'requisition_order_overdue'
    )
  );

-- ── Cron: codziennie o 06:00 UTC — sprawdza przeterminowane zapotrzebowania ───────────
create or replace function public.trigger_requisition_order_overdue_cron()
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

  sync_url := rtrim(app_url, '/') || '/api/cron/requisition-order-overdue';

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

revoke all on function public.trigger_requisition_order_overdue_cron() from public;
grant execute on function public.trigger_requisition_order_overdue_cron() to postgres;

do $do$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'requisition-order-overdue';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$do$;

-- Codziennie o 06:00 UTC
select cron.schedule(
  'requisition-order-overdue',
  '0 6 * * *',
  'select public.trigger_requisition_order_overdue_cron();'
);
