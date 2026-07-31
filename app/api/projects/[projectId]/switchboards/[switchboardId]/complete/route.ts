import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { getUserDisplayName } from "@/lib/auth/types";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendSwitchboardCompletionNotification } from "@/lib/supabase/switchboard-completion-notifications-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; switchboardId: string }> },
) {
  try {
    const session = await requireAuthenticatedProfile();
    const { projectId, switchboardId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const reopen = Boolean((body as { reopen?: boolean })?.reopen);
    const actorName = getUserDisplayName(session.profile);

    const supabase = getSupabaseAdmin();
    const { data: switchboard, error: fetchError } = await supabase
      .from("switchboards")
      .select("id, name, project_id")
      .eq("id", switchboardId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!switchboard) {
      return NextResponse.json({ error: "Nie znaleziono rozdzielnicy." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("switchboards")
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
      .eq("id", switchboardId)
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
        await sendSwitchboardCompletionNotification({
          projectId,
          projectName: (project?.name as string | undefined) ?? "Projekt",
          switchboardName: switchboard.name as string,
          completedByName: actorName,
        });
      } catch (notifyError) {
        // Zakończenie już zapisane — brak powiadomienia to nie powód do 500, tylko log.
        console.warn("[switchboards/complete] notification failed:", notifyError);
      }
    }

    return NextResponse.json({ switchboard: updated });
  } catch (error) {
    return jsonError(error);
  }
}
