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

    // `project_process_items.kind` to zamrożona kopia z chwili utworzenia instancji — jeśli ktoś
    // później zmienił typ elementu w katalogu (np. z checklisty na snapshot), ta kolumna zostaje
    // nieaktualna. Rozstrzygamy więc po aktualnym typie z szablonu/katalogu, a nie po tej kopii.
    const { data: templateItem, error: templateItemError } = await supabase
      .from("process_items")
      .select("kind, element_id")
      .eq("id", instance.template_item_id)
      .maybeSingle();
    if (templateItemError) {
      throw new Error(templateItemError.message);
    }
    let liveKind: string | null = templateItem?.kind ?? null;
    if (templateItem?.element_id) {
      const { data: element, error: elementError } = await supabase
        .from("process_elements")
        .select("kind")
        .eq("id", templateItem.element_id)
        .maybeSingle();
      if (elementError) {
        throw new Error(elementError.message);
      }
      if (element?.kind) {
        liveKind = element.kind;
      }
    }

    if (liveKind !== "snapshot") {
      return NextResponse.json({ error: "Ten element nie obsługuje zdjęć do klienta." }, { status: 400 });
    }

    if (instance.kind !== "snapshot") {
      await supabase.from("project_process_items").update({ kind: "snapshot" }).eq("id", itemId);
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
