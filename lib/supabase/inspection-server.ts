import { getUserDisplayName } from "@/lib/auth/types";
import {
  DEFAULT_INSPECTION_SETTINGS,
  normalizeInspectionGlobalSettings,
} from "@/lib/inspections/defaults";
import { generateUpcomingPreliminaryDates } from "@/lib/inspections/schedule";
import { isInspectionPlanningDue } from "@/lib/inspections/schedule";
import type {
  InspectionPlanInput,
  InspectionReactionEmoji,
  InspectionRecord,
  InspectionStatus,
} from "@/lib/inspections/types";
import { INSPECTION_REACTION_EMOJIS, INSPECTION_STATUSES } from "@/lib/inspections/types";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import {
  rowToInspection,
  rowToInspectionClientPlan,
  rowToInspectionComment,
  rowToInspectionProtocolTemplate,
  rowToInspectionReaction,
} from "@/lib/supabase/inspection-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const SETTINGS_ID = "inspection_global_settings";

type InspectionUpdate = Database["public"]["Tables"]["inspections"]["Update"];

export async function fetchInspectionGlobalSettings() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeInspectionGlobalSettings(data?.data ?? DEFAULT_INSPECTION_SETTINGS);
}

export async function saveInspectionGlobalSettings(settings: ReturnType<typeof normalizeInspectionGlobalSettings>) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("app_settings").upsert({
    id: SETTINGS_ID,
    data: settings,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return settings;
}

export async function listInspectionProtocolTemplates(clientId?: string | null) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("inspection_protocol_templates")
    .select("*")
    .order("name", { ascending: true });

  if (clientId) {
    query = query.or(`client_id.eq.${clientId},client_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToInspectionProtocolTemplate);
}

export async function listInspections(status?: InspectionStatus): Promise<InspectionRecord[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("inspections").select("*").order("preliminary_date", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const clientIds = [...new Set(rows.map((row) => row.client_id))];
  const projectIds = [...new Set(rows.map((row) => row.project_id).filter(Boolean))] as string[];

  const [{ data: clients }, { data: projects }] = await Promise.all([
    clientIds.length
      ? supabase.from("clients").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
    projectIds.length
      ? supabase.from("projects").select("id, name").in("id", projectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const clientMap = new Map((clients ?? []).map((row) => [row.id, row.full_name]));
  const projectMap = new Map((projects ?? []).map((row) => [row.id, row.name]));

  return rows.map((row) =>
    rowToInspection(row, {
      clientName: clientMap.get(row.client_id) ?? null,
      projectName: row.project_id ? projectMap.get(row.project_id) ?? null : null,
    }),
  );
}

export async function getInspectionById(id: string): Promise<InspectionRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("inspections").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [{ data: client }, { data: project }, { data: comments }, { data: reactions }] =
    await Promise.all([
      supabase.from("clients").select("full_name").eq("id", data.client_id).maybeSingle(),
      data.project_id
        ? supabase.from("projects").select("name").eq("id", data.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("inspection_comments")
        .select("*")
        .eq("inspection_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("inspection_reactions")
        .select("*")
        .eq("inspection_id", id)
        .order("created_at", { ascending: true }),
    ]);

  const record = rowToInspection(data, {
    clientName: client?.full_name ?? null,
    projectName: project?.name ?? null,
  });

  record.comments = (comments ?? []).map(rowToInspectionComment);
  record.reactions = (reactions ?? []).map(rowToInspectionReaction);
  return record;
}

export async function updateInspection(
  id: string,
  patch: Partial<{
    status: InspectionStatus;
    preliminaryDate: string | null;
    confirmedDate: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
    responsibleId: string | null;
    responsibleName: string | null;
    protocolData: Record<string, unknown>;
    protocolCompanySignedAt: string | null;
    protocolClientSignedAt: string | null;
    protocolCompanySigner: string | null;
    protocolClientSigner: string | null;
    completedAt: string | null;
  }>,
): Promise<InspectionRecord> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const update: InspectionUpdate = { updated_at: now };

  if (patch.status !== undefined) update.status = patch.status;
  if (patch.preliminaryDate !== undefined) update.preliminary_date = patch.preliminaryDate;
  if (patch.confirmedDate !== undefined) update.confirmed_date = patch.confirmedDate;
  if (patch.assigneeId !== undefined) update.assignee_id = patch.assigneeId;
  if (patch.assigneeName !== undefined) update.assignee_name = patch.assigneeName;
  if (patch.responsibleId !== undefined) update.responsible_id = patch.responsibleId;
  if (patch.responsibleName !== undefined) update.responsible_name = patch.responsibleName;
  if (patch.protocolData !== undefined) update.protocol_data = patch.protocolData;
  if (patch.protocolCompanySignedAt !== undefined) {
    update.protocol_company_signed_at = patch.protocolCompanySignedAt;
  }
  if (patch.protocolClientSignedAt !== undefined) {
    update.protocol_client_signed_at = patch.protocolClientSignedAt;
  }
  if (patch.protocolCompanySigner !== undefined) {
    update.protocol_company_signer = patch.protocolCompanySigner;
  }
  if (patch.protocolClientSigner !== undefined) {
    update.protocol_client_signer = patch.protocolClientSigner;
  }
  if (patch.completedAt !== undefined) update.completed_at = patch.completedAt;

  if (patch.status === "planned" && patch.confirmedDate && !patch.completedAt) {
    update.status = "planned";
  }

  if (patch.status === "completed") {
    update.completed_at = patch.completedAt ?? now;
  }

  const { data, error } = await supabase.from("inspections").update(update).eq("id", id).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  const updated = await getInspectionById(data.id);
  if (!updated) {
    throw new Error("Nie znaleziono przeglądu po aktualizacji.");
  }
  return updated;
}

async function resolveAssignee(assigneeId: string | null) {
  if (!assigneeId) {
    return { assignee_id: null, assignee_name: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", assigneeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Nie znaleziono aktywnego użytkownika.");
  }

  const profile = mapProfileRow(data);
  return {
    assignee_id: profile.id,
    assignee_name: getUserDisplayName(profile),
  };
}

export async function updateInspectionWithAssignee(
  id: string,
  patch: Parameters<typeof updateInspection>[1] & { assigneeId?: string | null },
) {
  let assigneePatch: { assigneeId?: string | null; assigneeName?: string | null } = {};
  if (patch.assigneeId !== undefined) {
    const resolved = await resolveAssignee(patch.assigneeId);
    assigneePatch = {
      assigneeId: resolved.assignee_id,
      assigneeName: resolved.assignee_name,
    };
  }

  return updateInspection(id, { ...patch, ...assigneePatch });
}

export async function addInspectionComment(input: {
  inspectionId: string;
  authorProfileId: string | null;
  authorName: string;
  body: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("inspection_comments")
    .insert({
      inspection_id: input.inspectionId,
      author_profile_id: input.authorProfileId,
      author_name: input.authorName.trim(),
      body: input.body.trim(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToInspectionComment(data);
}

export async function toggleInspectionReaction(input: {
  inspectionId: string;
  emoji: InspectionReactionEmoji;
  authorProfileId: string | null;
  authorName: string;
}) {
  if (!INSPECTION_REACTION_EMOJIS.includes(input.emoji)) {
    throw new Error("Nieprawidłowa reakcja.");
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("inspection_reactions")
    .select("id")
    .eq("inspection_id", input.inspectionId)
    .eq("emoji", input.emoji)
    .eq("author_name", input.authorName.trim())
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("inspection_reactions").delete().eq("id", existing.id);
    if (error) {
      throw new Error(error.message);
    }
    return null;
  }

  const { data, error } = await supabase
    .from("inspection_reactions")
    .insert({
      inspection_id: input.inspectionId,
      emoji: input.emoji,
      author_profile_id: input.authorProfileId,
      author_name: input.authorName.trim(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToInspectionReaction(data);
}

export async function planInspectionsForClient(input: InspectionPlanInput) {
  const settings = await fetchInspectionGlobalSettings();
  const systemMap = new Map(settings.systems.map((entry) => [entry.code, entry.label]));
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const horizonMonths = input.horizonMonths ?? 12;
  const created: InspectionRecord[] = [];

  for (const system of input.systems) {
    const label = systemMap.get(system.systemCode) ?? system.systemCode.toUpperCase();

    const { data: planRow, error: planError } = await supabase
      .from("inspection_client_plans")
      .upsert(
        {
          client_id: input.clientId,
          project_id: input.projectId ?? null,
          system_code: system.systemCode,
          frequency: system.frequency,
          schedule_months: system.scheduleMonths,
          protocol_template_id: system.protocolTemplateId ?? null,
          work_scope: system.workScope.trim(),
          responsible_profile_id: input.responsibleProfileId ?? null,
          responsible_name: input.responsibleName?.trim() || null,
          active: true,
          updated_at: now,
        },
        { onConflict: "client_id,system_code" },
      )
      .select("*")
      .single();

    if (planError) {
      throw new Error(planError.message);
    }

    const plan = rowToInspectionClientPlan(planRow);
    const dates = generateUpcomingPreliminaryDates({
      months: system.scheduleMonths,
      horizonMonths,
    });

    for (const preliminaryDate of dates) {
      const title = `Przegląd ${label}`;

      const { data: existing } = await supabase
        .from("inspections")
        .select("id")
        .eq("plan_id", plan.id)
        .eq("preliminary_date", preliminaryDate)
        .maybeSingle();

      if (existing) {
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("inspections")
        .insert({
          client_id: input.clientId,
          project_id: input.projectId ?? null,
          plan_id: plan.id,
          system_code: system.systemCode,
          system_label: label,
          status: "preliminary",
          title,
          work_scope: system.workScope.trim(),
          preliminary_date: preliminaryDate,
          responsible_id: input.responsibleProfileId ?? null,
          responsible_name: input.responsibleName?.trim() || null,
          protocol_template_id: system.protocolTemplateId ?? null,
        })
        .select("*")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      created.push(rowToInspection(inserted));
    }
  }

  return created;
}

export async function countInspectionAlerts() {
  const items = await listInspections();
  const planningDueCount = items.filter((item) =>
    isInspectionPlanningDue({
      preliminaryDate: item.preliminaryDate,
      confirmedDate: item.confirmedDate,
      status: item.status,
    }),
  ).length;

  const quotingCount = items.filter((item) => item.status === "quoting").length;

  return {
    planningDueCount,
    quotingCount,
    newCount: planningDueCount + quotingCount,
  };
}

export function assertInspectionStatus(value: string): value is InspectionStatus {
  return INSPECTION_STATUSES.includes(value as InspectionStatus);
}

const INSPECTION_PROTOCOLS_BUCKET = "inspection-protocols";

export async function createInspectionProtocolTemplate(input: {
  clientId?: string | null;
  systemCode: string;
  name: string;
  file?: File | null;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const templateId = crypto.randomUUID();
  let filePath: string | null = null;
  let fileUrl: string | null = null;

  if (input.file) {
    const extension = input.file.name.split(".").pop()?.toLowerCase() || "pdf";
    const storagePath = `${input.clientId ?? "global"}/${input.systemCode}/${templateId}.${extension}`;
    const fileBuffer = await input.file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(INSPECTION_PROTOCOLS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: input.file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    filePath = storagePath;
    const { data: signed } = await supabase.storage
      .from(INSPECTION_PROTOCOLS_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    fileUrl = signed?.signedUrl ?? null;
  }

  const { data, error } = await supabase
    .from("inspection_protocol_templates")
    .insert({
      id: templateId,
      client_id: input.clientId ?? null,
      system_code: input.systemCode.trim().toLowerCase(),
      name: input.name.trim(),
      file_path: filePath,
      file_url: fileUrl,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    if (filePath) {
      await supabase.storage.from(INSPECTION_PROTOCOLS_BUCKET).remove([filePath]);
    }
    throw new Error(error.message);
  }

  return rowToInspectionProtocolTemplate(data);
}

export async function attachSignedUrlsToProtocolTemplates(
  templates: Awaited<ReturnType<typeof listInspectionProtocolTemplates>>,
) {
  const supabase = getSupabaseAdmin();
  return Promise.all(
    templates.map(async (template) => {
      if (!template.filePath) {
        return template;
      }
      const { data } = await supabase.storage
        .from(INSPECTION_PROTOCOLS_BUCKET)
        .createSignedUrl(template.filePath, 60 * 60 * 24);
      return { ...template, fileUrl: data?.signedUrl ?? template.fileUrl };
    }),
  );
}
