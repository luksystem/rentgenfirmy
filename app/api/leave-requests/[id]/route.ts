import { NextResponse } from "next/server";
import { requireAdministratorProfile, requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getUserDisplayName, isAdministratorRole } from "@/lib/auth/types";
import { countLeaveDays, countLeaveWorkingDays } from "@/lib/leave/types";
import { generateLeaveCardPdf } from "@/lib/leave/leave-card-pdf";
import { syncApprovedLeaveAbsence } from "@/lib/leave/leave-absence-sync";
import { syncApprovedLeaveToTimeTrackingServer } from "@/lib/supabase/time-tracking-leave-sync-server";
import { deleteCalendarEvent, upsertAllDayCalendarEvent } from "@/lib/google/calendar";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchLeaveRequestByIdServer, mapLeaveRequestRow } from "@/lib/supabase/leave-request-server";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { fetchLeaveCardTemplateSettingsServer } from "@/lib/supabase/leave-settings-server";
import { LEAVE_CARDS_BUCKET } from "@/lib/supabase/leave-card-repository";

function canView(request: { profileId: string; supervisorId: string | null }, userId: string, isAdmin: boolean) {
  return isAdmin || request.profileId === userId || request.supervisorId === userId;
}

async function downloadStorageFile(
  admin: ReturnType<typeof getSupabaseAdmin>,
  bucket: string,
  filePath: string,
): Promise<ArrayBuffer | null> {
  const { data, error } = await admin.storage.from(bucket).download(filePath);
  if (error || !data) {
    return null;
  }
  return data.arrayBuffer();
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

/** Administrator edytuje daty / typ / notatkę — także dla zaakceptowanych (z ponowną synchronizacją). */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdministratorProfile();
    const { id } = await context.params;
    const body = await request.json();
    const admin = getSupabaseAdmin();

    const item = await fetchLeaveRequestByIdServer(admin, id);
    if (!item) {
      return NextResponse.json({ error: "Nie znaleziono wniosku." }, { status: 404 });
    }

    const leaveTypeItemId =
      typeof body.leaveTypeItemId === "string" ? body.leaveTypeItemId.trim() : item.leaveTypeItemId ?? "";
    const startDate = typeof body.startDate === "string" ? body.startDate : item.startDate;
    const endDate = typeof body.endDate === "string" ? body.endDate : item.endDate;
    const note = typeof body.note === "string" ? body.note.trim() : item.note;

    if (!leaveTypeItemId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Wybierz typ dostępności oraz zakres dat." },
        { status: 400 },
      );
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ error: "Data „do” nie może być wcześniejsza niż data „od”." }, { status: 400 });
    }

    const [{ data: employeeRow }, { data: leaveTypeRow }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", item.profileId).single(),
      admin.from("resource_dictionary_items").select("name").eq("id", leaveTypeItemId).maybeSingle(),
    ]);

    if (!employeeRow) {
      throw new Error("Nie znaleziono profilu pracownika.");
    }

    const employee = mapProfileRow(employeeRow);
    const employeeName = getUserDisplayName(employee);
    const leaveTypeName = leaveTypeRow?.name ?? "Dostępność";
    const now = new Date().toISOString();

    let generatedPdfPath = item.generatedPdfPath;
    let generatedPdfName = item.generatedPdfName;
    let googleCalendarEventId = item.googleCalendarEventId;

    if (item.status === "approved") {
      if (item.signature) {
        const dayCount = countLeaveDays(startDate, endDate);
        const workingDayCount = countLeaveWorkingDays(startDate, endDate);
        const decidedByName = item.signature.signerName;
        const decidedAt = item.decidedAt ?? item.signature.signedAt;

        const templateSettings = await fetchLeaveCardTemplateSettingsServer().catch(() => ({
          path: null,
          name: null,
        }));
        const originalPdfBytes = templateSettings.path
          ? await downloadStorageFile(admin, LEAVE_CARDS_BUCKET, templateSettings.path)
          : null;

        const pdfBytes = await generateLeaveCardPdf({
          employeeName,
          leaveTypeName,
          startDate,
          endDate,
          dayCount,
          workingDayCount,
          note,
          status: "approved",
          decidedByName,
          decidedAt,
          signature: item.signature,
          originalPdfBytes,
        });

        const pdfPath = `${item.profileId}/${id}.pdf`;
        const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
        const { error: uploadError } = await admin.storage
          .from(LEAVE_CARDS_BUCKET)
          .upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });
        if (uploadError) {
          throw new Error(uploadError.message);
        }

        generatedPdfPath = pdfPath;
        generatedPdfName = `Karta-urlopowa-${employeeName.replace(/\s+/g, "_")}-${startDate}.pdf`;
      }

      googleCalendarEventId = await upsertAllDayCalendarEvent({
        eventId: item.googleCalendarEventId,
        summary: `${leaveTypeName} ${employeeName}`,
        startDate,
        endDate,
        description: note || undefined,
      });
    }

    const { data: updated, error } = await admin
      .from("leave_requests")
      .update({
        leave_type_item_id: leaveTypeItemId,
        start_date: startDate,
        end_date: endDate,
        note,
        generated_pdf_path: generatedPdfPath,
        generated_pdf_name: generatedPdfName,
        google_calendar_event_id: googleCalendarEventId,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const leaveRequest = mapLeaveRequestRow(updated);

    if (leaveRequest.status === "approved") {
      await syncApprovedLeaveAbsence(
        admin,
        {
          id: leaveRequest.id,
          profileId: leaveRequest.profileId,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
        },
        leaveTypeName,
      ).catch(() => undefined);

      await syncApprovedLeaveToTimeTrackingServer(
        admin,
        {
          id: leaveRequest.id,
          profileId: leaveRequest.profileId,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          note: leaveRequest.note,
        },
        leaveTypeName,
      ).catch(() => undefined);
    }

    return NextResponse.json({ item: leaveRequest });
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
