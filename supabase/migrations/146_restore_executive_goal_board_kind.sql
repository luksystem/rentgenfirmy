-- Przywrócenie kategorii „Cele zarządu” (admin_only) — usuniętej przypadkowo z UI.
insert into public.goal_board_kinds (code, label, description, icon, visibility, sort_order, is_active)
values (
  'executive',
  'Cele zarządu',
  'Cele strategiczne zarządu — widoczne tylko dla administratorów.',
  'crown',
  'admin_only',
  70,
  true
)
on conflict (code) do update set
  label = excluded.label,
  description = excluded.description,
  icon = excluded.icon,
  visibility = excluded.visibility,
  sort_order = excluded.sort_order,
  is_active = true;
