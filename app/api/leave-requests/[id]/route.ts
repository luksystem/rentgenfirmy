import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { isAdministratorRole } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchLeaveRequestByIdServer } from "@/lib/supabase/leave-request-server";
import { deleteCalendarEvent } from "@/lib/google/calendar";

function canView(request: { profileId: string; supervisorId: string | null }, userId: string, isAdmin: boolean) {
  return isAdmin || request.profileId === userId || request.supervisorId === userId;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const item = await fetchLeaveRequestByIdServer(admin, id);
    if (!item) {
      return NextResponse.json({ error: "Nie znaleziono wniosku." }, { status: 404 });
    }

    if (!canView(item, userId, isAdministratorRole(profile.role))) {
      return NextResponse.json({ error: "Brak dostępu do tego wniosku." }, { status: 403 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return jsonError(error);
  }
}

/** Pracownik może wycofać własny wniosek, o ile nikt jeszcze nie podjął decyzji. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const item = await fetchLeaveRequestByIdServer(admin, id);
    if (!item) {
      return NextResponse.json({ error: "Nie znaleziono wniosku." }, { status: 404 });
    }

    const isAdmin = isAdministratorRole(profile.role);
    if (item.profileId !== userId && !isAdmin) {
      return NextResponse.json({ error: "Możesz wycofać tylko własny wniosek." }, { status: 403 });
    }

    if (item.status !== "pending" && !isAdmin) {
      return NextResponse.json(
        { error: "Nie można wycofać wniosku, który został już rozstrzygnięty." },
        { status: 400 },
      );
    }

    if (item.googleCalendarEventId) {
      await deleteCalendarEvent(item.googleCalendarEventId);
    }

    const { error } = await admin.from("leave_requests").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
