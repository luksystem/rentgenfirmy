import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { UpdateWorkItemInput, WorkItemStatus } from "@/lib/my-work/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  deleteWorkItemServer,
  fetchWorkItemDetail,
  updateWorkItemServer,
  updateWorkItemStatusServer,
} from "@/lib/supabase/my-work-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const detail = await fetchWorkItemDetail(admin, id, userId, profile);
    if (!detail) {
      return NextResponse.json({ error: "Nie znaleziono zadania." }, { status: 404 });
    }
    return NextResponse.json({ detail });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json()) as UpdateWorkItemInput & { status?: WorkItemStatus };
    const admin = getSupabaseAdmin();

    const isStatusOnly =
      body.status &&
      Object.keys(body).filter((key) => key !== "status" && body[key as keyof typeof body] !== undefined)
        .length === 0;

    const detail = isStatusOnly
      ? await updateWorkItemStatusServer(admin, id, body.status!, profile)
      : await updateWorkItemServer(admin, id, body, profile);

    return NextResponse.json({ detail });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const url = new URL(request.url);
    const hard = url.searchParams.get("hard") === "true";
    const admin = getSupabaseAdmin();
    const result = await deleteWorkItemServer(admin, id, profile, { hard });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
