import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import {
  deactivateTimeCategoryAdminServer,
  updateTimeCategoryAdminServer,
  type AdminTimeCategoryInput,
} from "@/lib/supabase/time-categories-admin-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAdministratorProfile();
    const { id } = await context.params;
    const body = (await request.json()) as AdminTimeCategoryInput;
    const category = await updateTimeCategoryAdminServer(id, body);
    return NextResponse.json({ category });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdministratorProfile();
    const { id } = await context.params;
    await deactivateTimeCategoryAdminServer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
