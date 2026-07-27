import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  assertUserCanAccessProjectServer,
  fetchProjectAssignedProfilesServer,
  fetchProjectRoleSlotsServer,
} from "@/lib/supabase/project-access-server";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { projectId } = await context.params;
    const admin = getSupabaseAdmin();
    await assertUserCanAccessProjectServer(admin, profile, projectId);
    const [profiles, slots] = await Promise.all([
      fetchProjectAssignedProfilesServer(admin, projectId),
      fetchProjectRoleSlotsServer(admin, projectId),
    ]);
    return NextResponse.json({ profiles, slots });
  } catch (error) {
    return jsonError(error);
  }
}
