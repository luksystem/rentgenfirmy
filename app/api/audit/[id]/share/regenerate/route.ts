import { NextResponse } from "next/server";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { requireOwnedSession } from "@/lib/audit/api-helpers";
import { getShareBySession, regenerateToken } from "@/lib/supabase/audit-share-repository";
import { generateShareToken } from "@/lib/audit/report-share-crypto";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireOwnedSession(id);
    const existing = await getShareBySession(id);
    if (!existing) throw new HttpError(404, "Brak aktywnego linku do regeneracji.");
    const share = await regenerateToken(id, generateShareToken());
    return NextResponse.json({ share });
  } catch (error) {
    return jsonError(error);
  }
}
