-- Rozliczenie nie wygasa, ale po terminie automatycznej akceptacji (settlement_offer_expires_at)
-- bez reakcji klienta system sam oznacza je jako zaakceptowane (patrz
-- lib/notifications/settlement-auto-accept.ts). Cron codzienny, jak recompute-active-projects.

create or replace function public.trigger_settlement_auto_accept_cron()
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

  sync_url := rtrim(app_url, '/') || '/api/cron/settlement-auto-accept';

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

revoke all on function public.trigger_settlement_auto_accept_cron() from public;
grant execute on function public.trigger_settlement_auto_accept_cron() to postgres;

do $do$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'settlement-auto-accept';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$do$;

-- Codziennie o 03:30 UTC
select cron.schedule(
  'settlement-auto-accept',
  '30 3 * * *',
  'select public.trigger_settlement_auto_accept_cron();'
);
