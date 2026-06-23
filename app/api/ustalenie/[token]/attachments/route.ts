import { NextResponse } from "next/server";
import { fetchAgreementCollaborationByToken } from "@/lib/supabase/project-agreement-collaboration-repository";
import { uploadAgreementAttachmentAdmin } from "@/lib/supabase/project-agreement-attachments-repository";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const authorNameRaw = formData.get("authorName");
  const authorName = typeof authorNameRaw === "string" ? authorNameRaw.trim() : "";
  const file = formData.get("file");

  if (!authorName) {
    return NextResponse.json({ error: "Podaj imię lub firmę." }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  try {
    const bundle = await fetchAgreementCollaborationByToken(token);
    if (!bundle) {
      return NextResponse.json({ error: "Nie znaleziono ustalenia." }, { status: 404 });
    }

    if (bundle.agreement.status === "cancelled") {
      return NextResponse.json({ error: "To ustalenie zostało anulowane." }, { status: 400 });
    }

    const attachment = await uploadAgreementAttachmentAdmin({
      agreementId: bundle.agreement.id,
      file,
      authorName,
      authorSource: "external",
    });

    return NextResponse.json({ attachment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd przesyłania pliku." },
      { status: 400 },
    );
  }
}
