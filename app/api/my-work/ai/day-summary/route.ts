import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { generateWorkDaySummaryDraft } from "@/lib/ai/my-work-ai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchWorkItemsForUser } from "@/lib/supabase/my-work-server";
import { getUserDisplayName } from "@/lib/auth/types";

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const body = (await request.json().catch(() => ({}))) as { sessionDate?: string };
    const admin = getSupabaseAdmin();
    const sessionDate = body.sessionDate ?? new Date().toISOString().slice(0, 10);
    const items = await fetchWorkItemsForUser(admin, profile.id, profile, {
      scope: "my",
      syncKanban: false,
    });

    const result = await generateWorkDaySummaryDraft({
      items,
      employeeName: getUserDisplayName(profile),
      sessionDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
