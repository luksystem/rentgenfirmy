-- D44 — cron przekaznika pusha. Wzorzec 1:1 z pozostalych dziewieciu crony (D39).
create or replace function public.trigger_notification_push_relay_cron()
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
declare
  app_url text;
  cron_secret text;
  sync_url text;
begin
  select nullif(trim(s.app_url), ''), nullif(trim(s.cron_secret), '')
    into app_url, cron_secret
    from public.integration_cron_settings s
   where s.id = 'default';

  if app_url is null or cron_secret is null then
    return;
  end if;

  sync_url := rtrim(app_url, '/') || '/api/cron/notification-push-relay';

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
$function$;

-- Co 5 minut. Push ma dogonic zdarzenie w rozsadnym czasie; okno wieku w kodzie (180 min) pilnuje,
-- zeby po dluzszej awarii nie poszla lawina powiadomien o rzeczach juz nieaktualnych.
select cron.schedule(
  'notification-push-relay',
  '*/5 * * * *',
  'select public.trigger_notification_push_relay_cron();'
);

do $$
declare
  v_jest integer;
begin
  select count(*) into v_jest from cron.job where jobname = 'notification-push-relay';
  if v_jest <> 1 then
    raise exception 'Cron nie zostal zarejestrowany (%)', v_jest;
  end if;
  raise notice 'OK: cron notification-push-relay co 5 minut.';
end $$;
