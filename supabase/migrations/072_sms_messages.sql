-- Log wysyłek SMS (moduł niezależny — provider SMSAPI na start)

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_phone text not null,
  message text not null,
  provider text not null default 'smsapi',
  provider_message_id text,
  status text not null default 'queued',
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sms_messages_status_check check (
    status in ('queued', 'sent', 'failed', 'delivered')
  )
);

create index if not exists sms_messages_created_at_idx
  on public.sms_messages (created_at desc);

create index if not exists sms_messages_provider_message_id_idx
  on public.sms_messages (provider_message_id)
  where provider_message_id is not null;

alter table public.sms_messages enable row level security;

-- Odczyt/zapis tylko przez service role (API serwerowe)
create policy "sms_messages_service_role_all" on public.sms_messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
