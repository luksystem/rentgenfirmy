-- Krok B B8.1/B8.2 - nowe kind dla user_notifications + cron (wzorzec migracji 179).
alter table public.user_notifications drop constraint user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check check (
  kind = any (array[
    'kanban_mention', 'kanban_new_activity', 'warranty_expiring', 'agreement_client_created',
    'client_stage_rating', 'service_intake_preliminary_offer', 'service_intake_assigned',
    'inspection_billing_due', 'goal_review_due', 'goal_period_ending', 'goal_at_risk',
    'goal_recurring_created', 'leave_request_created', 'leave_request_decided',
    'monthly_review_self_submitted', 'client_offer_accepted', 'settlement_offer_accepted',
    'client_offer_expiring', 'work_item_assigned', 'work_item_sent', 'work_item_changed',
    'work_item_acceptance_needed', 'work_item_obstacle_reported', 'work_item_overdue',
    'work_item_verification_needed', 'work_item_takeover_requested',
    'change_request_client_responded', 'offer_approval_requested', 'offer_approval_reviewed',
    'agreement_client_responded', 'service_intake_submitted', 'service_intake_status',
    'chat_mention', 'chat_message', 'chat_room_invite',
    'commitment_window_warning', 'commitment_unavailable_warning', 'leave_commitment_impact'
  ])
);

create or replace function public.trigger_commitment_warnings_cron()
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
  select nullif(trim(s.app_url), ''), nullif(trim(s.cron_secret), '')
  into app_url, cron_secret
  from public.integration_cron_settings s
  where s.id = 'default';

  if app_url is null or cron_secret is null then
    return;
  end if;

  sync_url := rtrim(app_url, '/') || '/api/cron/commitment-warnings';

  perform net.http_post(
    url := sync_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret, 'Content-Type', 'application/json'),
    body := jsonb_build_object('source', 'pg_cron'),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function public.trigger_commitment_warnings_cron() from public;
grant execute on function public.trigger_commitment_warnings_cron() to postgres;

select cron.schedule(
  'commitment-warnings',
  '30 4 * * *',
  'select public.trigger_commitment_warnings_cron();'
);
