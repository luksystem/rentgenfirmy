import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { analyzeWorkPlanRisks } from "@/lib/ai/my-work-ai";
import { getUserDisplayName } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchCurrentWeekPlanServer } from "@/lib/supabase/my-work-plans-server";
import { fetchWorkItemsForUser } from "@/lib/supabase/my-work-server";

export async function POST() {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const [items, plan] = await Promise.all([
      fetchWorkItemsForUser(admin, profile.id, profile, { scope: "my", syncKanban: false }),
      fetchCurrentWeekPlanServer(admin, profile.id),
    ]);

    const result = await analyzeWorkPlanRisks({
      items,
      plan,
      employeeName: getUserDisplayName(profile),
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
