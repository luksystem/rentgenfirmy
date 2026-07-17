-- Publiczny link do akceptacji zmiany projektu przez klienta (bez logowania).
-- Link wygasa (public_enabled = false) po decyzji klienta.

alter table public.project_change_requests
  add column if not exists public_token text,
  add column if not exists public_enabled boolean not null default false;

update public.project_change_requests
set public_token = encode(gen_random_bytes(18), 'hex')
where public_token is null;

alter table public.project_change_requests
  alter column public_token set default encode(gen_random_bytes(18), 'hex');

alter table public.project_change_requests
  alter column public_token set not null;

create unique index if not exists project_change_requests_public_token_uidx
  on public.project_change_requests (public_token);

-- Istniejące zmiany oczekujące na klienta — od razu z aktywnym linkiem
update public.project_change_requests
set public_enabled = true
where status = 'pending_client'
  and public_enabled = false;

comment on column public.project_change_requests.public_token is
  'Token publicznego linku akceptacji zmiany (/zmiana/{token}).';
comment on column public.project_change_requests.public_enabled is
  'Czy publiczny link jest aktywny. Wyłączany po akceptacji/odrzuceniu przez klienta.';

-- Powiadomienie: klient podjął decyzję w sprawie zmiany projektu
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
