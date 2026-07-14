import type { IntegrationVariableTelemetry } from "@/lib/integrations/integration-variable-types";
import { listLatestTelemetryForVariables } from "@/lib/supabase/project-integration-variables-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatMappedValue, minutesSince, resolveVizStoreStatus } from "@/lib/viz/store-status";
import type { VizAlarmEvaluation } from "@/lib/viz/project-contact-types";
import {
  evaluateProjectAlarmRules,
  fetchActiveWorkProjectIds,
  listVizAlarmRules,
} from "@/lib/viz/viz-alarm-rules-server";
import type { VizDataQuality, VizVariableMapping } from "@/lib/viz/types";
import { listVizDashboardProjects, listVizVariableMappings } from "@/lib/supabase/viz-server";

type MappingRow = VizVariableMapping & {
  integrationVariableId: string | null;
};

function resolveDataQuality(
  mapping: MappingRow,
  telemetry: IntegrationVariableTelemetry | undefined,
): VizDataQuality {
  if (!mapping.integrationVariableId) {
    return "unconfigured";
  }
  if (!telemetry) {
    return "no_communication";
  }
  if (!telemetry.onlineStatus) {
    return "no_communication";
  }
  const staleMinutes = minutesSince(telemetry.measuredAt);
  if (staleMinutes != null && staleMinutes > 15) {
    return "stale";
  }
  return "valid";
}

function applyMappingTransform(
  mapping: MappingRow,
  telemetry: IntegrationVariableTelemetry | undefined,
) {
  const numeric = telemetry?.numericValue ?? null;
  const text = telemetry?.textValue ?? null;
  const transformedNumeric =
    numeric != null ? numeric * mapping.multiplier + mapping.offsetValue : null;

  return {
    numericValue: transformedNumeric,
    textValue: text,
    displayValue: formatMappedValue(transformedNumeric, text, {
      unit: mapping.unit,
      decimalPlaces: mapping.decimalPlaces,
    }),
  };
}

export async function refreshVizDashboardTelemetry(dashboardId: string) {
  const [projects, mappings] = await Promise.all([
    listVizDashboardProjects(dashboardId),
    listVizVariableMappings(dashboardId),
  ]);

  const variableIds = [
    ...new Set(
      mappings.map((m) => m.integrationVariableId).filter(Boolean) as string[],
    ),
  ];

  const telemetryList = await listLatestTelemetryForVariables(variableIds);
  const telemetryByVariable = new Map(telemetryList.map((entry) => [entry.variableId, entry]));

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  for (const mapping of mappings) {
    const telemetry = mapping.integrationVariableId
      ? telemetryByVariable.get(mapping.integrationVariableId)
      : undefined;
    const dataQuality = resolveDataQuality(mapping as MappingRow, telemetry);
    const transformed = applyMappingTransform(mapping as MappingRow, telemetry);

    await supabase.from("viz_variable_current_values").upsert(
      {
        dashboard_id: dashboardId,
        project_id: mapping.projectId,
        mapping_id: mapping.id,
        integration_variable_id: mapping.integrationVariableId,
        role_code: mapping.roleCode,
        numeric_value: transformed.numericValue,
        text_value: transformed.textValue,
        display_value: transformed.displayValue,
        unit: mapping.unit,
        data_quality: dataQuality,
        measured_at: telemetry?.measuredAt ?? null,
        last_successful_read_at: telemetry?.onlineStatus ? telemetry.measuredAt : null,
        raw_payload_json: {},
        updated_at: now,
      },
      { onConflict: "mapping_id" },
    );

    if (telemetry?.measuredAt) {
      await supabase.from("viz_variable_readings_history").insert({
        dashboard_id: dashboardId,
        project_id: mapping.projectId,
        mapping_id: mapping.id,
        integration_variable_id: mapping.integrationVariableId,
        role_code: mapping.roleCode,
        numeric_value: transformed.numericValue,
        text_value: transformed.textValue,
        data_quality: dataQuality,
        measured_at: telemetry.measuredAt,
        raw_payload_json: {},
      });
    }
  }

  return { projects: projects.length, mappings: mappings.length, variables: variableIds.length };
}

export type VizStoreLiveSnapshot = {
  projectId: string;
  clientId: string | null;
  displayName: string | null;
  projectName: string | null;
  clientAddress: string | null;
  latOverride: number | null;
  lngOverride: number | null;
  status: ReturnType<typeof resolveVizStoreStatus>;
  roles: Record<
    string,
    {
      displayValue: string;
      dataQuality: VizDataQuality;
      measuredAt: string | null;
      numericValue: number | null;
    }
  >;
  openServiceRequests: number;
  lastReadAt: string | null;
  workInProgress: boolean;
  activeAlarms: VizAlarmEvaluation[];
};

export async function getVizDashboardLiveSnapshots(dashboardId: string) {
  await refreshVizDashboardTelemetry(dashboardId);

  const [projects, mappings, alarmRules] = await Promise.all([
    listVizDashboardProjects(dashboardId),
    listVizVariableMappings(dashboardId),
    listVizAlarmRules(dashboardId),
  ]);

  const supabase = getSupabaseAdmin();
  const { data: currentValues } = await supabase
    .from("viz_variable_current_values")
    .select("*")
    .eq("dashboard_id", dashboardId);

  const valuesByMapping = new Map((currentValues ?? []).map((row) => [row.mapping_id as string, row]));

  const projectIds = projects.map((p) => p.projectId);
  const workInProgressProjectIds = await fetchActiveWorkProjectIds(projectIds);
  const { data: serviceIntakes } = projectIds.length
    ? await supabase
        .from("service_intake_requests")
        .select("project_id, status")
        .in("project_id", projectIds)
        .in("status", ["new", "in_review"])
    : { data: [] };

  const openRequestsByProject = new Map<string, number>();
  for (const row of serviceIntakes ?? []) {
    const projectId = row.project_id as string;
    openRequestsByProject.set(projectId, (openRequestsByProject.get(projectId) ?? 0) + 1);
  }

  const mappingsByProject = new Map<string, VizVariableMapping[]>();
  for (const mapping of mappings) {
    const list = mappingsByProject.get(mapping.projectId) ?? [];
    list.push(mapping);
    mappingsByProject.set(mapping.projectId, list);
  }

  const snapshots: VizStoreLiveSnapshot[] = projects
    .filter((project) => project.isActiveInDashboard)
    .map((project) => {
      const projectMappings = mappingsByProject.get(project.projectId) ?? [];
      const roles: VizStoreLiveSnapshot["roles"] = {};
      let lastReadAt: string | null = null;
      let miniserverOnline: boolean | null = null;
      let worstQuality: VizDataQuality | null = null;

      for (const mapping of projectMappings) {
        const current = valuesByMapping.get(mapping.id);
        const measuredAt = (current?.measured_at as string | null) ?? null;
        if (measuredAt && (!lastReadAt || measuredAt > lastReadAt)) {
          lastReadAt = measuredAt;
        }

        const dataQuality = (current?.data_quality as VizDataQuality) ?? "unconfigured";
        if (
          !worstQuality ||
          dataQuality === "no_communication" ||
          dataQuality === "unconfigured"
        ) {
          worstQuality = dataQuality;
        }

        if (mapping.roleCode === "miniserver_online" || mapping.roleCode === "communication_status") {
          const numeric = current?.numeric_value != null ? Number(current.numeric_value) : null;
          if (numeric != null) {
            miniserverOnline = numeric > 0;
          } else if (dataQuality === "valid") {
            miniserverOnline = true;
          }
        }

        roles[mapping.roleCode] = {
          displayValue: (current?.display_value as string) ?? "—",
          dataQuality,
          measuredAt,
          numericValue: current?.numeric_value != null ? Number(current.numeric_value) : null,
        };
      }

      const openServiceRequests = openRequestsByProject.get(project.projectId) ?? 0;
      const telemetryAlarmCount = roles.active_alarm_count?.numericValue ?? null;
      const systemErrorCount = roles.system_error_count?.numericValue ?? null;

      const roleNumericValues = Object.fromEntries(
        Object.entries(roles).map(([roleCode, role]) => [roleCode, role.numericValue]),
      ) as Record<string, number | null | undefined>;

      const activeAlarms = evaluateProjectAlarmRules({
        rules: alarmRules,
        projectId: project.projectId,
        roleValues: roleNumericValues,
      });

      const hasRuleAlarm = activeAlarms.some((item) => item.severity === "alarm");
      const hasRuleWarning = activeAlarms.some((item) => item.severity === "warning");
      const effectiveAlarmCount = Math.max(
        telemetryAlarmCount ?? 0,
        hasRuleAlarm ? 1 : 0,
      );

      const status = resolveVizStoreStatus({
        hasMappings: projectMappings.some((m) => Boolean(m.integrationVariableId)),
        miniserverOnline,
        dataQuality: worstQuality,
        activeAlarmCount: effectiveAlarmCount,
        systemErrorCount,
        openServiceRequests,
        workInProgress: workInProgressProjectIds.has(project.projectId),
        staleMinutes: minutesSince(lastReadAt),
        externalWarning: hasRuleWarning && !hasRuleAlarm && (telemetryAlarmCount ?? 0) <= 0,
      });

      return {
        projectId: project.projectId,
        clientId: project.clientId,
        displayName: project.displayName,
        projectName: project.projectName,
        clientAddress: project.clientAddress,
        latOverride: project.latOverride,
        lngOverride: project.lngOverride,
        status,
        roles,
        openServiceRequests,
        lastReadAt,
        workInProgress: workInProgressProjectIds.has(project.projectId),
        activeAlarms,
      };
    });

  const onlineCount = snapshots.filter((s) => s.status.code === "ok").length;
  const offlineCount = snapshots.filter((s) => s.status.code === "no_communication").length;
  const alarmCount = snapshots.filter((s) => s.status.code === "alarm").length;

  const temperatureValues = snapshots
    .map((s) => s.roles.store_temperature?.numericValue)
    .filter((value): value is number => value != null);

  const avgTemperature =
    temperatureValues.length > 0
      ? temperatureValues.reduce((sum, value) => sum + value, 0) / temperatureValues.length
      : null;

  return {
    snapshots,
    kpi: {
      storeCount: snapshots.length,
      onlineCount,
      offlineCount,
      alarmCount,
      openServiceRequests: snapshots.reduce((sum, s) => sum + s.openServiceRequests, 0),
      avgTemperature,
    },
  };
}
