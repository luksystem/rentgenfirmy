import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { deleteAgreementAttachmentAdmin } from "@/lib/supabase/project-agreement-attachments-server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { attachmentId } = await context.params;
    await deleteAgreementAttachmentAdmin(attachmentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd usuwania załącznika." },
      { status: 400 },
    );
  }
}
