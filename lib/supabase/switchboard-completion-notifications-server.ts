import "server-only";

import { sendPushToUser } from "@/lib/push/send-push";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveStageIdByTitlePattern } from "@/lib/supabase/process-stage-title-lookup-server";
import { resolveStageResponsibleUserId } from "@/lib/supabase/process-snapshot-notifications-server";

// Etap "Dostawa i montaż rozdzielni" nie ma stałego id — różni się per szablon/projekt — więc
// dopasowujemy po tytule, tak jak poprosił właściciel, zamiast wpisywać na sztywno id szablonu
// "Dom".
const STAGE_TITLE_PATTERN = /rozdzieln/i;

async function resolveSwitchboardStageId(projectId: string): Promise<string | null> {
  return resolveStageIdByTitlePattern(projectId, STAGE_TITLE_PATTERN);
}

/** Powiadamia osobę odpowiedzialną za etap "Dostawa i montaż rozdzielni" (push + w apce), że
 *  instalator oznaczył wpinanie danej rozdzielnicy jako zakończone. */
export async function sendSwitchboardCompletionNotification(input: {
  projectId: string;
  projectName: string;
  switchboardName: string;
  completedByName: string;
}): Promise<void> {
  const stageId = await resolveSwitchboardStageId(input.projectId);
  const responsibleUserId = await resolveStageResponsibleUserId(input.projectId, stageId);
  if (!responsibleUserId) return;

  const supabase = getSupabaseAdmin();
  const { data: projectRow } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", input.projectId)
    .maybeSingle();
  const clientId = (projectRow?.client_id as string | null) ?? null;

  const title = `Rozdzielnica wpięta: ${input.switchboardName}`;
  const body = `${input.projectName} — ${input.completedByName} oznaczył(a) wpinanie rozdzielnicy „${input.switchboardName}” jako zakończone.`;
  const linkUrl = clientId
    ? `/przestrzenie/klient/${clientId}?project=${encodeURIComponent(input.projectId)}&tab=switchboards`
    : "/projekty";
  const sourceId = `switchboard_completed:${input.projectId}:${input.switchboardName}`;

  const { error } = await supabase.from("user_notifications").insert({
    id: crypto.randomUUID(),
    profile_id: responsibleUserId,
    kind: "switchboard_wiring_completed",
    title,
    body,
    link_url: linkUrl,
    source_id: sourceId,
    created_at: new Date().toISOString(),
  });
  if (error) console.warn("[switchboard-completion] user_notifications insert:", error.message);

  try {
    await sendPushToUser(responsibleUserId, { title, body, url: linkUrl, tag: sourceId });
  } catch (pushError) {
    console.warn("[switchboard-completion] push failed:", pushError);
  }
}
