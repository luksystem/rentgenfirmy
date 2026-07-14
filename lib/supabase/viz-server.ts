import { getUserDisplayName } from "@/lib/auth/types";
import { buildClientAddressLine } from "@/lib/dashboard/google-maps";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { VizDashboardRow } from "@/lib/supabase/database.types";
import {
  rowToVizDashboard,
  rowToVizDashboardAccess,
  rowToVizDashboardProject,
  rowToVizDashboardTemplate,
  rowToVizIntegratedSystem,
  rowToVizProjectSystemStatus,
  rowToVizVariableMapping,
  rowToVizVariableRole,
} from "@/lib/supabase/viz-mappers";
import {
  DEFAULT_VIZ_PERMISSIONS_BY_ROLE,
  type VizDashboardAccessInput,
  type VizDashboardInput,
  type VizDashboardProjectInput,
  type VizProjectSystemStatusInput,
  type VizVariableMappingInput,
} from "@/lib/viz/types";

async function resolveActorName(userId: string | null, fallback: string) {
  if (!userId) {
    return fallback;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  return getUserDisplayName(mapProfileRow(data));
}

export async function listVizDashboardTemplates() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_dashboard_templates")
    .select("*")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToVizDashboardTemplate);
}

export async function listVizDashboards(options?: { dashboardIds?: string[] | null }) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("viz_dashboards").select("*").order("updated_at", { ascending: false });

  if (options?.dashboardIds) {
    if (!options.dashboardIds.length) {
      return [];
    }
    query = query.in("id", options.dashboardIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (!rows.length) {
    return [];
  }

  const clientIds = [...new Set(rows.map((r) => r.client_id).filter(Boolean))] as string[];
  const templateSlugs = [...new Set(rows.map((r) => r.template_slug).filter(Boolean))] as string[];
  const dashboardIds = rows.map((r) => r.id);

  const [clientsRes, templatesRes, projectCountsRes] = await Promise.all([
    clientIds.length
      ? supabase.from("clients").select("id, first_name, last_name, location").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    templateSlugs.length
      ? supabase.from("viz_dashboard_templates").select("slug, name").in("slug", templateSlugs)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("viz_dashboard_projects").select("dashboard_id").in("dashboard_id", dashboardIds),
  ]);

  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (templatesRes.error) throw new Error(templatesRes.error.message);
  if (projectCountsRes.error) throw new Error(projectCountsRes.error.message);

  const clientNameById = new Map(
    (clientsRes.data ?? []).map((c) => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || c.location || null,
    ]),
  );
  const templateNameBySlug = new Map((templatesRes.data ?? []).map((t) => [t.slug, t.name]));
  const projectCountByDashboard = new Map<string, number>();
  for (const row of projectCountsRes.data ?? []) {
    projectCountByDashboard.set(
      row.dashboard_id,
      (projectCountByDashboard.get(row.dashboard_id) ?? 0) + 1,
    );
  }

  return rows.map((row) =>
    rowToVizDashboard(row, {
      clientName: row.client_id ? (clientNameById.get(row.client_id) ?? null) : null,
      templateName: row.template_slug ? (templateNameBySlug.get(row.template_slug) ?? null) : null,
      projectCount: projectCountByDashboard.get(row.id) ?? 0,
    }),
  );
}

export async function getVizDashboardById(dashboardId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_dashboards")
    .select("*")
    .eq("id", dashboardId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const [templateRes, clientRes, countRes] = await Promise.all([
    data.template_slug
      ? supabase
          .from("viz_dashboard_templates")
          .select("name")
          .eq("slug", data.template_slug)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    data.client_id
      ? supabase.from("clients").select("first_name, last_name, location").eq("id", data.client_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("viz_dashboard_projects")
      .select("id", { count: "exact", head: true })
      .eq("dashboard_id", dashboardId),
  ]);

  const clientName = clientRes.data
    ? [clientRes.data.first_name, clientRes.data.last_name].filter(Boolean).join(" ").trim() ||
      clientRes.data.location ||
      null
    : null;

  return rowToVizDashboard(data, {
    templateName: templateRes.data?.name ?? null,
    clientName,
    projectCount: countRes.count ?? 0,
  });
}

export async function createVizDashboard(
  input: VizDashboardInput,
  actor: { userId: string | null; userName: string },
) {
  const supabase = getSupabaseAdmin();
  const actorName = await resolveActorName(actor.userId, actor.userName);

  let layoutJson = input.layoutJson ?? {};
  if (input.templateSlug && !input.layoutJson) {
    const { data: template } = await supabase
      .from("viz_dashboard_templates")
      .select("default_layout_json")
      .eq("slug", input.templateSlug)
      .maybeSingle();
    if (template?.default_layout_json && typeof template.default_layout_json === "object") {
      layoutJson = template.default_layout_json as Record<string, unknown>;
    }
  }

  const { data, error } = await supabase
    .from("viz_dashboards")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      template_slug: input.templateSlug ?? null,
      client_id: input.clientId ?? null,
      status: input.status ?? "draft",
      layout_json: layoutJson,
      settings_json: input.settingsJson ?? {},
      created_by_user_id: actor.userId,
      created_by_name: actorName,
      updated_by_name: actorName,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (actor.userId) {
    await supabase.from("viz_dashboard_access").upsert(
      {
        dashboard_id: data.id,
        profile_id: actor.userId,
        access_role: "admin",
        permissions_json: {},
      },
      { onConflict: "dashboard_id,profile_id" },
    );
  }

  return rowToVizDashboard(data);
}

export async function updateVizDashboard(
  dashboardId: string,
  input: Partial<VizDashboardInput>,
  actor: { userId: string | null; userName: string },
) {
  const supabase = getSupabaseAdmin();
  const actorName = await resolveActorName(actor.userId, actor.userName);

  const payload: Partial<VizDashboardRow> = {
    updated_by_user_id: actor.userId,
    updated_by_name: actorName,
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.templateSlug !== undefined) payload.template_slug = input.templateSlug;
  if (input.clientId !== undefined) payload.client_id = input.clientId;
  if (input.status !== undefined) payload.status = input.status;
  if (input.layoutJson !== undefined) payload.layout_json = input.layoutJson;
  if (input.settingsJson !== undefined) payload.settings_json = input.settingsJson;

  const { data, error } = await supabase
    .from("viz_dashboards")
    .update(payload)
    .eq("id", dashboardId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToVizDashboard(data);
}

export async function deleteVizDashboard(dashboardId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("viz_dashboards").delete().eq("id", dashboardId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listVizDashboardProjects(dashboardId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_dashboard_projects")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .order("sort_order")
    .order("display_name");

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (!rows.length) {
    return [];
  }

  const projectIds = rows.map((r) => r.project_id);
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .in("id", projectIds);

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  const clientIds = [...new Set((projects ?? []).map((p) => p.client_id).filter(Boolean))] as string[];
  const { data: clients, error: clientsError } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, first_name, last_name, location, address_street, address_city, address_postal_code")
        .in("id", clientIds)
    : { data: [], error: null };

  if (clientsError) {
    throw new Error(clientsError.message);
  }

  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));
  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));

  return rows.map((row) => {
    const project = projectById.get(row.project_id);
    const client = project?.client_id ? clientById.get(project.client_id) : undefined;
    const clientName = client
      ? [client.first_name, client.last_name].filter(Boolean).join(" ").trim() || client.location || null
      : null;

    return rowToVizDashboardProject(row, {
      projectName: project?.name ?? null,
      clientId: project?.client_id ?? null,
      clientName,
      clientAddress: client
        ? buildClientAddressLine({
            location: client.location,
            addressStreet: client.address_street,
            addressCity: client.address_city,
            addressPostalCode: client.address_postal_code,
          })
        : null,
    });
  });
}

export async function upsertVizDashboardProjects(
  dashboardId: string,
  projects: VizDashboardProjectInput[],
) {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: existingError } = await supabase
    .from("viz_dashboard_projects")
    .select("id, project_id")
    .eq("dashboard_id", dashboardId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const incomingIds = new Set(projects.map((p) => p.projectId));
  const toDelete = (existing ?? []).filter((e) => !incomingIds.has(e.project_id)).map((e) => e.id);

  if (toDelete.length) {
    const { error: deleteError } = await supabase
      .from("viz_dashboard_projects")
      .delete()
      .in("id", toDelete);
    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  for (const [index, project] of projects.entries()) {
    const payload = {
      dashboard_id: dashboardId,
      project_id: project.projectId,
      display_name: project.displayName?.trim() || null,
      bms_commissioned_at: project.bmsCommissionedAt ?? null,
      is_active_in_dashboard: project.isActiveInDashboard ?? true,
      sort_order: project.sortOrder ?? index,
      lat_override: project.latOverride ?? null,
      lng_override: project.lngOverride ?? null,
      service_contract_status: project.serviceContractStatus ?? "none",
      metadata_json: project.metadataJson ?? {},
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("viz_dashboard_projects")
      .upsert(payload, { onConflict: "dashboard_id,project_id" });

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  return listVizDashboardProjects(dashboardId);
}

export async function listVizIntegratedSystems() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_integrated_systems")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToVizIntegratedSystem);
}

export async function listVizVariableRoles() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_variable_roles")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToVizVariableRole);
}

export async function listVizVariableMappings(dashboardId: string, projectId?: string) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("viz_variable_mappings").select("*").eq("dashboard_id", dashboardId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query.order("role_code");
  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (!rows.length) {
    return [];
  }

  const roleCodes = [...new Set(rows.map((r) => r.role_code))];
  const integrationIds = [...new Set(rows.map((r) => r.integration_id).filter(Boolean))] as string[];
  const variableIds = [
    ...new Set(rows.map((r) => r.integration_variable_id).filter(Boolean)),
  ] as string[];

  const [rolesRes, integrationsRes, variablesRes] = await Promise.all([
    supabase.from("viz_variable_roles").select("code, name").in("code", roleCodes),
    integrationIds.length
      ? supabase.from("project_integrations").select("id, name").in("id", integrationIds)
      : Promise.resolve({ data: [], error: null }),
    variableIds.length
      ? supabase
          .from("project_integration_variables")
          .select("id, name, source_key, integration_id")
          .in("id", variableIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const roleNameByCode = new Map((rolesRes.data ?? []).map((r) => [r.code, r.name]));
  const integrationNameById = new Map((integrationsRes.data ?? []).map((i) => [i.id, i.name]));
  const variableById = new Map(
    (variablesRes.data ?? []).map((v) => [
      v.id,
      {
        name: v.name as string,
        sourceKey: v.source_key as string,
        integrationId: v.integration_id as string,
      },
    ]),
  );

  return rows.map((row) => {
    const variable = row.integration_variable_id
      ? variableById.get(row.integration_variable_id)
      : undefined;
    return rowToVizVariableMapping(row, {
      roleName: roleNameByCode.get(row.role_code) ?? null,
      integrationName: row.integration_id
        ? (integrationNameById.get(row.integration_id) ?? null)
        : variable
          ? (integrationNameById.get(variable.integrationId) ?? null)
          : null,
      variableName: variable?.name ?? null,
      variableSourceKey: variable?.sourceKey ?? null,
    });
  });
}

export async function upsertVizVariableMapping(
  dashboardId: string,
  input: VizVariableMappingInput,
) {
  const supabase = getSupabaseAdmin();

  let integrationId = input.integrationId ?? null;
  let sourceKey = input.sourceKey ?? null;

  if (input.integrationVariableId) {
    const { data: variable, error: variableError } = await supabase
      .from("project_integration_variables")
      .select("integration_id, source_key, project_id")
      .eq("id", input.integrationVariableId)
      .maybeSingle();

    if (variableError) {
      throw new Error(variableError.message);
    }
    if (!variable) {
      throw new Error("Nie znaleziono zmiennej integracji.");
    }
    if (variable.project_id !== input.projectId) {
      throw new Error("Zmienna nie należy do wskazanego projektu.");
    }

    integrationId = variable.integration_id as string;
    sourceKey = variable.source_key as string;
  }

  const payload = {
    dashboard_id: dashboardId,
    project_id: input.projectId,
    integration_id: integrationId,
    integration_variable_id: input.integrationVariableId ?? null,
    source_key: sourceKey,
    role_code: input.roleCode,
    display_name: input.displayName?.trim() || null,
    unit: input.unit ?? null,
    display_format: input.displayFormat ?? null,
    decimal_places: input.decimalPlaces ?? 1,
    multiplier: input.multiplier ?? 1,
    offset_value: input.offsetValue ?? 0,
    text_value_map: input.textValueMap ?? {},
    inverted: input.inverted ?? false,
    writable: input.writable ?? false,
    min_value: input.minValue ?? null,
    max_value: input.maxValue ?? null,
    collection_interval_seconds: input.collectionIntervalSeconds ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("viz_variable_mappings")
    .upsert(payload, { onConflict: "dashboard_id,project_id,role_code" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToVizVariableMapping(data);
}

export async function deleteVizVariableMapping(mappingId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("viz_variable_mappings").delete().eq("id", mappingId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listVizProjectSystemStatuses(dashboardId: string, projectId?: string) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("viz_project_system_status").select("*").eq("dashboard_id", dashboardId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;
  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (!rows.length) {
    return [];
  }

  const systemIds = [...new Set(rows.map((r) => r.system_id))];
  const { data: systems } = await supabase
    .from("viz_integrated_systems")
    .select("id, code, name")
    .in("id", systemIds);

  const systemById = new Map((systems ?? []).map((s) => [s.id, s]));

  return rows.map((row) => {
    const system = systemById.get(row.system_id);
    return rowToVizProjectSystemStatus(row, {
      systemCode: system?.code ?? "",
      systemName: system?.name ?? "",
    });
  });
}

export async function upsertVizProjectSystemStatus(
  dashboardId: string,
  input: VizProjectSystemStatusInput,
) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("viz_project_system_status")
    .upsert(
      {
        dashboard_id: dashboardId,
        project_id: input.projectId,
        system_id: input.systemId,
        status: input.status,
        integration_scope: input.integrationScope?.trim() || null,
        notes: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dashboard_id,project_id,system_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: system } = await supabase
    .from("viz_integrated_systems")
    .select("code, name")
    .eq("id", input.systemId)
    .maybeSingle();

  return rowToVizProjectSystemStatus(data, {
    systemCode: system?.code ?? "",
    systemName: system?.name ?? "",
  });
}

export async function listVizDashboardAccess(dashboardId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_dashboard_access")
    .select("*")
    .eq("dashboard_id", dashboardId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (!rows.length) {
    return [];
  }

  const profileIds = rows.map((r) => r.profile_id);
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", profileIds);

  const profileNameById = new Map(
    (profiles ?? []).map((p) => [p.id, getUserDisplayName(mapProfileRow(p))]),
  );

  return rows.map((row) =>
    rowToVizDashboardAccess(row, {
      profileName: profileNameById.get(row.profile_id) ?? null,
    }),
  );
}

export async function upsertVizDashboardAccess(
  dashboardId: string,
  input: VizDashboardAccessInput,
) {
  const supabase = getSupabaseAdmin();
  const permissionsJson =
    input.permissionsJson ?? DEFAULT_VIZ_PERMISSIONS_BY_ROLE[input.accessRole] ?? {};

  const { data, error } = await supabase
    .from("viz_dashboard_access")
    .upsert(
      {
        dashboard_id: dashboardId,
        profile_id: input.profileId,
        access_role: input.accessRole,
        permissions_json: permissionsJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dashboard_id,profile_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const profileName = await resolveActorName(input.profileId, "");
  return rowToVizDashboardAccess(data, { profileName: profileName || null });
}

export async function deleteVizDashboardAccess(accessId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("viz_dashboard_access").delete().eq("id", accessId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listProjectIntegrationsForViz(projectIds: string[]) {
  if (!projectIds.length) {
    return { integrations: [], variables: [] };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_integrations")
    .select("id, project_id, name, integration_type, is_active, config_json")
    .in("project_id", projectIds)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  const integrations = (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    integrationType: row.integration_type,
    isActive: row.is_active,
    virtualInputName:
      row.config_json &&
      typeof row.config_json === "object" &&
      !Array.isArray(row.config_json) &&
      "virtualInputName" in row.config_json
        ? String((row.config_json as { virtualInputName?: string }).virtualInputName ?? "")
        : null,
  }));

  const integrationIds = integrations.map((i) => i.id);
  const { data: variables, error: variablesError } = integrationIds.length
    ? await supabase
        .from("project_integration_variables")
        .select("id, integration_id, project_id, name, source_key, location_label, is_active")
        .in("integration_id", integrationIds)
        .eq("is_active", true)
        .order("sort_order")
    : { data: [], error: null };

  if (variablesError) {
    throw new Error(variablesError.message);
  }

  return {
    integrations,
    variables: (variables ?? []).map((row) => ({
      id: row.id,
      integrationId: row.integration_id,
      projectId: row.project_id,
      name: row.name,
      sourceKey: row.source_key,
      locationLabel: row.location_label,
      isActive: row.is_active,
    })),
  };
}
