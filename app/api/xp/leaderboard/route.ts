import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchXpLeaderboardServer } from "@/lib/supabase/xp-server";

/** Jawny ranking — widoczny dla każdego zalogowanego pracownika, nie tylko manager/admin. */
export async function GET() {
  try {
    await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const items = await fetchXpLeaderboardServer(admin);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
