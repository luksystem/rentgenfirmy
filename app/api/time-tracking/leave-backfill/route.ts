import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { hasFullAppAccess } from "@/lib/auth/types";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { backfillApprovedLeaveTimeEntriesServer } from "@/lib/supabase/time-tracking-leave-sync-server";

export async function POST() {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!hasFullAppAccess(profile.role)) {
      return NextResponse.json({ error: "Brak uprawnień administratora." }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { data: dictionaryItems, error: dictionaryError } = await admin
      .from("resource_dictionary_items")
      .select("id, name")
      .eq("dictionary_key", "leave_type");

    if (dictionaryError) {
      throw new Error(dictionaryError.message);
    }

    const labelById = new Map(
      (dictionaryItems ?? []).map((row) => [row.id as string, row.name as string]),
    );

    const result = await backfillApprovedLeaveTimeEntriesServer(admin, (leaveTypeItemId) =>
      leaveTypeItemId ? (labelById.get(leaveTypeItemId) ?? "Urlop") : "Urlop",
    );

    return NextResponse.json({ result });
  } catch (error) {
    return jsonError(error);
  }
}
