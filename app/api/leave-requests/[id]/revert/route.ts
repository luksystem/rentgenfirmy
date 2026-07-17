import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchLeaveRequestByIdServer, mapLeaveRequestRow } from "@/lib/supabase/leave-request-server";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { deleteCalendarEvent } from "@/lib/google/calendar";
import { dispatchLeaveRequestDecidedSms } from "@/lib/leave/leave-sms";
import { removeLeaveAbsence } from "@/lib/leave/leave-absence-sync";
import { removeLeaveTimeEntriesServer } from "@/lib/supabase/time-tracking-leave-sync-server";
import { createLeaveRequestDecidedNotificationServer } from "@/lib/notifications/server";

/** Administrator cofa zaakceptowany urlop — zmienia status na odrzucony, usuwa wpis
 * z Kalendarza Google i informuje pracownika. Raz podjętej decyzji nie może cofnąć nikt
 * inny niż administrator (patrz reguła statusu w /decision). */
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

    if (item.status !== "approved") {
      return NextResponse.json({ error: "Można cofnąć tylko zaakceptowany urlop." }, { status: 400 });
    }

    if (item.googleCalendarEventId) {
      await deleteCalendarEvent(item.googleCalendarEventId);
    }

    const decidedAt = new Date().toISOString();
    const { data: updated, error } = await admin
      .from("leave_requests")
      .update({
        status: "rejected",
        decision_note: "Urlop został cofnięty przez administratora.",
        signature: null,
        generated_pdf_path: null,
        generated_pdf_name: null,
        google_calendar_event_id: null,
        updated_at: decidedAt,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await removeLeaveAbsence(admin, id).catch(() => undefined);
    await removeLeaveTimeEntriesServer(admin, id).catch(() => undefined);

    const [{ data: employeeRow }, { data: leaveTypeRow }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", item.profileId).single(),
      item.leaveTypeItemId
        ? admin.from("resource_dictionary_items").select("name").eq("id", item.leaveTypeItemId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!employeeRow) {
      throw new Error("Nie znaleziono profilu pracownika.");
    }
    const employee = mapProfileRow(employeeRow);
    const leaveTypeName = leaveTypeRow?.name ?? "Dostępność";

    await createLeaveRequestDecidedNotificationServer({
      leaveRequestId: id,
      employeeProfileId: item.profileId,
      approved: false,
      leaveTypeName,
      startDate: item.startDate,
      endDate: item.endDate,
      decisionNote: "Urlop został cofnięty przez administratora.",
    }).catch(() => undefined);

    await dispatchLeaveRequestDecidedSms({
      employeePhone: employee.phone,
      approved: false,
      leaveTypeName,
      startDate: item.startDate,
      endDate: item.endDate,
    }).catch(() => undefined);

    return NextResponse.json({ item: mapLeaveRequestRow(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
