import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  deleteTaskChecklistItemServer,
  updateTaskChecklistItemServer,
} from "@/lib/supabase/task-checklist-server";
import type { UpdateTaskChecklistItemInput } from "@/lib/task-checklist/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json()) as UpdateTaskChecklistItemInput;

    const admin = getSupabaseAdmin();
    const item = await updateTaskChecklistItemServer(admin, id, body, profile);
    return NextResponse.json({ item });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { id } = await context.params;

    const admin = getSupabaseAdmin();
    await deleteTaskChecklistItemServer(admin, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
