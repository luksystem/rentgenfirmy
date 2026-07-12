import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { WorkItemStatus } from "@/lib/my-work/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  fetchWorkItemDetail,
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
    const body = (await request.json()) as { status?: WorkItemStatus };
    if (!body.status) {
      return NextResponse.json({ error: "Brak statusu." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const detail = await updateWorkItemStatusServer(admin, id, body.status, profile);
    return NextResponse.json({ detail });
  } catch (error) {
    return jsonError(error);
  }
}
