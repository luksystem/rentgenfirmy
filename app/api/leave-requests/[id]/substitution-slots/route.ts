import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { isAdministratorRole } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchLeaveRequestByIdServer } from "@/lib/supabase/leave-request-server";
import { fetchSubstitutionSlotsForRequestServer } from "@/lib/supabase/leave-substitution-slot-server";

/** Faza 13 Krok 1 (docs/role/04 §6.2) — lista pokrycia dla wniosku. Widoczna wnioskującemu,
 * jego przełożonemu i administratorowi — ten sam krąg co szczegóły wniosku. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const leaveRequest = await fetchLeaveRequestByIdServer(admin, id);
    if (!leaveRequest) {
      return NextResponse.json({ error: "Nie znaleziono wniosku." }, { status: 404 });
    }

    const isAdmin = isAdministratorRole(profile.role);
    const canView =
      isAdmin || leaveRequest.profileId === userId || leaveRequest.supervisorId === userId;
    if (!canView) {
      return NextResponse.json({ error: "Brak dostępu do tego wniosku." }, { status: 403 });
    }

    const slots = await fetchSubstitutionSlotsForRequestServer(admin, id);
    return NextResponse.json({ items: slots });
  } catch (error) {
    return jsonError(error);
  }
}
