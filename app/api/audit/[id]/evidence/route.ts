import { NextResponse } from "next/server";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { requireOwnedSession } from "@/lib/audit/api-helpers";
import { addEvidence, listEvidence, uploadEvidenceFile } from "@/lib/supabase/audit-repository";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireOwnedSession(id);
    const items = await listEvidence(id);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireOwnedSession(id);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Brak pliku.");
    const questionCode = (form.get("questionCode") as string | null)?.trim() || null;
    const caption = (form.get("caption") as string | null)?.trim() || null;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";
    const storagePath = await uploadEvidenceFile(id, questionCode, file.name, bytes, contentType);

    const evidence = await addEvidence(id, { questionCode, caption, storagePath, contentType });
    return NextResponse.json({ evidence }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
