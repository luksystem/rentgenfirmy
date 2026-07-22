import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchXpCriteriaServer } from "@/lib/supabase/xp-server";

export async function GET() {
  try {
    await requireAdministratorProfile();
    const admin = getSupabaseAdmin();
    const items = await fetchXpCriteriaServer(admin);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
