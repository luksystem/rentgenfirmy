import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getUserDisplayName, isAdministratorRole } from "@/lib/auth/types";
import { countLeaveDays, countLeaveWorkingDays } from "@/lib/leave/types";
import { generateLeaveCardPdf } from "@/lib/leave/leave-card-pdf";
import { dispatchLeaveRequestDecidedSms } from "@/lib/leave/leave-sms";
import { syncApprovedLeaveAbsence } from "@/lib/leave/leave-absence-sync";
import { syncApprovedLeaveToTimeTrackingServer } from "@/lib/supabase/time-tracking-leave-sync-server";
import { createAllDayCalendarEvent } from "@/lib/google/calendar";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  canDecideLeaveRequest,
  fetchLeaveRequestByIdServer,
  mapLeaveRequestRow,
} from "@/lib/supabase/leave-request-server";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { fetchLeaveCardTemplateSettingsServer } from "@/lib/supabase/leave-settings-server";
import { LEAVE_CARDS_BUCKET } from "@/lib/supabase/leave-card-repository";
import { createLeaveRequestDecidedNotificationServer } from "@/lib/notifications/server";

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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = await request.json();

    const decision = body?.decision === "approve" ? "approve" : body?.decision === "reject" ? "reject" : null;
    if (!decision) {
      return NextResponse.json({ error: "Nieprawidłowa decyzja." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const item = await fetchLeaveRequestByIdServer(admin, id);
    if (!item) {
      return NextResponse.json({ error: "Nie znaleziono wniosku." }, { status: 404 });
    }

    const isAdmin = isAdministratorRole(profile.role);
    if (!canDecideLeaveRequest(item, userId, isAdmin)) {
      return NextResponse.json(
        { error: "Tylko przełożony wnioskodawcy lub administrator może podjąć decyzję." },
        { status: 403 },
      );
    }

    if (item.status !== "pending") {
      return NextResponse.json(
        { error: "Ten wniosek został już rozstrzygnięty — decyzji nie można zmienić (poza administratorem)." },
        { status: 400 },
      );
    }

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
    const employeeName = getUserDisplayName(employee);
    const leaveTypeName = leaveTypeRow?.name ?? "Dostępność";
    const decidedByName = getUserDisplayName(profile);
    const decidedAt = new Date().toISOString();

    if (decision === "reject") {
      const decisionNote = typeof body.decisionNote === "string" ? body.decisionNote.trim() : "";

      const { data: updated, error: updateError } = await admin
        .from("leave_requests")
        .update({
          status: "rejected",
          decided_by: userId,
          decided_at: decidedAt,
          decision_note: decisionNote,
          updated_at: decidedAt,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      await createLeaveRequestDecidedNotificationServer({
        leaveRequestId: id,
        employeeProfileId: item.profileId,
        approved: false,
        leaveTypeName,
        startDate: item.startDate,
        endDate: item.endDate,
        decisionNote,
      }).catch(() => undefined);

      await dispatchLeaveRequestDecidedSms({
        employeePhone: employee.phone,
        approved: false,
        leaveTypeName,
        startDate: item.startDate,
        endDate: item.endDate,
      }).catch(() => undefined);

      return NextResponse.json({ item: mapLeaveRequestRow(updated) });
    }

    // decision === "approve"
    const signatureInput = body?.signature;
    const imageDataUrl = typeof signatureInput?.imageDataUrl === "string" ? signatureInput.imageDataUrl : "";
    const signerName = typeof signatureInput?.signerName === "string" ? signatureInput.signerName.trim() : "";

    if (!imageDataUrl || !signerName) {
      return NextResponse.json(
        { error: "Do akceptacji urlopu wymagany jest podpis oraz imię i nazwisko podpisującego." },
        { status: 400 },
      );
    }

    const signature = { imageDataUrl, signerName, signedAt: decidedAt };
    const dayCount = countLeaveDays(item.startDate, item.endDate);
    const workingDayCount = countLeaveWorkingDays(item.startDate, item.endDate);

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
      startDate: item.startDate,
      endDate: item.endDate,
      dayCount,
      workingDayCount,
      note: item.note,
      status: "approved",
      decidedByName,
      decidedAt,
      signature,
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

    const calendarEventId = await createAllDayCalendarEvent({
      summary: `${leaveTypeName} ${employeeName}`,
      startDate: item.startDate,
      endDate: item.endDate,
      description: item.note || undefined,
    });

    const { data: updated, error: updateError } = await admin
      .from("leave_requests")
      .update({
        status: "approved",
        decided_by: userId,
        decided_at: decidedAt,
        decision_note: "",
        signature,
        generated_pdf_path: pdfPath,
        generated_pdf_name: `Karta-urlopowa-${employeeName.replace(/\s+/g, "_")}-${item.startDate}.pdf`,
        google_calendar_event_id: calendarEventId,
        updated_at: decidedAt,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    await syncApprovedLeaveAbsence(
      admin,
      { id, profileId: item.profileId, startDate: item.startDate, endDate: item.endDate },
      leaveTypeName,
    ).catch(() => undefined);

    await syncApprovedLeaveToTimeTrackingServer(
      admin,
      {
        id,
        profileId: item.profileId,
        startDate: item.startDate,
        endDate: item.endDate,
        note: item.note,
      },
      leaveTypeName,
    ).catch(() => undefined);

    await createLeaveRequestDecidedNotificationServer({
      leaveRequestId: id,
      employeeProfileId: item.profileId,
      approved: true,
      leaveTypeName,
      startDate: item.startDate,
      endDate: item.endDate,
    }).catch(() => undefined);

    await dispatchLeaveRequestDecidedSms({
      employeePhone: employee.phone,
      approved: true,
      leaveTypeName,
      startDate: item.startDate,
      endDate: item.endDate,
    }).catch(() => undefined);

    return NextResponse.json({ item: mapLeaveRequestRow(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
