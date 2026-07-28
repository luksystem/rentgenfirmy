-- Znalezione przez get_advisors (security): recompute_project_flow_status i
-- trigger_recompute_project_flow_status_cron mialy domyslny GRANT EXECUTE TO PUBLIC (standardowe
-- zachowanie Postgresa przy CREATE FUNCTION), wiec byly wywolywalne przez anon/authenticated
-- przez /rest/v1/rpc/... bez zadnej autoryzacji. Te funkcje sa wylacznie do wywolania przez
-- triggery (perform ...) i cron (pg_cron, ktory dziala jako uprzywilejowana rola bazy, nie przez
-- PostgREST) - nikt spoza tego nie powinien miec do nich dostepu.
revoke execute on function public.recompute_project_flow_status(uuid) from public, anon, authenticated;
revoke execute on function public.trigger_recompute_project_flow_status_cron() from public, anon, authenticated;
