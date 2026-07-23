import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { flattenProcessItems } from "@/lib/process/types";
import {
  fetchOrphanedProjectProcessItems,
  fetchProjectProcessItems,
  mapProjectProcessItemsByTemplateId,
  reassignProjectProcessItemToTemplateItem,
} from "@/lib/supabase/process-item-repository";
import { fetchProcessTemplateByProjectType } from "@/lib/supabase/process-repository";
import { getSupabaseServer } from "@/lib/supabase/server";

async function loadLiveTemplate(supabase: SupabaseClient, projectId: string) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("type")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }
  if (!project?.type) {
    throw new Error("Nie znaleziono projektu.");
  }

  const liveTemplate = await fetchProcessTemplateByProjectType(project.type);
  if (!liveTemplate) {
    throw new Error(`Brak szablonu procesu dla typu „${project.type}”.`);
  }

  return liveTemplate;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await requireAdministratorProfile();
    const { projectId } = await context.params;
    const supabase = getSupabaseServer();

    const liveTemplate = await loadLiveTemplate(supabase, projectId);
    const orphans = await fetchOrphanedProjectProcessItems(supabase, projectId, liveTemplate);
    const templateItems = flattenProcessItems(liveTemplate).map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      stageTitle: item.stageTitle,
      milestoneTitle: item.milestoneTitle,
    }));

    return NextResponse.json({ orphans, templateItems });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await requireAdministratorProfile();
    const { projectId } = await context.params;
    const body = (await request.json()) as {
      orphanItemId?: string;
      targetTemplateItemId?: string;
    };

    if (!body.orphanItemId || !body.targetTemplateItemId) {
      return NextResponse.json({ error: "Brak wymaganych pól." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    await reassignProjectProcessItemToTemplateItem(
      supabase,
      projectId,
      body.orphanItemId,
      body.targetTemplateItemId,
    );

    const items = await fetchProjectProcessItems(projectId);
    return NextResponse.json({ itemsByTemplateId: mapProjectProcessItemsByTemplateId(items) });
  } catch (error) {
    return jsonError(error);
  }
}
