import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { canManagerWorkItems } from "@/lib/my-work/permissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncWorkItemsFromResourcePlanItemServer } from "@/lib/supabase/resource-plan-work-item-sync-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    if (!canManagerWorkItems(profile.role)) {
      const { data: planItem, error } = await admin
        .from("resource_plan_items")
        .select("assignee_id")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      if (!planItem) {
        return NextResponse.json({ error: "Nie znaleziono przydziału." }, { status: 404 });
      }

      const isAssignee = planItem.assignee_id === userId;
      let isParticipant = false;
      if (!isAssignee) {
        const { data: participant } = await admin
          .from("resource_plan_item_participants")
          .select("id")
          .eq("plan_item_id", id)
          .eq("user_id", userId)
          .maybeSingle();
        isParticipant = Boolean(participant);
      }
      if (!isAssignee && !isParticipant) {
        return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
      }
    }

    await syncWorkItemsFromResourcePlanItemServer(admin, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
