import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { generateWorkTaskSuggestions } from "@/lib/ai/my-work-ai";
import { getUserDisplayName } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { canManageWorkItems, fetchWorkItemsForUser } from "@/lib/supabase/my-work-server";

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!canManageWorkItems(profile)) {
      return NextResponse.json({ error: "Brak uprawnień do sugestii AI zadań." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      assignedUserId?: string;
      contextNote?: string;
    };
    const admin = getSupabaseAdmin();
    const items = await fetchWorkItemsForUser(admin, profile.id, profile, {
      scope: "team",
      assignedUserId: body.assignedUserId ?? null,
      syncKanban: false,
    });

    let assignedUserName: string | undefined;
    if (body.assignedUserId) {
      const { data } = await admin
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", body.assignedUserId)
        .maybeSingle();
      if (data) {
        assignedUserName = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
      }
    }

    const result = await generateWorkTaskSuggestions({
      items,
      managerName: getUserDisplayName(profile),
      assignedUserName,
      contextNote: body.contextNote,
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
