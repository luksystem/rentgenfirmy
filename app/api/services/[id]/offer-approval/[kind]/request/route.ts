import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { getUserDisplayName, isAdministratorRole } from "@/lib/auth/types";
import type { OfferKind } from "@/lib/service/offer-approval";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import {
  fetchServiceByIdServer,
  requestOfferApprovalServer,
} from "@/lib/supabase/service-repository-server";
import { createOfferApprovalRequestedNotificationServer } from "@/lib/notifications/server";

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

    const assignedAdminId = typeof body?.assignedAdminId === "string" ? body.assignedAdminId : "";
    if (!assignedAdminId) {
      return NextResponse.json({ error: "Wybierz administratora." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: adminRow, error: adminError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", assignedAdminId)
      .maybeSingle();

    if (adminError) {
      throw new Error(adminError.message);
    }
    if (!adminRow || !isAdministratorRole(mapProfileRow(adminRow).role)) {
      return NextResponse.json(
        { error: "Wybrany użytkownik nie jest administratorem." },
        { status: 400 },
      );
    }

    const service = await fetchServiceByIdServer(id);
    if (!service) {
      return NextResponse.json({ error: "Nie znaleziono oferty." }, { status: 404 });
    }

    const updated = await requestOfferApprovalServer({
      serviceId: id,
      kind,
      requestedBy: userId,
      assignedAdminId,
    });

    await createOfferApprovalRequestedNotificationServer({
      serviceId: id,
      kind,
      requestedByName: getUserDisplayName(profile),
      serviceTitle: service.title,
      assignedAdminId,
    }).catch(() => undefined);

    return NextResponse.json({ service: updated });
  } catch (error) {
    return jsonError(error);
  }
}
