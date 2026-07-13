import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createTaskChecklistItemServer,
  fetchTaskChecklistItemsServer,
} from "@/lib/supabase/task-checklist-server";
import type { CreateTaskChecklistItemInput, TaskChecklistParent } from "@/lib/task-checklist/types";

function resolveParent(searchParams: URLSearchParams): TaskChecklistParent | null {
  const workItemId = searchParams.get("workItemId");
  const resourcePlanItemId = searchParams.get("resourcePlanItemId");
  if (workItemId && !resourcePlanItemId) {
    return { kind: "work_item", id: workItemId };
  }
  if (resourcePlanItemId && !workItemId) {
    return { kind: "resource_plan_item", id: resourcePlanItemId };
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAuthenticatedProfile();
    const parent = resolveParent(new URL(request.url).searchParams);
    if (!parent) {
      return NextResponse.json({ error: "Podaj workItemId lub resourcePlanItemId." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const items = await fetchTaskChecklistItemsServer(admin, parent);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as CreateTaskChecklistItemInput;
    if (!body.parent?.kind || !body.parent.id) {
      return NextResponse.json({ error: "Brak rodzica podzadania." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const item = await createTaskChecklistItemServer(admin, body, profile);
    return NextResponse.json({ item });
  } catch (error) {
    return jsonError(error);
  }
}
