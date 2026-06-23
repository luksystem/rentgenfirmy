import { getDashboardPublicSessionAuthor } from "@/lib/dashboard/dashboard-public-request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchDashboardSpaceAccessByToken } from "@/lib/supabase/public-dashboard-server";
import { fetchKanbanPublicMeta } from "@/lib/supabase/kanban-public-server";

/** Zaufane otwarcie tablicy Kanban z osadzonego publicznego dashboardu (ten sam klient/projekt). */
export async function resolveKanbanAuthorFromDashboardSession(
  kanbanToken: string,
  dashboardToken: string,
): Promise<string | null> {
  const kanbanMeta = await fetchKanbanPublicMeta(kanbanToken);
  const kanbanProjectId = kanbanMeta?.context.projectId;
  if (!kanbanProjectId) {
    return null;
  }

  const dashboardAccess = await fetchDashboardSpaceAccessByToken(dashboardToken);
  if (!dashboardAccess) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data: spaceRow, error: spaceError } = await supabase
    .from("dashboard_spaces")
    .select("client_id, project_id, kind, public_enabled")
    .eq("public_token", dashboardToken)
    .maybeSingle();

  if (spaceError || !spaceRow || !spaceRow.public_enabled || spaceRow.kind !== "client") {
    return null;
  }

  let clientId = (spaceRow.client_id as string | null) ?? null;
  if (!clientId && spaceRow.project_id) {
    const { data: projectRow } = await supabase
      .from("projects")
      .select("client_id")
      .eq("id", spaceRow.project_id)
      .maybeSingle();
    clientId = (projectRow?.client_id as string | null) ?? null;
  }

  if (!clientId) {
    return null;
  }

  const { data: kanbanProjectRow } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", kanbanProjectId)
    .maybeSingle();

  if (!kanbanProjectRow || kanbanProjectRow.client_id !== clientId) {
    return null;
  }

  if (!dashboardAccess.passwordHash) {
    return (
      dashboardAccess.authorName ||
      kanbanMeta.context.clientName ||
      "Klient"
    );
  }

  return getDashboardPublicSessionAuthor(dashboardToken);
}
