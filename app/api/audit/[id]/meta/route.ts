import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth/http-error";
import { requireOwnedSession } from "@/lib/audit/api-helpers";
import { updateSessionMeta } from "@/lib/supabase/audit-repository";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireOwnedSession(id);
    const body = (await request.json().catch(() => ({}))) as {
      buildingAddress?: string | null;
      auditorName?: string | null;
      auditedAt?: string | null;
    };
    const session = await updateSessionMeta(id, {
      buildingAddress: body.buildingAddress,
      auditorName: body.auditorName,
      auditedAt: body.auditedAt,
    });
    return NextResponse.json({ session });
  } catch (error) {
    return jsonError(error);
  }
}
