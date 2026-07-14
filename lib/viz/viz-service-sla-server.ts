import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listVizDashboardProjects } from "@/lib/supabase/viz-server";
import {
  buildVizServiceSlaItem,
  resolveContractSlaForProject,
  sortVizServiceSlaItems,
  type VizServiceSlaItem,
} from "@/lib/viz/service-sla";
import { listVizServiceContracts } from "@/lib/viz/viz-contracts-server";
import type { ServiceIntakePriority, ServiceIntakeStatus } from "@/lib/service-intake/types";

type IntakeRow = {
  id: string;
  reference_number: string;
  status: string;
  priority: string | null;
  project_id: string | null;
  description: string;
  created_at: string;
  due_at: string | null;
  closed_at: string | null;
};

export type VizServiceSlaSummary = {
  totalOpen: number;
  overdueCount: number;
  approachingCount: number;
  items: VizServiceSlaItem[];
};

export async function getVizDashboardServiceSla(
  dashboardId: string,
): Promise<VizServiceSlaSummary> {
  const [projects, contracts] = await Promise.all([
    listVizDashboardProjects(dashboardId),
    listVizServiceContracts(dashboardId),
  ]);

  const projectIds = projects
    .filter((project) => project.isActiveInDashboard)
    .map((project) => project.projectId);

  if (!projectIds.length) {
    return { totalOpen: 0, overdueCount: 0, approachingCount: 0, items: [] };
  }

  const projectLabelById = new Map(
    projects.map((project) => [
      project.projectId,
      project.displayName ?? project.projectName ?? project.projectId,
    ]),
  );

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("service_intake_requests")
    .select(
      "id, reference_number, status, priority, project_id, description, created_at, due_at, closed_at",
    )
    .in("project_id", projectIds)
    .in("status", ["new", "in_review"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const items = sortVizServiceSlaItems(
    ((data ?? []) as IntakeRow[]).map((row) => {
      const projectId = row.project_id as string;
      const contract = resolveContractSlaForProject(projectId, contracts);

      return buildVizServiceSlaItem(
        {
          id: row.id,
          referenceNumber: row.reference_number,
          status: row.status as ServiceIntakeStatus,
          priority: (row.priority as ServiceIntakePriority | null) ?? null,
          projectId,
          description: row.description,
          createdAt: row.created_at,
          dueAt: row.due_at,
          closedAt: row.closed_at,
        },
        {
          projectLabel: projectLabelById.get(projectId) ?? null,
          contract,
        },
      );
    }),
  );

  return {
    totalOpen: items.length,
    overdueCount: items.filter((item) => item.slaStatus === "overdue").length,
    approachingCount: items.filter((item) => item.slaStatus === "approaching").length,
    items,
  };
}
