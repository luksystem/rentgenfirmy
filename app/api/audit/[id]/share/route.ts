import { NextResponse } from "next/server";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { requireOwnedSession } from "@/lib/audit/api-helpers";
import {
  getShareBySession,
  upsertShare,
  deleteShare,
  listShareAccessLog,
} from "@/lib/supabase/audit-share-repository";
import { generateShareToken, hashSharePassword } from "@/lib/audit/report-share-crypto";
import { normalizeVisibility } from "@/lib/audit/report-visibility";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireOwnedSession(id);
    const share = await getShareBySession(id);
    const accessLog = share ? await listShareAccessLog(share.id) : [];
    return NextResponse.json({ share, accessLog });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { session } = await requireOwnedSession(id);
    if (session.status !== "completed") {
      throw new HttpError(409, "Udostępnianie możliwe dopiero po wygenerowaniu raportu.");
    }

    const body = (await request.json().catch(() => ({}))) as {
      password?: string;
      expiresAt?: string | null;
      maxViews?: number | null;
      isActive?: boolean;
      visibleSections?: Record<string, boolean>;
    };

    const existing = await getShareBySession(id);

    if (!existing && !body.password) {
      throw new HttpError(400, "Hasło jest wymagane przy tworzeniu linku.");
    }
    if (body.password !== undefined && body.password.length > 0 && body.password.length < 4) {
      throw new HttpError(400, "Hasło musi mieć co najmniej 4 znaki.");
    }

    let expiresAt: string | null | undefined = undefined;
    if (body.expiresAt !== undefined) {
      if (body.expiresAt === null || body.expiresAt === "") {
        expiresAt = null;
      } else {
        const d = new Date(body.expiresAt);
        if (Number.isNaN(d.getTime())) throw new HttpError(400, "Nieprawidłowa data wygaśnięcia.");
        expiresAt = d.toISOString();
      }
    }

    let maxViews: number | null | undefined = undefined;
    if (body.maxViews !== undefined) {
      if (body.maxViews === null) maxViews = null;
      else if (!Number.isInteger(body.maxViews) || body.maxViews < 1) {
        throw new HttpError(400, "Limit wyświetleń musi być dodatnią liczbą.");
      } else maxViews = body.maxViews;
    }

    const share = await upsertShare(id, {
      token: existing?.token ?? generateShareToken(),
      passwordHash: body.password ? await hashSharePassword(body.password) : undefined,
      isActive: body.isActive,
      expiresAt,
      maxViews,
      visibleSections: body.visibleSections ? normalizeVisibility(body.visibleSections) : undefined,
    });

    return NextResponse.json({ share });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireOwnedSession(id);
    await deleteShare(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
