import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { isAdministratorRole } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { acceptSubstitutionSlotServer } from "@/lib/supabase/leave-substitution-slot-server";

/** Faza 13 Krok 1 (docs/role/04 §6.2 pkt 3) — kandydat akceptuje kartę przekazania jednym kliknięciem. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const { data: slotRow, error: slotError } = await admin
      .from("leave_substitution_slot")
      .select("selected_user_id, status")
      .eq("id", id)
      .maybeSingle();
    if (slotError) throw new Error(slotError.message);
    if (!slotRow) {
      return NextResponse.json({ error: "Nie znaleziono pozycji listy pokrycia." }, { status: 404 });
    }

    const isAdmin = isAdministratorRole(profile.role);
    if (!isAdmin && slotRow.selected_user_id !== userId) {
      return NextResponse.json(
        { error: "Tylko zaproponowany kandydat lub administrator może zaakceptować kartę przekazania." },
        { status: 403 },
      );
    }
    if (slotRow.status === "luka") {
      return NextResponse.json({ error: "Ten slot nie ma przypisanego kandydata." }, { status: 400 });
    }

    await acceptSubstitutionSlotServer(admin, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
