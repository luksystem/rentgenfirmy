-- Konfiguracja crona telemetrii w tabeli (Supabase nie pozwala na ALTER DATABASE SET app.*).
-- Uruchom po 059, jeśli funkcja używała current_setting().
--
-- Następnie wstaw URL i sekret (ten sam CRON_SECRET co na Vercel):
--
--   insert into public.integration_cron_settings (id, app_url, cron_secret)
--   values ('default', 'https://twoja-apka.vercel.app', 'twoj-sekret')
--   on conflict (id) do update set
--     app_url = excluded.app_url,
--     cron_secret = excluded.cron_secret,
--     updated_at = now();

create table if not exists public.integration_cron_settings (
  id text primary key default 'default',
  app_url text not null default '',
  cron_secret text not null default '',
  updated_at timestamptz not null default now(),
  constraint integration_cron_settings_singleton check (id = 'default')
);

alter table public.integration_cron_settings enable row level security;

revoke all on table public.integration_cron_settings from public;
revoke all on table public.integration_cron_settings from anon, authenticated;

create or replace function public.trigger_telemetry_sync_cron()
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

  sync_url := rtrim(app_url, '/') || '/api/cron/telemetry-sync';

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

revoke all on function public.trigger_telemetry_sync_cron() from public;
grant execute on function public.trigger_telemetry_sync_cron() to postgres;
