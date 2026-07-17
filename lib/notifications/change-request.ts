import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";
import type { UserNotificationKind } from "@/lib/notifications/types";

export async function notifyTeamAboutChangeRequestDecision(input: {
  changeRequestId: string;
  projectId: string;
  title: string;
  accepted: boolean;
  clientResponseName: string;
}) {
  const teamProfiles = await fetchTeamProfilesServer().catch(() => []);
  if (!teamProfiles.length) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const sourceId = `change_request_client_responded:${input.changeRequestId}`;

  const { data: existing } = await supabase
    .from("user_notifications")
    .select("id")
    .eq("source_id", sourceId)
    .limit(1);

  if ((existing ?? []).length > 0) {
    return;
  }

  const { data: projectRow } = await supabase
    .from("projects")
    .select("client_id, name")
    .eq("id", input.projectId)
    .maybeSingle();

  const clientId = (projectRow?.client_id as string | null) ?? null;
  const projectName = (projectRow?.name as string | undefined) ?? "Projekt";
  const linkUrl = clientId
    ? `/przestrzenie/klient/${clientId}?project=${encodeURIComponent(input.projectId)}&tab=changes`
    : "/projekty";

  const kind: UserNotificationKind = "change_request_client_responded";
  const decision = input.accepted ? "zaakceptował" : "odrzucił";
  const now = new Date().toISOString();

  const rows = teamProfiles.map((profile) => ({
    id: crypto.randomUUID(),
    profile_id: profile.id,
    kind,
    title: `Klient ${decision} zmianę projektu`,
    body: `${input.clientResponseName} — „${input.title}” w projekcie „${projectName}".`,
    link_url: linkUrl,
    source_id: sourceId,
    created_at: now,
  }));

  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error && !error.message.toLowerCase().includes("user_notifications_kind_check")) {
    throw new Error(error.message);
  }
}
