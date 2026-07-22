import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchXpEmployeeDetailForAdminServer } from "@/lib/supabase/xp-admin-server";

export async function GET(request: Request, context: { params: Promise<{ employeeId: string }> }) {
  try {
    await requireAdministratorProfile();
    const { employeeId } = await context.params;
    const admin = getSupabaseAdmin();
    const detail = await fetchXpEmployeeDetailForAdminServer(admin, employeeId);
    return NextResponse.json({ detail });
  } catch (error) {
    return jsonError(error);
  }
}
