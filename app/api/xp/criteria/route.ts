import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchXpCriteriaServer } from "@/lib/supabase/xp-server";

/** Katalog kryteriów (jak zdobyć punkty) — jawny dla każdego zalogowanego, motywacyjnie. */
export async function GET() {
  try {
    await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const items = (await fetchXpCriteriaServer(admin)).filter((criterion) => criterion.isActive);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
