import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { isAdministratorRole } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchLeaveRequestByIdServer } from "@/lib/supabase/leave-request-server";
import { correctSubstitutionSlotServer, fetchSubstitutionSlotsForRequestServer } from "@/lib/supabase/leave-substitution-slot-server";

/** Faza 13 Krok 1 (docs/role/04 §6.2 pkt 2) — wnioskujący koryguje wyjątki, nie wypełnia pustych pól. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = await request.json();
    const selectedUserId = typeof body.selectedUserId === "string" ? body.selectedUserId.trim() : "";
    if (!selectedUserId) {
      return NextResponse.json({ error: "Wybierz osobę do pokrycia slotu." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: slotRow, error: slotError } = await admin
      .from("leave_substitution_slot")
      .select("leave_request_id")
      .eq("id", id)
      .maybeSingle();
    if (slotError) throw new Error(slotError.message);
    if (!slotRow) {
      return NextResponse.json({ error: "Nie znaleziono pozycji listy pokrycia." }, { status: 404 });
    }

    const leaveRequest = await fetchLeaveRequestByIdServer(admin, slotRow.leave_request_id);
    if (!leaveRequest) {
      return NextResponse.json({ error: "Nie znaleziono wniosku." }, { status: 404 });
    }

    const isAdmin = isAdministratorRole(profile.role);
    if (!isAdmin && leaveRequest.profileId !== userId) {
      return NextResponse.json(
        { error: "Tylko wnioskujący lub administrator może skorygować listę pokrycia." },
        { status: 403 },
      );
    }

    await correctSubstitutionSlotServer(admin, id, selectedUserId);
    const slots = await fetchSubstitutionSlotsForRequestServer(admin, slotRow.leave_request_id);
    return NextResponse.json({ items: slots });
  } catch (error) {
    return jsonError(error);
  }
}
