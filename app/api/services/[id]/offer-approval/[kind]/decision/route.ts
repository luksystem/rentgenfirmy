import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import type { OfferKind } from "@/lib/service/offer-approval";
import { fetchServiceByIdServer, decideOfferApprovalServer } from "@/lib/supabase/service-repository-server";
import { createOfferApprovalReviewedNotificationServer } from "@/lib/notifications/server";

function parseKind(value: string): OfferKind {
  if (value === "estimate" || value === "settlement") {
    return value;
  }
  throw new HttpError(400, "Nieprawidłowy typ oferty.");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id, kind: kindParam } = await context.params;
    const kind = parseKind(kindParam);
    const body = await request.json().catch(() => ({}));

    const decision = body?.decision === "approve" ? "approve" : body?.decision === "question" ? "question" : null;
    if (!decision) {
      return NextResponse.json({ error: "Nieprawidłowa decyzja." }, { status: 400 });
    }
    const note = typeof body?.note === "string" ? body.note : "";

    const service = await fetchServiceByIdServer(id);
    if (!service) {
      return NextResponse.json({ error: "Nie znaleziono oferty." }, { status: 404 });
    }

    const updated = await decideOfferApprovalServer({
      serviceId: id,
      kind,
      decidedBy: userId,
      decidedByRole: profile.role,
      decision,
      note,
    });

    const approval = kind === "estimate" ? updated.estimateApproval : updated.settlementApproval;
    if (approval.requestedBy) {
      await createOfferApprovalReviewedNotificationServer({
        serviceId: id,
        kind,
        requestedById: approval.requestedBy,
        serviceTitle: service.title,
        outcome: decision === "approve" ? "approved" : "question",
        note,
      }).catch(() => undefined);
    }

    return NextResponse.json({ service: updated });
  } catch (error) {
    return jsonError(error);
  }
}
