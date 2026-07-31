import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchMySubstitutionProposalsServer } from "@/lib/supabase/leave-substitution-slot-server";

/** Faza 13 Krok 1 (docs/role/04 §6.2 pkt 3) — propozycje zastępstwa skierowane do mnie. */
export async function GET() {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const items = await fetchMySubstitutionProposalsServer(admin, userId);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
