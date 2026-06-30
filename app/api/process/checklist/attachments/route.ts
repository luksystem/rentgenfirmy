import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { getUserDisplayName } from "@/lib/auth/types";
import { jsonError } from "@/lib/auth/http-error";
import { uploadChecklistLineAttachmentAdmin } from "@/lib/supabase/checklist-attachments-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const session = await requireAuthenticatedProfile();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Nieprawidłowe dane formularza." }, { status: 400 });
    }

    const projectProcessItemIdRaw = formData.get("projectProcessItemId");
    const lineIdRaw = formData.get("lineId");
    const authorNameRaw = formData.get("authorName");
    const file = formData.get("file");

    const projectProcessItemId =
      typeof projectProcessItemIdRaw === "string" ? projectProcessItemIdRaw.trim() : "";
    const lineId = typeof lineIdRaw === "string" ? lineIdRaw.trim() : "";
    const authorName =
      typeof authorNameRaw === "string" && authorNameRaw.trim()
        ? authorNameRaw.trim()
        : getUserDisplayName(session.profile);

    if (!projectProcessItemId || !lineId) {
      return NextResponse.json({ error: "Brak identyfikatora checklisty lub punktu." }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Wybierz plik do przesłania." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: instance, error: instanceError } = await supabase
      .from("project_process_items")
      .select("id, kind, is_internal_acceptance")
      .eq("id", projectProcessItemId)
      .maybeSingle();

    if (instanceError || !instance) {
      return NextResponse.json({ error: "Nie znaleziono checklisty." }, { status: 404 });
    }

    if (instance.kind !== "checklist" || instance.is_internal_acceptance) {
      return NextResponse.json({ error: "Ten element nie obsługuje załączników checklisty." }, { status: 400 });
    }

    const attachment = await uploadChecklistLineAttachmentAdmin({
      projectProcessItemId,
      lineId,
      file,
      uploadedBy: authorName,
    });

    return NextResponse.json({ attachment });
  } catch (error) {
    return jsonError(error);
  }
}
