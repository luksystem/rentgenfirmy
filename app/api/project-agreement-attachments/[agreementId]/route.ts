import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import type { AgreementCommentAuthorSource } from "@/lib/dashboard/agreement-collaboration-types";
import { uploadAgreementAttachmentAdmin } from "@/lib/supabase/project-agreement-attachments-server";

function parseAuthorSource(value: FormDataEntryValue | null): AgreementCommentAuthorSource {
  if (value === "team" || value === "client" || value === "external") {
    return value;
  }
  return "team";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ agreementId: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { agreementId } = await context.params;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const authorNameRaw = formData.get("authorName");
    const authorName = typeof authorNameRaw === "string" ? authorNameRaw.trim() : "";
    const authorSource = parseAuthorSource(formData.get("authorSource"));
    const file = formData.get("file");

    if (!authorName) {
      return NextResponse.json({ error: "Podaj imię lub firmę." }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const attachment = await uploadAgreementAttachmentAdmin({
      agreementId,
      file,
      authorName,
      authorSource,
    });

    return NextResponse.json({ attachment });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd przesyłania pliku." },
      { status: 400 },
    );
  }
}
