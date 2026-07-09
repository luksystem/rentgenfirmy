import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LeaveRequestRow } from "@/lib/supabase/database.types";
import type { LeaveRequest, LeaveSignature } from "@/lib/leave/types";

type AdminClient = SupabaseClient<Database>;

export function mapLeaveRequestRow(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    profileId: row.profile_id,
    leaveTypeItemId: row.leave_type_item_id,
    startDate: row.start_date,
    endDate: row.end_date,
    note: row.note,
    status: row.status as LeaveRequest["status"],
    supervisorId: row.supervisor_id,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    decisionNote: row.decision_note,
    signature: (row.signature as LeaveSignature | null) ?? null,
    generatedPdfPath: row.generated_pdf_path,
    generatedPdfName: row.generated_pdf_name,
    googleCalendarEventId: row.google_calendar_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchLeaveRequestByIdServer(
  admin: AdminClient,
  id: string,
): Promise<LeaveRequest | null> {
  const { data, error } = await admin.from("leave_requests").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapLeaveRequestRow(data) : null;
}

/** Administrator LUB przełożony przypisany w chwili złożenia wniosku. */
export function canDecideLeaveRequest(request: LeaveRequest, userId: string, isAdministrator: boolean) {
  return isAdministrator || request.supervisorId === userId;
}

export function canViewAllLeaveRequests(isAdministrator: boolean, isManager: boolean) {
  return isAdministrator || isManager;
}
