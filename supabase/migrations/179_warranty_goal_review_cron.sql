-- Rejestracja pg_cron dla dwoch nowych, serwerowych wysylek push/e-mail (patrz
-- lib/notifications/warranty-expiry-server.ts, lib/notifications/goal-activity-server.ts) -
-- wzorem 163_offer_expiry_reminders.sql / 175_settlement_auto_accept_cron.sql.

create or replace function public.trigger_warranty_expiring_cron()
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

  sync_url := rtrim(app_url, '/') || '/api/cron/warranty-expiring';

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

revoke all on function public.trigger_warranty_expiring_cron() from public;
grant execute on function public.trigger_warranty_expiring_cron() to postgres;

create or replace function public.trigger_goal_review_due_cron()
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

  sync_url := rtrim(app_url, '/') || '/api/cron/goal-review-due';

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

revoke all on function public.trigger_goal_review_due_cron() from public;
grant execute on function public.trigger_goal_review_due_cron() to postgres;

do $do$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'warranty-expiring';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  select jobid into existing_job_id from cron.job where jobname = 'goal-review-due';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$do$;

-- Codziennie o 04:00 UTC (~06:00 Europe/Warsaw w lecie / 05:00 w zimie).
select cron.schedule(
  'warranty-expiring',
  '0 4 * * *',
  'select public.trigger_warranty_expiring_cron();'
);

-- Codziennie o 05:00 UTC.
select cron.schedule(
  'goal-review-due',
  '0 5 * * *',
  'select public.trigger_goal_review_due_cron();'
);
