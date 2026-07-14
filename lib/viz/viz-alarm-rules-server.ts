import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { VizAlarmRuleRow } from "@/lib/supabase/database.types";
import { evaluateAlarmCondition } from "@/lib/viz/alarm-rules";
import type {
  VizAlarmEvaluation,
  VizAlarmRule,
  VizAlarmRuleInput,
} from "@/lib/viz/project-contact-types";

type AlarmRuleRow = VizAlarmRuleRow;

function rowToAlarmRule(row: AlarmRuleRow): VizAlarmRule {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    projectId: row.project_id,
    roleCode: row.role_code,
    condition: row.condition as VizAlarmRule["condition"],
    thresholdNumeric: Number(row.threshold_numeric),
    severity: row.severity as VizAlarmRule["severity"],
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listVizAlarmRules(dashboardId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_alarm_rules")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .order("sort_order")
    .order("name");

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToAlarmRule(row as AlarmRuleRow));
}

export async function createVizAlarmRule(dashboardId: string, input: VizAlarmRuleInput) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_alarm_rules")
    .insert({
      dashboard_id: dashboardId,
      project_id: input.projectId ?? null,
      role_code: input.roleCode,
      condition: input.condition ?? "gt",
      threshold_numeric: input.thresholdNumeric,
      severity: input.severity ?? "alarm",
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToAlarmRule(data as AlarmRuleRow);
}

export async function deleteVizAlarmRule(ruleId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("viz_alarm_rules").delete().eq("id", ruleId);
  if (error) {
    throw new Error(error.message);
  }
}

export function evaluateProjectAlarmRules(input: {
  rules: VizAlarmRule[];
  projectId: string;
  roleValues: Record<string, number | null | undefined>;
}): VizAlarmEvaluation[] {
  const evaluations: VizAlarmEvaluation[] = [];

  for (const rule of input.rules) {
    if (!rule.isActive) {
      continue;
    }
    if (rule.projectId && rule.projectId !== input.projectId) {
      continue;
    }

    const numericValue = input.roleValues[rule.roleCode];
    if (numericValue == null || Number.isNaN(numericValue)) {
      continue;
    }

    if (
      evaluateAlarmCondition(numericValue, rule.thresholdNumeric, rule.condition)
    ) {
      evaluations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        roleCode: rule.roleCode,
        numericValue,
        thresholdNumeric: rule.thresholdNumeric,
        condition: rule.condition,
      });
    }
  }

  return evaluations;
}

export async function fetchActiveWorkProjectIds(projectIds: string[]) {
  if (!projectIds.length) {
    return new Set<string>();
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("resource_plan_items")
    .select("project_id")
    .in("project_id", projectIds)
    .lte("start_at", now)
    .gte("end_at", now);

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return new Set<string>();
    }
    throw new Error(error.message);
  }

  return new Set(
    (data ?? [])
      .map((row) => row.project_id as string | null)
      .filter((projectId): projectId is string => Boolean(projectId)),
  );
}
