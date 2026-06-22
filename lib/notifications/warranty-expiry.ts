import { isWarrantyExpiringSoon, resolveProjectWarrantyEndsAt } from "@/lib/project/warranty";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import type { Project } from "@/lib/types";
import { getSupabase } from "@/lib/supabase/client";

export async function ensureWarrantyExpiringNotifications(projects: Project[]) {
  const teamProfiles = await fetchTeamProfiles().catch(() => []);
  const profileIds = teamProfiles.map((profile) => profile.id);
  if (!profileIds.length) {
    return;
  }

  const expiringProjects = projects.filter((project) => isWarrantyExpiringSoon(project));
  if (!expiringProjects.length) {
    return;
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  for (const project of expiringProjects) {
    const endsAt = resolveProjectWarrantyEndsAt(project);
    if (!endsAt) {
      continue;
    }

    const sourceId = `warranty_expiring:${project.id}:${endsAt}`;
    const linkUrl = project.clientId
      ? `/przestrzenie/klient/${project.clientId}?project=${project.id}`
      : "/projekty";

    const { data: existing, error: existingError } = await supabase
      .from("user_notifications")
      .select("id")
      .eq("source_id", sourceId)
      .limit(1);

    if (existingError) {
      if (existingError.message.toLowerCase().includes("does not exist")) {
        return;
      }
      throw new Error(existingError.message);
    }

    if ((existing ?? []).length > 0) {
      continue;
    }

    const rows = profileIds.map((profileId) => ({
      id: crypto.randomUUID(),
      profile_id: profileId,
      kind: "warranty_expiring",
      title: `Gwarancja kończy się wkrótce: ${project.name}`,
      body: `Koniec gwarancji ${endsAt}. Przygotuj przedłużenie lub przegląd systemu.`,
      link_url: linkUrl,
      source_id: sourceId,
      created_at: now,
    }));

    const { error } = await supabase.from("user_notifications").insert(rows);
    if (error) {
      if (error.message.toLowerCase().includes("does not exist")) {
        return;
      }
      if (error.message.toLowerCase().includes("user_notifications_kind_check")) {
        return;
      }
      throw new Error(error.message);
    }
  }
}
