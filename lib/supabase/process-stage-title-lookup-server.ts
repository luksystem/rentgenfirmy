import "server-only";

import type { ProcessTemplate } from "@/lib/process/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToProjectProcess } from "@/lib/supabase/process-mappers";
import { fetchProcessTemplateByProjectTypeServer } from "@/lib/supabase/process-server";

/**
 * Znajduje id etapu procesu projektu wg dopasowania tytułu do wzorca (regex, case-insensitive).
 * Współdzielone przez powiadomienia o zakończeniu Rozdzielni i modułów dokumentacji (Rolety,
 * Przyciski, Alarm, HVAC, RACK) — oba mechanizmy identyfikują "swój" etap po tytule, nie po
 * sztywnym id szablonu, bo tytuły/szablony różnią się per typ projektu.
 */
export async function resolveStageIdByTitlePattern(
  projectId: string,
  pattern: RegExp,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const [{ data: project, error: projectError }, { data: processRow, error: processError }] =
    await Promise.all([
      supabase.from("projects").select("type").eq("id", projectId).maybeSingle(),
      supabase.from("project_processes").select("*").eq("project_id", projectId).maybeSingle(),
    ]);

  if (projectError) throw new Error(projectError.message);
  if (processError) throw new Error(processError.message);
  if (!project) return null;

  const process = processRow ? rowToProjectProcess(processRow) : null;
  const liveTemplate = process?.templateSnapshot
    ? null
    : await fetchProcessTemplateByProjectTypeServer(project.type, supabase);
  const template: ProcessTemplate | null = process?.templateSnapshot ?? liveTemplate;
  if (!template) return null;

  const stage = template.stages.find((entry) => pattern.test(entry.title));
  return stage?.id ?? null;
}
