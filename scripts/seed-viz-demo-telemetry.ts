/**
 * Zasilenie przykładową telemetrią historyczną dla modułu Wizualizacje.
 *
 * Uruchom:
 *   npm run seed:viz-demo -- --dry-run
 *   npm run seed:viz-demo -- --yes
 *   npm run seed:viz-demo -- --yes --project "Respondek Dominik"
 *
 * Wymaga w .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { getSupabaseAdmin } from "../lib/supabase/admin";
import { formatMappedValue } from "../lib/viz/store-status";

const DEFAULT_PROJECT_QUERY = "Respondek Dominik";
const HISTORY_HOURS = 7 * 24;
const SAMPLE_EVERY_HOURS = 1;

type MappingRow = {
  id: string;
  dashboard_id: string;
  project_id: string;
  integration_id: string | null;
  integration_variable_id: string | null;
  role_code: string;
  unit: string | null;
  decimal_places: number;
  multiplier: number;
  offset_value: number;
};

type RoleProfile = {
  base: number;
  amplitude: number;
  noise: number;
  online?: boolean;
};

const ROLE_PROFILES: Record<string, RoleProfile> = {
  store_temperature: { base: 21.5, amplitude: 2.2, noise: 0.35 },
  store_setpoint: { base: 22, amplitude: 0.4, noise: 0.05 },
  active_alarm_count: { base: 0, amplitude: 0, noise: 0 },
  system_error_count: { base: 0, amplitude: 0, noise: 0 },
  miniserver_online: { base: 1, amplitude: 0, noise: 0, online: true },
  communication_status: { base: 1, amplitude: 0, noise: 0, online: true },
};

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function generateSeries(profile: RoleProfile, hourIndex: number, totalHours: number, decimals = 2) {
  const dayWave = Math.sin((hourIndex / totalHours) * Math.PI * 2);
  const nightCooling = hourIndex % 24 < 7 ? -0.8 : hourIndex % 24 > 20 ? -0.5 : 0.4;
  const raw = profile.base + profile.amplitude * dayWave + nightCooling;
  const noise = (Math.random() - 0.5) * profile.noise;
  return round(Math.max(0, raw + noise), decimals);
}

function resolveProfile(roleCode: string): RoleProfile {
  return (
    ROLE_PROFILES[roleCode] ?? {
      base: 10,
      amplitude: 1,
      noise: 0.2,
    }
  );
}

async function findProject(supabase: ReturnType<typeof getSupabaseAdmin>, query: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  if (data?.length) {
    return data;
  }

  const parts = query.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const [first, ...rest] = parts;
    const last = rest.join(" ");
    const { data: clients } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .ilike("first_name", `%${first}%`)
      .ilike("last_name", `%${last}%`);

    if (clients?.length) {
      const clientIds = clients.map((c) => c.id);
      const { data: clientProjects } = await supabase
        .from("projects")
        .select("id, name, client_id")
        .in("client_id", clientIds)
        .order("name");
      return clientProjects ?? [];
    }
  }

  return [];
}

const BOOTSTRAP_ROLES = ["store_temperature", "store_setpoint", "miniserver_online"] as const;

async function ensureBootstrapMappings(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  dashboardId: string,
  projectId: string,
  dryRun: boolean,
) {
  const { data: existing } = await supabase
    .from("viz_variable_mappings")
    .select("role_code, integration_id")
    .eq("dashboard_id", dashboardId)
    .eq("project_id", projectId);

  const existingRoles = new Set((existing ?? []).map((row) => row.role_code as string));
  const integrationId =
    (existing ?? []).find((row) => row.integration_id)?.integration_id ??
    (
      await supabase
        .from("project_integrations")
        .select("id")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .order("created_at")
        .limit(1)
        .maybeSingle()
    ).data?.id ??
    null;

  if (!integrationId) {
    console.log("Brak aktywnej integracji — pomijam bootstrap mapowań.");
    return;
  }

  for (const roleCode of BOOTSTRAP_ROLES) {
    if (existingRoles.has(roleCode)) {
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] utworzyłbym mapowanie roli: ${roleCode}`);
      continue;
    }

    const { error } = await supabase.from("viz_variable_mappings").insert({
      dashboard_id: dashboardId,
      project_id: projectId,
      integration_id: integrationId,
      role_code: roleCode,
      unit: roleCode === "store_temperature" ? "°C" : roleCode === "store_setpoint" ? "°C" : null,
      decimal_places: roleCode === "miniserver_online" ? 0 : 1,
    });

    if (error) {
      throw new Error(error.message);
    }
    console.log(`  Dodano mapowanie roli: ${roleCode}`);
  }
}

async function ensureDemoVariable(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  mapping: MappingRow,
  dryRun: boolean,
) {
  if (mapping.integration_variable_id) {
    return mapping.integration_variable_id;
  }

  if (!mapping.integration_id) {
    return null;
  }

  const sourceKey = `demo/${mapping.role_code}`;
  const { data: existing } = await supabase
    .from("project_integration_variables")
    .select("id")
    .eq("integration_id", mapping.integration_id)
    .eq("source_key", sourceKey)
    .maybeSingle();

  if (existing?.id) {
    if (!dryRun) {
      await supabase
        .from("viz_variable_mappings")
        .update({ integration_variable_id: existing.id })
        .eq("id", mapping.id);
    }
    return existing.id as string;
  }

  if (dryRun) {
    console.log(`  [dry-run] utworzyłbym zmienną demo: ${sourceKey}`);
    return "dry-run-variable-id";
  }

  const { data, error } = await supabase
    .from("project_integration_variables")
    .insert({
      integration_id: mapping.integration_id,
      project_id: mapping.project_id,
      name: `Demo ${mapping.role_code}`,
      source_key: sourceKey,
      location_label: "Seed demo",
      value_kind: "numeric",
      sort_order: 99,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("viz_variable_mappings")
    .update({ integration_variable_id: data.id, source_key: sourceKey })
    .eq("id", mapping.id);

  return data.id as string;
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  const assumeYes = hasFlag("--yes");
  const projectQuery = getArgValue("--project") ?? DEFAULT_PROJECT_QUERY;

  if (!dryRun && !assumeYes) {
    console.error(
      [
        "To polecenie wstawi przykładową telemetrię (project_telemetry + viz_variable_readings_history).",
        "",
        "Podgląd:",
        "  npm run seed:viz-demo -- --dry-run",
        "",
        "Wykonanie:",
        '  npm run seed:viz-demo -- --yes --project "Respondek Dominik" --bootstrap',
      ].join("\n"),
    );
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();
  const projects = await findProject(supabase, projectQuery);

  if (!projects.length) {
    console.error(`Nie znaleziono projektu pasującego do: "${projectQuery}"`);
    process.exit(1);
  }

  let project = projects[0];
  if (projects.length > 1) {
    const { data: onDashboard } = await supabase
      .from("viz_dashboard_projects")
      .select("project_id")
      .in(
        "project_id",
        projects.map((p) => p.id),
      )
      .eq("is_active_in_dashboard", true)
      .limit(1)
      .maybeSingle();

    if (onDashboard?.project_id) {
      project = projects.find((p) => p.id === onDashboard.project_id) ?? projects[0];
    }

    console.log("Znaleziono wiele projektów — używam:");
    for (const item of projects) {
      const mark = item.id === project.id ? "→" : " ";
      console.log(` ${mark} ${item.name} (${item.id})`);
    }
  }

  console.log(`Projekt: ${project.name} (${project.id})`);

  const { data: dashboardProjects, error: dpError } = await supabase
    .from("viz_dashboard_projects")
    .select("dashboard_id, display_name")
    .eq("project_id", project.id)
    .eq("is_active_in_dashboard", true);

  if (dpError) {
    throw new Error(dpError.message);
  }

  if (!dashboardProjects?.length) {
    console.error("Projekt nie jest przypisany do żadnego dashboardu Wizualizacje.");
    process.exit(1);
  }

  const dashboardId = dashboardProjects[0].dashboard_id as string;
  console.log(`Dashboard: ${dashboardId}`);

  if (hasFlag("--bootstrap")) {
    console.log("Bootstrap mapowań (store_temperature, store_setpoint, miniserver_online)…");
    await ensureBootstrapMappings(supabase, dashboardId, project.id, dryRun);
  }

  const { data: mappings, error: mapError } = await supabase
    .from("viz_variable_mappings")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .eq("project_id", project.id);

  if (mapError) {
    throw new Error(mapError.message);
  }

  const mappingRows = (mappings ?? []) as MappingRow[];
  if (!mappingRows.length) {
    console.error("Brak mapowań viz_variable_mappings dla tego projektu w dashboardzie.");
    console.error("Najpierw skonfiguruj mapowania w /wizualizacje/.../projekty");
    process.exit(1);
  }

  console.log(`Mapowania: ${mappingRows.length}`);

  let telemetryRows = 0;
  let historyRows = 0;

  for (const mapping of mappingRows) {
    const profile = resolveProfile(mapping.role_code);
    const variableId = await ensureDemoVariable(supabase, mapping, dryRun);

    const historyBatch: Array<Record<string, unknown>> = [];
    const now = Date.now();

    for (let hour = HISTORY_HOURS; hour >= 0; hour -= SAMPLE_EVERY_HOURS) {
      const measuredAt = new Date(now - hour * 60 * 60 * 1000).toISOString();
      const hourIndex = HISTORY_HOURS - hour;
      const numericValue = generateSeries(profile, hourIndex, HISTORY_HOURS, mapping.decimal_places ?? 2);
      const displayValue = formatMappedValue(numericValue, null, {
        unit: mapping.unit,
        decimalPlaces: mapping.decimal_places,
      });

      historyBatch.push({
        dashboard_id: dashboardId,
        project_id: project.id,
        mapping_id: mapping.id,
        integration_variable_id: variableId,
        role_code: mapping.role_code,
        numeric_value: numericValue,
        text_value: null,
        data_quality: "valid",
        measured_at: measuredAt,
        raw_payload_json: { seeded: true, demo: true },
      });

      if (hour === 0 && mapping.integration_id && variableId && variableId !== "dry-run-variable-id") {
        telemetryRows += 1;
        if (!dryRun) {
          await supabase.from("project_telemetry").insert({
            project_id: project.id,
            integration_id: mapping.integration_id,
            integration_variable_id: variableId,
            numeric_value: numericValue,
            text_value: null,
            temperature: mapping.role_code === "store_temperature" ? numericValue : null,
            setpoint: mapping.role_code === "store_setpoint" ? numericValue : null,
            online_status: profile.online ?? true,
            source_name: `demo/${mapping.role_code}`,
            measured_at: measuredAt,
            raw_payload_json: { seeded: true, demo: true },
          });
        }
      }
    }

    historyRows += historyBatch.length;

    if (dryRun) {
      console.log(
        `  [dry-run] ${mapping.role_code}: ${historyBatch.length} punktów historii` +
          (variableId ? "" : " (bez project_telemetry — brak integracji)"),
      );
      continue;
    }

    if (historyBatch.length) {
      const { error: historyError } = await supabase
        .from("viz_variable_readings_history")
        .insert(historyBatch);
      if (historyError) {
        throw new Error(historyError.message);
      }
    }

    const latest = historyBatch[historyBatch.length - 1];
    if (latest) {
      await supabase.from("viz_variable_current_values").upsert(
        {
          dashboard_id: dashboardId,
          project_id: project.id,
          mapping_id: mapping.id,
          integration_variable_id: variableId,
          role_code: mapping.role_code,
          numeric_value: latest.numeric_value as number,
          text_value: null,
          display_value: formatMappedValue(latest.numeric_value as number, null, {
            unit: mapping.unit,
            decimalPlaces: mapping.decimal_places,
          }),
          unit: mapping.unit,
          data_quality: "valid",
          measured_at: latest.measured_at as string,
          last_successful_read_at: latest.measured_at as string,
          raw_payload_json: { seeded: true, demo: true },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "mapping_id" },
      );
    }
  }

  console.log(
    dryRun
      ? "Podgląd zakończony (bez zapisu)."
      : `Gotowe. Wstawiono ~${historyRows} punktów historii i ${telemetryRows} odczytów project_telemetry.`,
  );
  console.log("Odśwież Command Center i wykresy w module Wizualizacje.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
