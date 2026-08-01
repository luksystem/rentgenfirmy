import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { getUserDisplayName } from "@/lib/auth/types";
import { jsonError } from "@/lib/auth/http-error";
import { DOCUMENTATION_MODULE_LABELS, type DocumentationModuleType } from "@/lib/dashboard/documentation-module-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendDocumentationModuleCompletionNotification } from "@/lib/supabase/documentation-module-completion-notifications-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; moduleId: string }> },
) {
  try {
    const session = await requireAuthenticatedProfile();
    const { projectId, moduleId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const reopen = Boolean((body as { reopen?: boolean })?.reopen);
    const actorName = getUserDisplayName(session.profile);

    const supabase = getSupabaseAdmin();
    const { data: mod, error: fetchError } = await supabase
      .from("documentation_modules")
      .select("id, name, module_type, project_id")
      .eq("id", moduleId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!mod) {
      return NextResponse.json({ error: "Nie znaleziono modułu." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("documentation_modules")
      .update(
        reopen
          ? { completed_at: null, completed_by_id: null, completed_by_name: null, updated_at: now }
          : {
              completed_at: now,
              completed_by_id: session.userId,
              completed_by_name: actorName,
              updated_at: now,
            },
      )
      .eq("id", moduleId)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    if (!reopen) {
      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .maybeSingle();

      try {
        const moduleType = mod.module_type as DocumentationModuleType;
        await sendDocumentationModuleCompletionNotification({
          projectId,
          projectName: (project?.name as string | undefined) ?? "Projekt",
          moduleLabel: DOCUMENTATION_MODULE_LABELS[moduleType] ?? moduleType,
          moduleName: mod.name as string,
          completedByName: actorName,
        });
      } catch (notifyError) {
        console.warn("[documentation-modules/complete] notification failed:", notifyError);
      }
    }

    return NextResponse.json({ module: updated });
  } catch (error) {
    return jsonError(error);
  }
}
