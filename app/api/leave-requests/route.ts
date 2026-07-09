import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getUserDisplayName, hasFullAppAccess } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapLeaveRequestRow } from "@/lib/supabase/leave-request-server";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import {
  createLeaveRequestCreatedNotificationsServer,
} from "@/lib/notifications/server";
import { dispatchLeaveRequestCreatedSms } from "@/lib/leave/leave-sms";

export async function GET(request: Request) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status");
    const profileIdParam = url.searchParams.get("profileId");

    const admin = getSupabaseAdmin();
    let query = admin.from("leave_requests").select("*").order("start_date", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (hasFullAppAccess(profile.role)) {
      if (profileIdParam) {
        query = query.eq("profile_id", profileIdParam);
      }
    } else {
      // Zwykły użytkownik widzi swoje wnioski oraz wnioski osób, których jest przełożonym.
      query = query.or(`profile_id.eq.${userId},supervisor_id.eq.${userId}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ items: (data ?? []).map(mapLeaveRequestRow) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const body = await request.json();

    const leaveTypeItemId = typeof body.leaveTypeItemId === "string" ? body.leaveTypeItemId : "";
    const startDate = typeof body.startDate === "string" ? body.startDate : "";
    const endDate = typeof body.endDate === "string" ? body.endDate : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!leaveTypeItemId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Wybierz typ dostępności oraz zakres dat." },
        { status: 400 },
      );
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ error: "Data „do” nie może być wcześniejsza niż data „od”." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const supervisorId = profile.supervisorId;

    const { data: inserted, error: insertError } = await admin
      .from("leave_requests")
      .insert({
        profile_id: userId,
        leave_type_item_id: leaveTypeItemId,
        start_date: startDate,
        end_date: endDate,
        note,
        status: "pending",
        supervisor_id: supervisorId,
      })
      .select("*")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    const leaveRequest = mapLeaveRequestRow(inserted);

    const [{ data: leaveTypeRow }, { data: adminRows }, { data: supervisorRow }] = await Promise.all([
      admin.from("resource_dictionary_items").select("name").eq("id", leaveTypeItemId).maybeSingle(),
      admin.from("profiles").select("*").eq("role", "administrator").eq("is_active", true),
      supervisorId
        ? admin.from("profiles").select("*").eq("id", supervisorId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const employeeName = getUserDisplayName(profile);
    const leaveTypeName = leaveTypeRow?.name ?? "Dostępność";
    const adminIds = (adminRows ?? []).map((row) => row.id).filter((id) => id !== userId);
    const recipientIds = supervisorId ? [supervisorId, ...adminIds] : adminIds;

    await createLeaveRequestCreatedNotificationsServer({
      leaveRequestId: leaveRequest.id,
      employeeName,
      leaveTypeName,
      startDate,
      endDate,
      recipientProfileIds: recipientIds,
    }).catch(() => undefined);

    if (supervisorRow) {
      const supervisor = mapProfileRow(supervisorRow);
      await dispatchLeaveRequestCreatedSms({
        supervisorPhone: supervisor.phone,
        employeeName,
        leaveTypeName,
        startDate,
        endDate,
      }).catch(() => undefined);
    }

    return NextResponse.json({ item: leaveRequest }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
