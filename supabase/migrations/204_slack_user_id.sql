-- Integracja Slack — identyfikator użytkownika Slacka (do wysyłki DM przez chat.postMessage,
-- wymaga SLACK_BOT_TOKEN w env; sama integracja workspace'u odbywa się poza aplikacją).
alter table public.profiles
  add column if not exists slack_user_id text;

comment on column public.profiles.slack_user_id is
  'ID użytkownika w Slacku (np. U0123ABC456) — do wysyłki powiadomień DM przez Slack Bot Token.';
