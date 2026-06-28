import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";

export async function notifyTeamAboutClientStageRating(input: {
  projectId: string;
  stageId: string;
  stageTitle: string;
  score: number;
  authorName: string;
  satisfactionId: string;
}) {
  if (input.score <= 0) {
    return;
  }

  const teamProfiles = await fetchTeamProfilesServer().catch(() => []);
  if (!teamProfiles.length) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const sourceId = `client_stage_rating:${input.projectId}:${input.stageId}`;

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

  const clientId = projectRow?.client_id as string | null;
  const projectName = (projectRow?.name as string | undefined) ?? "Projekt";
  const linkUrl = clientId
    ? `/przestrzenie/klient/${clientId}?projectId=${encodeURIComponent(input.projectId)}&tab=satisfaction`
    : "/projekty";

  const now = new Date().toISOString();
  const rows = teamProfiles.map((profile) => ({
    id: crypto.randomUUID(),
    profile_id: profile.id,
    kind: "client_stage_rating",
    title: `Klient ocenił etap: ${input.stageTitle}`,
    body: `${input.authorName} — ${input.score}/10 w projekcie „${projectName}".`,
    link_url: linkUrl,
    source_id: sourceId,
    created_at: now,
  }));

  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error && !error.message.toLowerCase().includes("user_notifications_kind_check")) {
    throw new Error(error.message);
  }
}
