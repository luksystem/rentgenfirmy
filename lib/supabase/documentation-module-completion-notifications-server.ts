import "server-only";

import { sendPushToUser } from "@/lib/push/send-push";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveStageIdByTitlePattern } from "@/lib/supabase/process-stage-title-lookup-server";
import { resolveStageResponsibleUserId } from "@/lib/supabase/process-snapshot-notifications-server";

// Wszystkie 5 modułów (Rolety, Przyciski, Alarm, HVAC, RACK) trafiają na jeden i ten sam etap
// szablonu "Dom" — "Etap 8 – Montaż urządzeń" — więc jeden wzorzec tytułu wystarcza dla każdego.
const STAGE_TITLE_PATTERN = /montaż urządzeń/i;

/** Powiadamia osobę odpowiedzialną za etap "Montaż urządzeń", że instalator oznaczył dany moduł
 *  dokumentacji jako zakończony — ten sam wzorzec co switchboard_wiring_completed. */
export async function sendDocumentationModuleCompletionNotification(input: {
  projectId: string;
  projectName: string;
  moduleLabel: string;
  moduleName: string;
  completedByName: string;
}): Promise<void> {
  const stageId = await resolveStageIdByTitlePattern(input.projectId, STAGE_TITLE_PATTERN);
  const responsibleUserId = await resolveStageResponsibleUserId(input.projectId, stageId);
  if (!responsibleUserId) return;

  const supabase = getSupabaseAdmin();
  const { data: projectRow } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", input.projectId)
    .maybeSingle();
  const clientId = (projectRow?.client_id as string | null) ?? null;

  const title = `${input.moduleLabel} wpięte: ${input.moduleName}`;
  const body = `${input.projectName} — ${input.completedByName} oznaczył(a) moduł „${input.moduleName}” (${input.moduleLabel}) jako zakończony.`;
  const linkUrl = clientId
    ? `/przestrzenie/klient/${clientId}?project=${encodeURIComponent(input.projectId)}&tab=proces`
    : "/projekty";
  const sourceId = `documentation_module_completed:${input.projectId}:${input.moduleName}`;

  const { error } = await supabase.from("user_notifications").insert({
    id: crypto.randomUUID(),
    profile_id: responsibleUserId,
    kind: "documentation_module_completed",
    title,
    body,
    link_url: linkUrl,
    source_id: sourceId,
    created_at: new Date().toISOString(),
  });
  if (error) console.warn("[documentation-module-completion] user_notifications insert:", error.message);

  try {
    await sendPushToUser(responsibleUserId, { title, body, url: linkUrl, tag: sourceId });
  } catch (pushError) {
    console.warn("[documentation-module-completion] push failed:", pushError);
  }
}
