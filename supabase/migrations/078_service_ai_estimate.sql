-- AI estimate snapshot for service settlements (Rozliczenia serwisowe)
alter table services
  add column if not exists ai_estimate jsonb;

comment on column services.ai_estimate is
  'Snapshot of AI-assisted estimate: proposal, travel context, applied line items, variance after settlement';
