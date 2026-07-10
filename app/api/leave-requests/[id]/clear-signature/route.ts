import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchLeaveRequestByIdServer, mapLeaveRequestRow } from "@/lib/supabase/leave-request-server";
import { deleteCalendarEvent } from "@/lib/google/calendar";
import { removeLeaveAbsence } from "@/lib/leave/leave-absence-sync";
import { LEAVE_CARDS_BUCKET } from "@/lib/supabase/leave-card-repository";

/** Administrator czyści podpis zaakceptowanego wniosku (jak w protokołach) — wniosek wraca do
 * statusu „oczekuje”, żeby przełożony lub administrator mógł podjąć decyzję ponownie. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdministratorProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const item = await fetchLeaveRequestByIdServer(admin, id);
    if (!item) {
      return NextResponse.json({ error: "Nie znaleziono wniosku." }, { status: 404 });
    }

    if (item.googleCalendarEventId) {
      await deleteCalendarEvent(item.googleCalendarEventId);
    }
    if (item.generatedPdfPath) {
      await admin.storage.from(LEAVE_CARDS_BUCKET).remove([item.generatedPdfPath]).catch(() => undefined);
    }
    await removeLeaveAbsence(admin, id).catch(() => undefined);

    const { data: updated, error } = await admin
      .from("leave_requests")
      .update({
        status: "pending",
        decided_by: null,
        decided_at: null,
        decision_note: "",
        signature: null,
        generated_pdf_path: null,
        generated_pdf_name: null,
        google_calendar_event_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ item: mapLeaveRequestRow(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
