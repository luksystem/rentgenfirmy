import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import {
  fetchProjectProcessItems,
  mapProjectProcessItemsByTemplateId,
} from "@/lib/supabase/process-item-repository";
import {
  fetchProcessTemplateByProjectType,
  syncProjectProcessFromTemplate,
} from "@/lib/supabase/process-repository";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await requireAdministratorProfile();
    const { projectId } = await context.params;

    const supabase = getSupabaseServer();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("type")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      throw new Error(projectError.message);
    }

    if (!project?.type) {
      return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
    }

    const liveTemplate = await fetchProcessTemplateByProjectType(project.type);
    if (!liveTemplate) {
      return NextResponse.json(
        { error: `Brak szablonu procesu dla typu „${project.type}”.` },
        { status: 404 },
      );
    }

    const process = await syncProjectProcessFromTemplate(projectId, liveTemplate);
    const items = await fetchProjectProcessItems(projectId);

    return NextResponse.json({
      process,
      itemsByTemplateId: mapProjectProcessItemsByTemplateId(items),
    });
  } catch (error) {
    return jsonError(error);
  }
}
