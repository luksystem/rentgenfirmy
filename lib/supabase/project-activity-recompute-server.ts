import { computeDesiredIsActive, maxIsoTimestamp } from "@/lib/project-activity/detect";
import {
  normalizeProjectActivitySettings,
  type ProjectActivitySettings,
} from "@/lib/project-activity/settings";
import { isClosedFlowStatus, normalizeFieldOptions } from "@/lib/field-options";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchProjectActivitySettingsServer } from "@/lib/supabase/project-activity-settings-server";

type ActivityRow = {
  project_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  submitted_at?: string | null;
  client_responded_at?: string | null;
  client_offer_responded_at?: string | null;
  settlement_offer_responded_at?: string | null;
  date?: string | null;
};

function mergeActivity(
  map: Map<string, string>,
  projectId: string | null | undefined,
  ...timestamps: Array<string | null | undefined>
) {
  if (!projectId) {
    return;
  }
  const next = maxIsoTimestamp([map.get(projectId) ?? null, ...timestamps]);
  if (next) {
    map.set(projectId, next);
  }
}

function dateToIsoEndOfDay(date: string | null | undefined): string | null {
  if (!date?.trim()) {
    return null;
  }
  // date-only → koniec dnia UTC, żeby „dziś” liczyło się jako aktywność
  return `${date.trim()}T23:59:59.999Z`;
}

async function fetchActivityByProject(
  lookbackDays: number,
): Promise<Map<string, string>> {
  const admin = getSupabaseAdmin();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffIso = cutoff.toISOString();
  const cutoffDate = cutoffIso.slice(0, 10);

  const [
    changeRequests,
    agreements,
    documents,
    timeEntries,
    services,
    meetingNotes,
  ] = await Promise.all([
    admin
      .from("project_change_requests")
      .select("project_id, created_at, updated_at, submitted_at, client_responded_at")
      .gte("updated_at", cutoffIso),
    admin
      .from("project_client_agreements")
      .select("project_id, created_at, updated_at, submitted_at, client_responded_at")
      .gte("updated_at", cutoffIso),
    admin
      .from("project_documents")
      .select("project_id, created_at, updated_at")
      .not("project_id", "is", null)
      .gte("created_at", cutoffIso),
    admin
      .from("time_entries")
      .select("project_id, date, created_at, updated_at")
      .not("project_id", "is", null)
      .gte("date", cutoffDate),
    admin
      .from("services")
      .select(
        "project_id, created_at, updated_at, client_offer_responded_at, settlement_offer_responded_at",
      )
      .not("project_id", "is", null)
      .gte("updated_at", cutoffIso),
    admin
      .from("project_meeting_notes")
      .select("project_id, created_at, updated_at, published_at")
      .gte("updated_at", cutoffIso),
  ]);

  for (const result of [
    changeRequests,
    agreements,
    documents,
    timeEntries,
    services,
    meetingNotes,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const map = new Map<string, string>();

  for (const row of (changeRequests.data ?? []) as ActivityRow[]) {
    mergeActivity(
      map,
      row.project_id,
      row.created_at,
      row.updated_at,
      row.submitted_at,
      row.client_responded_at,
    );
  }
  for (const row of (agreements.data ?? []) as ActivityRow[]) {
    mergeActivity(
      map,
      row.project_id,
      row.created_at,
      row.updated_at,
      row.submitted_at,
      row.client_responded_at,
    );
  }
  for (const row of (documents.data ?? []) as ActivityRow[]) {
    mergeActivity(map, row.project_id, row.created_at, row.updated_at);
  }
  for (const row of (timeEntries.data ?? []) as ActivityRow[]) {
    mergeActivity(
      map,
      row.project_id,
      dateToIsoEndOfDay(row.date),
      row.created_at,
      row.updated_at,
    );
  }
  for (const row of (services.data ?? []) as ActivityRow[]) {
    mergeActivity(
      map,
      row.project_id,
      row.created_at,
      row.updated_at,
      row.client_offer_responded_at,
      row.settlement_offer_responded_at,
    );
  }
  for (const row of (meetingNotes.data ?? []) as Array<
    ActivityRow & { published_at?: string | null }
  >) {
    mergeActivity(
      map,
      row.project_id,
      row.created_at,
      row.updated_at,
      row.published_at,
    );
  }

  return map;
}

export type RecomputeActiveProjectsResult = {
  autoDetectEnabled: boolean;
  scanned: number;
  activated: number;
  deactivated: number;
  unchanged: number;
};

export async function recomputeActiveProjectsServer(
  settingsOverride?: ProjectActivitySettings,
): Promise<RecomputeActiveProjectsResult> {
  const settings = normalizeProjectActivitySettings(
    settingsOverride ?? (await fetchProjectActivitySettingsServer()),
  );

  if (!settings.autoDetectActiveProjects) {
    return {
      autoDetectEnabled: false,
      scanned: 0,
      activated: 0,
      deactivated: 0,
      unchanged: 0,
    };
  }

  const admin = getSupabaseAdmin();
  const lookbackDays = settings.deactivateAfterDays + 7;

  const [{ data: projects, error: projectsError }, { data: fieldOptionsRow }, activityByProject] =
    await Promise.all([
      admin.from("projects").select("id, is_active, flow_status"),
      admin.from("app_settings").select("data").eq("id", "field_options").maybeSingle(),
      fetchActivityByProject(lookbackDays),
    ]);

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  const fieldOptions = normalizeFieldOptions(fieldOptionsRow?.data ?? undefined);
  const now = new Date();

  let activated = 0;
  let deactivated = 0;
  let unchanged = 0;

  const updates: Array<{ id: string; is_active: boolean }> = [];

  for (const project of projects ?? []) {
    const desired = computeDesiredIsActive({
      currentlyActive: Boolean(project.is_active),
      isClosed: isClosedFlowStatus(project.flow_status, fieldOptions),
      lastActivityAt: activityByProject.get(project.id) ?? null,
      settings,
      now,
    });

    if (desired === null) {
      unchanged += 1;
      continue;
    }

    updates.push({ id: project.id, is_active: desired });
    if (desired) {
      activated += 1;
    } else {
      deactivated += 1;
    }
  }

  // Batch updates in chunks (Supabase doesn't support multi-row different values easily)
  const chunkSize = 40;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (item) => {
        const { error } = await admin
          .from("projects")
          .update({ is_active: item.is_active })
          .eq("id", item.id);
        if (error) {
          throw new Error(error.message);
        }
      }),
    );
  }

  return {
    autoDetectEnabled: true,
    scanned: projects?.length ?? 0,
    activated,
    deactivated,
    unchanged,
  };
}

/** Natychmiastowe oznaczenie projektu jako aktywnego po zapisie sygnału (gdy auto włączone). */
export async function maybeActivateProjectFromActivityServer(
  projectId: string | null | undefined,
): Promise<void> {
  if (!projectId) {
    return;
  }

  try {
    const settings = await fetchProjectActivitySettingsServer();
    if (!settings.autoDetectActiveProjects) {
      return;
    }

    const admin = getSupabaseAdmin();
    const [{ data: project }, { data: fieldOptionsRow }] = await Promise.all([
      admin.from("projects").select("id, is_active, flow_status").eq("id", projectId).maybeSingle(),
      admin.from("app_settings").select("data").eq("id", "field_options").maybeSingle(),
    ]);

    if (!project || project.is_active) {
      return;
    }

    const fieldOptions = normalizeFieldOptions(fieldOptionsRow?.data ?? undefined);
    if (isClosedFlowStatus(project.flow_status, fieldOptions)) {
      return;
    }

    const { error } = await admin
      .from("projects")
      .update({ is_active: true })
      .eq("id", projectId)
      .eq("is_active", false);

    if (error) {
      throw new Error(error.message);
    }
  } catch {
    // Nie blokuj głównego zapisu przy błędzie auto-aktywacji.
  }
}
