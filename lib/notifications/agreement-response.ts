import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";
import type { UserNotificationKind } from "@/lib/notifications/types";
import { sendNotificationChannels } from "@/lib/notifications/dispatch";

const ACTION_ID = "agreement_client_responded" as const;

/** Powiadomienie zespołu po akceptacji/odrzuceniu ustalenia przez klienta. */
export async function notifyTeamAboutAgreementResponse(input: {
  agreementId: string;
  projectId: string;
  title: string;
  accepted: boolean;
  clientResponseName: string;
  clientResponseNote?: string | null;
}) {
  const teamProfiles = await fetchTeamProfilesServer().catch(() => []);
  if (!teamProfiles.length) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const sourceId = `agreement_client_responded:${input.agreementId}`;

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
    ? `/przestrzenie/klient/${clientId}?project=${encodeURIComponent(input.projectId)}&tab=agreements`
    : "/projekty";

  const kind: UserNotificationKind = "agreement_client_responded";
  const decisionLabel = input.accepted ? "Zaakceptowano" : "Odrzucono";
  const decisionVerb = input.accepted ? "zaakceptował(a)" : "odrzucił(a)";
  const now = new Date().toISOString();

  const rows = teamProfiles.map((profile) => ({
    id: crypto.randomUUID(),
    profile_id: profile.id,
    kind,
    title: `${decisionLabel}: ${input.title}`,
    body: `${input.clientResponseName} ${decisionVerb} ustalenie „${input.title}” w projekcie „${projectName}".`,
    link_url: linkUrl,
    source_id: sourceId,
    created_at: now,
  }));

  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error && !error.message.toLowerCase().includes("user_notifications_kind_check")) {
    throw new Error(error.message);
  }

  await sendNotificationChannels({
    actionId: ACTION_ID,
    variables: {
      decision_label: decisionLabel,
      decision_verb: decisionVerb,
      responder_name: input.clientResponseName,
      agreement_title: input.title,
      project_name: projectName,
      response_note: input.clientResponseNote?.trim() ?? "",
    },
    emailRecipients: teamProfiles
      .filter((profile) => profile.email.trim())
      .map((profile) => ({ audience: "user" as const, to: profile.email.trim() })),
    pushUserIds: teamProfiles.map((profile) => profile.id),
    linkUrl,
    pushTag: sourceId,
  });
}
