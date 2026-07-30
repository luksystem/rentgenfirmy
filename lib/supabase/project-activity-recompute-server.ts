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
  /** Faza 9A — zmianę projektową może utworzyć klient; rozstrzyga o przypisaniu do osi. */
  created_by_side?: string | null;
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

/**
 * Faza 9A (docs/08 D18/D19 §5) — dwie osie zamiast jednej.
 *
 * `combined` napędza histerezę `is_active` (zachowanie bez zmian — dokładnie ten sam `MAX()` co
 * wcześniej, żeby flaga nie zmieniła się przy tej refaktoryzacji). `internal`/`client` to nowe,
 * TRWAŁE osie: jeden `MAX()` obu maskuje najgroźniejszy przypadek z czterech (klient pisze, my
 * milczymy) pod tym samym „aktywny", co stan zdrowy.
 *
 * Przypisanie kierunku: klienckie są wyłącznie pola odpowiedzi klienta (`client_responded_at`,
 * `client_offer_responded_at`, `settlement_offer_responded_at`) oraz wiersze, które klient sam
 * utworzył (`created_by_side='client'`). Wszystko inne to nasza strona.
 */
type ActivityAxes = {
  combined: Map<string, string>;
  internal: Map<string, string>;
  client: Map<string, string>;
};

async function fetchActivityByProject(lookbackDays: number): Promise<ActivityAxes> {
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
    communicationEvents,
    smsMessages,
    kanbanActivity,
    resourcePlanItems,
  ] = await Promise.all([
    admin
      .from("project_change_requests")
      .select("project_id, created_at, updated_at, submitted_at, client_responded_at, created_by_side")
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
    // Faza 9A — ręczne fakty kontaktu. Kierunek bierzemy z wiersza, nie zgadujemy.
    admin
      .from("communication_events")
      .select("project_id, direction, event_at")
      .gte("event_at", cutoffIso),
    // SMS: zawsze wychodzące. Dziś zwróci 0 wierszy (project_id bez backfillu, patrz migracja 258),
    // zacznie działać samo od nowych wysyłek — bez kolejnej zmiany w kodzie.
    admin
      .from("sms_messages")
      .select("project_id, created_at, sent_at")
      .not("project_id", "is", null)
      .gte("created_at", cutoffIso),
    /**
     * Faza 10 (docs/08 D19 §5 pkt 3) — KANBAN, źródło oznaczone w decyzji jako krytyczne: „tam
     * będzie żył ROT, więc bez tego źródła projekt prowadzony wzorowo na rejestrze wygląda jak
     * porzucony". Po D37 na tablicach żyje 66 pozycji ROT, więc to już nie teoria.
     * Droga karta → projekt to cztery skoki, dlatego join siedzi w SQL (migracja 260).
     */
    admin.rpc("report_kanban_activity_by_project", { p_since: cutoffIso }),
    // Faza 10 — przydziały w Planie Zasobów. Zawsze nasza strona (klient nie planuje ekip).
    admin
      .from("resource_plan_items")
      .select("project_id, created_at, updated_at")
      .not("project_id", "is", null)
      .gte("updated_at", cutoffIso),
  ]);

  for (const result of [
    changeRequests,
    agreements,
    documents,
    timeEntries,
    services,
    meetingNotes,
    communicationEvents,
    smsMessages,
    kanbanActivity,
    resourcePlanItems,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const combined = new Map<string, string>();
  const internal = new Map<string, string>();
  const client = new Map<string, string>();

  /** Dokłada do osi kierunkowej i do combined jednym wywołaniem. */
  const add = (
    axis: Map<string, string>,
    projectId: string | null | undefined,
    ...timestamps: Array<string | null | undefined>
  ) => {
    mergeActivity(axis, projectId, ...timestamps);
    mergeActivity(combined, projectId, ...timestamps);
  };

  for (const row of (changeRequests.data ?? []) as ActivityRow[]) {
    // Zmianę projektową może utworzyć klient — wtedy jej powstanie jest sygnałem klienckim.
    const ownAxis = row.created_by_side === "client" ? client : internal;
    add(ownAxis, row.project_id, row.created_at, row.updated_at, row.submitted_at);
    add(client, row.project_id, row.client_responded_at);
  }
  for (const row of (agreements.data ?? []) as ActivityRow[]) {
    add(internal, row.project_id, row.created_at, row.updated_at, row.submitted_at);
    add(client, row.project_id, row.client_responded_at);
  }
  for (const row of (documents.data ?? []) as ActivityRow[]) {
    add(internal, row.project_id, row.created_at, row.updated_at);
  }
  for (const row of (timeEntries.data ?? []) as ActivityRow[]) {
    add(internal, row.project_id, dateToIsoEndOfDay(row.date), row.created_at, row.updated_at);
  }
  for (const row of (services.data ?? []) as ActivityRow[]) {
    add(internal, row.project_id, row.created_at, row.updated_at);
    add(client, row.project_id, row.client_offer_responded_at, row.settlement_offer_responded_at);
  }
  for (const row of (meetingNotes.data ?? []) as Array<
    ActivityRow & { published_at?: string | null }
  >) {
    add(internal, row.project_id, row.created_at, row.updated_at, row.published_at);
  }
  for (const row of (communicationEvents.data ?? []) as Array<{
    project_id: string | null;
    direction: string | null;
    event_at: string | null;
  }>) {
    add(row.direction === "przychodzace" ? client : internal, row.project_id, row.event_at);
  }
  for (const row of (smsMessages.data ?? []) as Array<{
    project_id: string | null;
    created_at: string | null;
    sent_at: string | null;
  }>) {
    add(internal, row.project_id, row.sent_at, row.created_at);
  }
  // Faza 10 — kanban: karta zgłoszona przez klienta to sygnał kliencki, nasza to nasz.
  for (const row of (kanbanActivity.data ?? []) as Array<{
    project_id: string | null;
    team_at: string | null;
    client_at: string | null;
  }>) {
    add(internal, row.project_id, row.team_at);
    add(client, row.project_id, row.client_at);
  }
  for (const row of (resourcePlanItems.data ?? []) as Array<{
    project_id: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>) {
    add(internal, row.project_id, row.created_at, row.updated_at);
  }

  return { combined, internal, client };
}

export type RecomputeActiveProjectsResult = {
  autoDetectEnabled: boolean;
  scanned: number;
  activated: number;
  deactivated: number;
  unchanged: number;
  /** Faza 9A — ile projektów dostało nową datę na którejś z osi aktywności. */
  axesUpdated: number;
};

export async function recomputeActiveProjectsServer(
  settingsOverride?: ProjectActivitySettings,
): Promise<RecomputeActiveProjectsResult> {
  const settings = normalizeProjectActivitySettings(
    settingsOverride ?? (await fetchProjectActivitySettingsServer()),
  );

  const admin = getSupabaseAdmin();
  const lookbackDays = settings.deactivateAfterDays + 7;

  const [{ data: projects, error: projectsError }, { data: fieldOptionsRow }, activityByProject] =
    await Promise.all([
      admin
        .from("projects")
        .select("id, is_active, flow_status, last_internal_activity_at, last_client_activity_at"),
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
  let axesUpdated = 0;

  type ProjectUpdate = {
    id: string;
    is_active?: boolean;
    last_internal_activity_at?: string | null;
    last_client_activity_at?: string | null;
  };
  const updates: ProjectUpdate[] = [];

  for (const project of projects ?? []) {
    const patch: ProjectUpdate = { id: project.id };

    /**
     * Faza 9A — osie zapisujemy NIEZALEŻNIE od `autoDetectActiveProjects`. Ta flaga rządzi wyłącznie
     * histerezą `is_active`; osie są surowym faktem, którego potrzebuje bezpiecznik ciszy. Gdyby
     * siedziały pod tym samym `if`, wyłączenie auto-wykrywania cicho zabiłoby fundament fazy 11.
     * Osie nigdy nie cofają się do null — brak nowej aktywności zostawia poprzednią datę.
     */
    const nextInternal = activityByProject.internal.get(project.id) ?? null;
    const nextClient = activityByProject.client.get(project.id) ?? null;
    const mergedInternal = maxIsoTimestamp([project.last_internal_activity_at, nextInternal]);
    const mergedClient = maxIsoTimestamp([project.last_client_activity_at, nextClient]);

    if (mergedInternal !== (project.last_internal_activity_at ?? null)) {
      patch.last_internal_activity_at = mergedInternal;
    }
    if (mergedClient !== (project.last_client_activity_at ?? null)) {
      patch.last_client_activity_at = mergedClient;
    }

    if (settings.autoDetectActiveProjects) {
      const desired = computeDesiredIsActive({
        currentlyActive: Boolean(project.is_active),
        isClosed: isClosedFlowStatus(project.flow_status, fieldOptions),
        lastActivityAt: activityByProject.combined.get(project.id) ?? null,
        settings,
        now,
      });

      if (desired === null) {
        unchanged += 1;
      } else {
        patch.is_active = desired;
        if (desired) {
          activated += 1;
        } else {
          deactivated += 1;
        }
      }
    }

    // Same `id` = nic do zapisania dla tego projektu.
    if (Object.keys(patch).length > 1) {
      if (patch.last_internal_activity_at !== undefined || patch.last_client_activity_at !== undefined) {
        axesUpdated += 1;
      }
      updates.push(patch);
    }
  }

  // Batch updates in chunks (Supabase doesn't support multi-row different values easily)
  const chunkSize = 40;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async ({ id, ...patch }) => {
        const { error } = await admin.from("projects").update(patch).eq("id", id);
        if (error) {
          throw new Error(error.message);
        }
      }),
    );
  }

  return {
    autoDetectEnabled: settings.autoDetectActiveProjects,
    scanned: projects?.length ?? 0,
    activated,
    deactivated,
    unchanged,
    axesUpdated,
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
