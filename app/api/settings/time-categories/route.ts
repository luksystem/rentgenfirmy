import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import {
  createTimeCategoryAdminServer,
  listTimeCategoriesAdminServer,
  type AdminTimeCategoryInput,
} from "@/lib/supabase/time-categories-admin-server";

export async function GET() {
  try {
    await requireAdministratorProfile();
    const categories = await listTimeCategoriesAdminServer({ includeInactive: true });
    return NextResponse.json({ categories });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdministratorProfile();
    const body = (await request.json()) as AdminTimeCategoryInput;
    const category = await createTimeCategoryAdminServer(body);
    return NextResponse.json({ category });
  } catch (error) {
    return jsonError(error);
  }
}
