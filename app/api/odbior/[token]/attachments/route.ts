import { NextResponse } from "next/server";
import { uploadInternalAcceptanceAttachmentAdmin } from "@/lib/supabase/checklist-attachments-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchProcessPublicAccessByToken } from "@/lib/supabase/process-public-access-repository";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane formularza." }, { status: 400 });
  }

  const itemKeyRaw = formData.get("itemKey");
  const authorNameRaw = formData.get("actorName");
  const file = formData.get("file");

  const itemKey = typeof itemKeyRaw === "string" ? itemKeyRaw.trim() : "";
  const actorName = typeof authorNameRaw === "string" ? authorNameRaw.trim() : "";

  if (!itemKey) {
    return NextResponse.json({ error: "Brak identyfikatora punktu." }, { status: 400 });
  }

  if (!actorName) {
    return NextResponse.json({ error: "Podaj imię lub firmę." }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Wybierz plik do przesłania." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const access = await fetchProcessPublicAccessByToken(supabase, token);
    if (!access?.publicEnabled) {
      return NextResponse.json({ error: "Link wygasł lub element nie jest publiczny." }, { status: 404 });
    }

    const { data: instance, error: instanceError } = await supabase
      .from("project_process_items")
      .select("id, kind, is_internal_acceptance")
      .eq("id", access.projectProcessItemId)
      .maybeSingle();

    if (instanceError || !instance) {
      return NextResponse.json({ error: "Nie znaleziono tablicy odbioru." }, { status: 404 });
    }

    if (instance.kind !== "checklist" || !instance.is_internal_acceptance) {
      return NextResponse.json({ error: "Ten element nie obsługuje załączników." }, { status: 400 });
    }

    const attachment = await uploadInternalAcceptanceAttachmentAdmin({
      projectProcessItemId: access.projectProcessItemId,
      itemKey,
      file,
      uploadedBy: actorName,
    });

    return NextResponse.json({ attachment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd przesyłania pliku." },
      { status: 400 },
    );
  }
}
