import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { VizAlarmAcknowledgementRow } from "@/lib/supabase/database.types";
import {
  evaluateProjectAlarmRules,
  listVizAlarmRules,
} from "@/lib/viz/viz-alarm-rules-server";
import type { VizAlarmAcknowledgement } from "@/lib/viz/project-contact-types";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

function rowToAcknowledgement(row: VizAlarmAcknowledgementRow): VizAlarmAcknowledgement {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    projectId: row.project_id,
    ruleId: row.rule_id,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at,
    note: row.note,
  };
}

function alarmKey(projectId: string, ruleId: string) {
  return `${projectId}:${ruleId}`;
}

export async function listVizAlarmAcknowledgements(dashboardId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_alarm_acknowledgements")
    .select("*")
    .eq("dashboard_id", dashboardId);

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToAcknowledgement(row as VizAlarmAcknowledgementRow));
}

export async function pruneStaleVizAlarmAcknowledgements(
  dashboardId: string,
  snapshots: VizStoreLiveSnapshot[],
) {
  const activeKeys = new Set<string>();
  for (const snapshot of snapshots) {
    for (const alarm of snapshot.activeAlarms) {
      activeKeys.add(alarmKey(snapshot.projectId, alarm.ruleId));
    }
  }

  const acknowledgements = await listVizAlarmAcknowledgements(dashboardId);
  const staleIds = acknowledgements
    .filter((item) => !activeKeys.has(alarmKey(item.projectId, item.ruleId)))
    .map((item) => item.id);

  if (!staleIds.length) {
    return acknowledgements.filter((item) => activeKeys.has(alarmKey(item.projectId, item.ruleId)));
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("viz_alarm_acknowledgements").delete().in("id", staleIds);
  if (error) {
    throw new Error(error.message);
  }

  return acknowledgements.filter((item) => activeKeys.has(alarmKey(item.projectId, item.ruleId)));
}

export function attachAlarmAcknowledgements(
  snapshots: VizStoreLiveSnapshot[],
  acknowledgements: VizAlarmAcknowledgement[],
): VizStoreLiveSnapshot[] {
  const ackByKey = new Map(
    acknowledgements.map((item) => [alarmKey(item.projectId, item.ruleId), item]),
  );

  return snapshots.map((snapshot) => ({
    ...snapshot,
    activeAlarms: snapshot.activeAlarms.map((alarm) => {
      const acknowledgement = ackByKey.get(alarmKey(snapshot.projectId, alarm.ruleId)) ?? null;
      return acknowledgement ? { ...alarm, acknowledgement } : alarm;
    }),
  }));
}

export async function acknowledgeVizAlarms(input: {
  dashboardId: string;
  userId: string;
  items: Array<{ projectId: string; ruleId: string }>;
  note?: string | null;
}) {
  if (!input.items.length) {
    return [];
  }

  const [rules, roleValuesByProject] = await Promise.all([
    listVizAlarmRules(input.dashboardId),
    fetchRoleValuesByProject(input.dashboardId, input.items.map((item) => item.projectId)),
  ]);

  const validItems = input.items.filter((item) => {
    const roleValues = roleValuesByProject.get(item.projectId) ?? {};
    const activeAlarms = evaluateProjectAlarmRules({
      rules,
      projectId: item.projectId,
      roleValues,
    });
    return activeAlarms.some((alarm) => alarm.ruleId === item.ruleId);
  });

  if (!validItems.length) {
    throw new Error("Brak aktywnych alarmów do potwierdzenia.");
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const rows = validItems.map((item) => ({
    dashboard_id: input.dashboardId,
    project_id: item.projectId,
    rule_id: item.ruleId,
    acknowledged_by: input.userId,
    acknowledged_at: now,
    note: input.note?.trim() || null,
  }));

  const { data, error } = await supabase
    .from("viz_alarm_acknowledgements")
    .upsert(rows, { onConflict: "dashboard_id,project_id,rule_id" })
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToAcknowledgement(row as VizAlarmAcknowledgementRow));
}

async function fetchRoleValuesByProject(dashboardId: string, projectIds: string[]) {
  const uniqueProjectIds = [...new Set(projectIds)];
  if (!uniqueProjectIds.length) {
    return new Map<string, Record<string, number | null>>();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_variable_current_values")
    .select("project_id, role_code, numeric_value")
    .eq("dashboard_id", dashboardId)
    .in("project_id", uniqueProjectIds);

  if (error) {
    throw new Error(error.message);
  }

  const result = new Map<string, Record<string, number | null>>();
  for (const row of data ?? []) {
    const projectId = row.project_id as string;
    const roleCode = row.role_code as string;
    const numericValue = row.numeric_value != null ? Number(row.numeric_value) : null;
    const roleValues = result.get(projectId) ?? {};
    roleValues[roleCode] = numericValue;
    result.set(projectId, roleValues);
  }

  return result;
}
