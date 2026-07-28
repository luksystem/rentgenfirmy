-- Faza 7 (D3) follow-up do migracji 232 - CREATE FUNCTION domyslnie nadaje EXECUTE dla PUBLIC/anon
-- (ten sam wzorzec bledu co w migracji 230). report_rot_items() zostal ODTWORZONY (DROP+CREATE) w
-- 232, wiec stracil swoj wczesniejszy grant tylko-dla-authenticated - naprawiamy razem z nowa
-- funkcja report_stage_health().
revoke execute on function public.report_rot_items() from public, anon;
revoke execute on function public.report_stage_health() from public, anon;

grant execute on function public.report_rot_items() to authenticated;
grant execute on function public.report_stage_health() to authenticated;
