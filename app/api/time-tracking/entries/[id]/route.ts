import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { UpdateTimeEntryInput } from "@/lib/time-tracking/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  deleteTimeEntryServer,
  fetchTimeEntryByIdServer,
  updateTimeEntryServer,
} from "@/lib/supabase/time-tracking-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const entry = await fetchTimeEntryByIdServer(admin, profile, id);
    if (!entry) {
      return NextResponse.json({ error: "Wpis nie istnieje." }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json()) as UpdateTimeEntryInput;
    const admin = getSupabaseAdmin();
    const entry = await updateTimeEntryServer(admin, profile, id, body);
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    await deleteTimeEntryServer(admin, profile, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
