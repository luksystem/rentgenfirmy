import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { isAdministratorRole } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Liczba wniosków urlopowych czekających na decyzję tego użytkownika (jako przełożony lub administrator)
 * — używana w dzwoneczku (sekcja „Pracownicy”). */
export async function GET() {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();

    let query = admin
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (!isAdministratorRole(profile.role)) {
      query = query.eq("supervisor_id", userId);
    }

    const { count, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ pendingForMeCount: count ?? 0 });
  } catch (error) {
    return jsonError(error);
  }
}
