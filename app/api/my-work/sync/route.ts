import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchWorkItemsForUser } from "@/lib/supabase/my-work-server";

export async function POST() {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const items = await fetchWorkItemsForUser(admin, userId, profile, { syncKanban: true });
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
