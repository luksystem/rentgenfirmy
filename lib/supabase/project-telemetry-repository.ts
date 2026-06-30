import type { ProjectTelemetrySnapshot } from "@/lib/integrations/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type TelemetryRow = {
  id: string;
  project_id: string;
  integration_id: string;
  temperature: number | null;
  humidity: number | null;
  setpoint: number | null;
  alarm_status: string | null;
  online_status: boolean;
  source_name: string | null;
  measured_at: string;
  project_integrations?: { name: string } | null;
};

function rowToSnapshot(row: TelemetryRow): ProjectTelemetrySnapshot {
  return {
    id: row.id,
    projectId: row.project_id,
    integrationId: row.integration_id,
    integrationName: row.project_integrations?.name ?? "Integracja",
    temperature: row.temperature != null ? Number(row.temperature) : null,
    humidity: row.humidity != null ? Number(row.humidity) : null,
    setpoint: row.setpoint != null ? Number(row.setpoint) : null,
    alarmStatus: row.alarm_status,
    onlineStatus: row.online_status,
    sourceName: row.source_name,
    measuredAt: row.measured_at,
  };
}

export async function insertProjectTelemetry(input: {
  projectId: string;
  integrationId: string;
  temperature?: number | null;
  humidity?: number | null;
  setpoint?: number | null;
  alarmStatus?: string | null;
  onlineStatus: boolean;
  sourceName?: string | null;
  measuredAt?: string;
  rawPayloadJson?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_telemetry")
    .insert({
      id: crypto.randomUUID(),
      project_id: input.projectId,
      integration_id: input.integrationId,
      temperature: input.temperature ?? null,
      humidity: input.humidity ?? null,
      setpoint: input.setpoint ?? null,
      alarm_status: input.alarmStatus ?? null,
      online_status: input.onlineStatus,
      source_name: input.sourceName ?? null,
      measured_at: input.measuredAt ?? now,
      raw_payload_json: input.rawPayloadJson ?? {},
      created_at: now,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id as string;
}

export async function listLatestTelemetryForProject(
  projectId: string,
): Promise<ProjectTelemetrySnapshot[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_telemetry")
    .select(
      "id, project_id, integration_id, temperature, humidity, setpoint, alarm_status, online_status, source_name, measured_at, project_integrations(name)",
    )
    .eq("project_id", projectId)
    .order("measured_at", { ascending: false })
    .limit(100);

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  const latestByIntegration = new Map<string, TelemetryRow>();
  for (const row of data ?? []) {
    const typed = row as TelemetryRow;
    if (!latestByIntegration.has(typed.integration_id)) {
      latestByIntegration.set(typed.integration_id, typed);
    }
  }

  return Array.from(latestByIntegration.values()).map(rowToSnapshot);
}

export async function listLatestTelemetryForProjects(
  projectIds: string[],
): Promise<ProjectTelemetrySnapshot[]> {
  if (projectIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_telemetry")
    .select(
      "id, project_id, integration_id, temperature, humidity, setpoint, alarm_status, online_status, source_name, measured_at, project_integrations(name)",
    )
    .in("project_id", projectIds)
    .order("measured_at", { ascending: false })
    .limit(Math.max(projectIds.length * 10, 50));

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  const latestByIntegration = new Map<string, TelemetryRow>();
  for (const row of data ?? []) {
    const typed = row as TelemetryRow;
    if (!latestByIntegration.has(typed.integration_id)) {
      latestByIntegration.set(typed.integration_id, typed);
    }
  }

  return Array.from(latestByIntegration.values()).map(rowToSnapshot);
}

export function groupTelemetryByProject(snapshots: ProjectTelemetrySnapshot[]) {
  const map = new Map<string, ProjectTelemetrySnapshot[]>();
  for (const snapshot of snapshots) {
    const list = map.get(snapshot.projectId) ?? [];
    list.push(snapshot);
    map.set(snapshot.projectId, list);
  }
  return map;
}
