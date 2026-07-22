import type { SupabaseClient } from "@supabase/supabase-js";
import {
  cloneProcessTemplate,
  collectTemplateItemIds,
  collectTemplateMilestoneIds,
} from "@/lib/process/anchored-template";
import {
  emptyChecklistPayload,
  projectChecklistPayloadFromTemplate,
} from "@/lib/process/item-payload";
import type { ProcessItemCompletion, ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import { flattenProcessItems } from "@/lib/process/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncChecklistInstancesFromTemplate } from "@/lib/supabase/process-item-repository";
import { projectProcessToUpdate, rowToProjectProcess } from "@/lib/supabase/process-mappers";
import { fetchProcessTemplateByProjectTypeWithClient } from "@/lib/supabase/process-repository";

type AdminClient = SupabaseClient;

export type BulkProcessTemplateSyncResult = {
  projectId: string;
  projectName: string;
  projectType: string;
  status: "synced" | "skipped" | "error";
  message?: string;
};

export type BulkProcessTemplateSyncSummary = {
  total: number;
  synced: number;
  skipped: number;
  errors: number;
  results: BulkProcessTemplateSyncResult[];
};

async function fetchProjectProcessAdmin(admin: AdminClient, projectId: string) {
  const { data, error } = await admin
    .from("project_processes")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToProjectProcess(data) : null;
}

async function ensureProjectProcessItemsAdmin(
  admin: AdminClient,
  projectId: string,
  template: ProcessTemplate,
) {
  const { data: existingRows, error: existingError } = await admin
    .from("project_process_items")
    .select("template_item_id")
    .eq("project_id", projectId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingIds = new Set((existingRows ?? []).map((row) => row.template_item_id as string));
  const templateItems = flattenProcessItems(template);
  const missing = templateItems.filter((item) => !existingIds.has(item.id));

  if (!missing.length) {
    await syncChecklistInstancesFromTemplate(admin, projectId, template);
    return 0;
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("project_process_items").upsert(
    missing.map((item) => ({
      project_id: projectId,
      template_item_id: item.id,
      kind: item.kind,
      is_internal_acceptance: item.isInternalAcceptance ?? false,
      payload:
        item.kind === "checklist"
          ? projectChecklistPayloadFromTemplate(item.defaultPayload)
          : emptyChecklistPayload(),
      status: "open",
      created_at: now,
      updated_at: now,
    })),
    { onConflict: "project_id,template_item_id", ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(error.message);
  }

  await syncChecklistInstancesFromTemplate(admin, projectId, template);
  return missing.length;
}

async function getOrCreateProjectProcessAdmin(
  admin: AdminClient,
  projectId: string,
  liveTemplate: ProcessTemplate,
) {
  const existing = await fetchProjectProcessAdmin(admin, projectId);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const snapshot = cloneProcessTemplate(liveTemplate);
  const { data, error } = await admin
    .from("project_processes")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      template_id: liveTemplate.id,
      template_snapshot: snapshot,
      completions: {},
      milestone_dates: {},
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = rowToProjectProcess(data);
  await ensureProjectProcessItemsAdmin(admin, projectId, snapshot);
  return created;
}

export async function syncProjectProcessFromTemplateAdmin(
  admin: AdminClient,
  projectId: string,
  liveTemplate: ProcessTemplate,
) {
  const process = await getOrCreateProjectProcessAdmin(admin, projectId, liveTemplate);
  const snapshot = cloneProcessTemplate(liveTemplate);
  const itemIds = collectTemplateItemIds(snapshot);
  const milestoneIds = collectTemplateMilestoneIds(snapshot);
  const now = new Date().toISOString();

  const completions = Object.fromEntries(
    Object.entries(process.completions).filter(([itemId]) => itemIds.has(itemId)),
  ) as Record<string, ProcessItemCompletion>;

  const milestoneDates = Object.fromEntries(
    Object.entries(process.milestoneDates).filter(([milestoneId]) =>
      milestoneIds.has(milestoneId),
    ),
  ) as Record<string, string | null>;

  const updated: ProjectProcess = {
    ...process,
    templateId: liveTemplate.id,
    templateSnapshot: snapshot,
    completions,
    milestoneDates,
    updatedAt: now,
  };

  const { data, error } = await admin
    .from("project_processes")
    .update(projectProcessToUpdate(updated))
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const addedItems = await ensureProjectProcessItemsAdmin(admin, projectId, snapshot);
  return {
    process: rowToProjectProcess(data),
    addedItems,
  };
}

export async function syncAllProjectProcessFromTemplates(options?: {
  dryRun?: boolean;
  activeOnly?: boolean;
  projectIds?: string[];
}): Promise<BulkProcessTemplateSyncSummary> {
  const admin = getSupabaseAdmin();
  const dryRun = options?.dryRun ?? false;
  const activeOnly = options?.activeOnly ?? false;

  let projectsQuery = admin.from("projects").select("id, name, type, is_active").order("name");
  if (options?.projectIds?.length) {
    projectsQuery = projectsQuery.in("id", options.projectIds);
  }
  if (activeOnly) {
    projectsQuery = projectsQuery.eq("is_active", true);
  }

  const { data: projects, error: projectsError } = await projectsQuery;
  if (projectsError) {
    throw new Error(projectsError.message);
  }

  const templateByType = new Map<string, ProcessTemplate>();
  const results: BulkProcessTemplateSyncResult[] = [];

  for (const project of projects ?? []) {
    const projectId = project.id as string;
    const projectName = (project.name as string) || projectId;
    const projectType = project.type as string;

    if (!projectType) {
      results.push({
        projectId,
        projectName,
        projectType: "",
        status: "skipped",
        message: "Brak typu projektu.",
      });
      continue;
    }

    let liveTemplate = templateByType.get(projectType) ?? null;
    if (!liveTemplate) {
      liveTemplate = await fetchProcessTemplateByProjectTypeWithClient(admin, projectType);
      if (liveTemplate) {
        templateByType.set(projectType, liveTemplate);
      }
    }

    if (!liveTemplate) {
      results.push({
        projectId,
        projectName,
        projectType,
        status: "skipped",
        message: `Brak szablonu procesu dla typu „${projectType}”.`,
      });
      continue;
    }

    if (dryRun) {
      results.push({
        projectId,
        projectName,
        projectType,
        status: "synced",
        message: "Dry-run: zostałby zsynchronizowany.",
      });
      continue;
    }

    try {
      const { addedItems } = await syncProjectProcessFromTemplateAdmin(
        admin,
        projectId,
        liveTemplate,
      );
      results.push({
        projectId,
        projectName,
        projectType,
        status: "synced",
        message:
          addedItems > 0
            ? `Zsynchronizowano (+${addedItems} nowych elementów).`
            : "Zsynchronizowano.",
      });
    } catch (error) {
      results.push({
        projectId,
        projectName,
        projectType,
        status: "error",
        message: error instanceof Error ? error.message : "Nieznany błąd synchronizacji.",
      });
    }
  }

  return {
    total: results.length,
    synced: results.filter((entry) => entry.status === "synced").length,
    skipped: results.filter((entry) => entry.status === "skipped").length,
    errors: results.filter((entry) => entry.status === "error").length,
    results,
  };
}
