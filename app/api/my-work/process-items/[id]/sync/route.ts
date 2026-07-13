import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { canManagerWorkItems } from "@/lib/my-work/permissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncWorkItemsFromProcessItemServer } from "@/lib/supabase/process-work-item-sync-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    if (!canManagerWorkItems(profile.role)) {
      const { data: processItem, error } = await admin
        .from("project_process_items")
        .select("assignee_id")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      if (!processItem) {
        return NextResponse.json({ error: "Nie znaleziono elementu procesu." }, { status: 404 });
      }
      if (processItem.assignee_id !== userId) {
        return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
      }
    }

    await syncWorkItemsFromProcessItemServer(admin, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
