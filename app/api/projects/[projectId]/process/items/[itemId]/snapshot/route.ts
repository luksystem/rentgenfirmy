import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { getUserDisplayName } from "@/lib/auth/types";
import { jsonError } from "@/lib/auth/http-error";
import {
  fetchProcessSnapshotByItemId,
  uploadProcessSnapshotAdmin,
} from "@/lib/supabase/process-snapshot-repository";
import { sendProcessSnapshotNotifications } from "@/lib/supabase/process-snapshot-notifications-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; itemId: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { itemId } = await context.params;
    const snapshot = await fetchProcessSnapshotByItemId(itemId);
    return NextResponse.json({ snapshot });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; itemId: string }> },
) {
  try {
    const session = await requireAuthenticatedProfile();
    const { projectId, itemId } = await context.params;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Nieprawidłowe dane formularza." }, { status: 400 });
    }

    const file = formData.get("file");
    const noteRaw = formData.get("employeeNote");
    const employeeNote = typeof noteRaw === "string" ? noteRaw : null;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Wybierz zdjęcie do przesłania." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: instance, error: instanceError } = await supabase
      .from("project_process_items")
      .select("id, template_item_id, kind, project_id")
      .eq("id", itemId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (instanceError) {
      throw new Error(instanceError.message);
    }
    if (!instance) {
      return NextResponse.json({ error: "Nie znaleziono elementu procesu." }, { status: 404 });
    }
    if (instance.kind !== "snapshot") {
      return NextResponse.json({ error: "Ten element nie obsługuje zdjęć do klienta." }, { status: 400 });
    }

    const snapshot = await uploadProcessSnapshotAdmin({
      projectProcessItemId: itemId,
      file,
      employeeNote,
      uploadedByProfileId: session.userId,
      uploadedByName: getUserDisplayName(session.profile),
    });

    const { error: updateError } = await supabase
      .from("project_process_items")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", itemId);

    if (updateError) {
      console.warn("[process-snapshot] status update failed:", updateError.message);
    }

    try {
      await sendProcessSnapshotNotifications({
        projectId,
        templateItemId: instance.template_item_id,
        snapshot,
      });
    } catch (notifyError) {
      // Zdjęcie już zapisane — brak powiadomienia to nie powód do 500, ale zgłaszamy w logach.
      console.warn("[process-snapshot] notifications failed:", notifyError);
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    return jsonError(error);
  }
}
