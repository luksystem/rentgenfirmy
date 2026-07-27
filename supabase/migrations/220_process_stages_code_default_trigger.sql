-- Siatka bezpieczeństwa: process_stages.code jest NOT NULL od migracji 215, ale
-- insertTemplateStagesGraph() (lib/supabase/process-repository.ts) nie ustawiał go przy
-- INSERT. Dwie ścieżki w kodzie to trafiają: ensureProcessTemplateForProjectType() (nowy typ
-- projektu -> nowy szablon) i updateProcessTemplate() (zapis edycji szablonu w panelu admina,
-- DELETE+INSERT wszystkich etapów). Druga ścieżka dotyczy też szablonu DOM (10 etapów już
-- zaseedowanych) — zapis edycji szablonu w produkcji byłby dziś całkowicie zepsuty.
--
-- Trigger jako siatka bezpieczeństwa działająca NATYCHMIAST, niezależnie od wdrożenia kodu
-- aplikacji: gdy code nie podane, generuje 'stage_<position>' — ten sam wzorzec co backfill
-- w 215. Nie zastępuje poprawki w insertTemplateStagesGraph (ta idzie osobno, żeby nowe
-- etapy dostawały świadomie nadany code, nie tylko mechaniczny fallback), tylko zabezpiecza
-- przed całkowitą awarią do czasu wdrożenia.

create or replace function public.default_process_stage_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.code is null then
    new.code := 'stage_' || new.position::text;
  end if;
  return new;
end;
$$;

drop trigger if exists process_stages_code_default on public.process_stages;
create trigger process_stages_code_default
  before insert on public.process_stages
  for each row execute function public.default_process_stage_code();
