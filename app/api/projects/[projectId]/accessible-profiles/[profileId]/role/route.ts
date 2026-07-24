import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { hasFullAppAccess } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  assertUserCanAccessProjectServer,
  fetchProjectAssignedProfilesServer,
  setProjectRoleFlagServer,
  type ProjectRoleFlags,
} from "@/lib/supabase/project-access-server";

type RouteContext = { params: Promise<{ projectId: string; profileId: string }> };

const VALID_FIELDS: (keyof ProjectRoleFlags)[] = ["technicalLead", "operationalLead", "developer"];

function parseField(value: unknown): keyof ProjectRoleFlags {
  if (typeof value === "string" && (VALID_FIELDS as string[]).includes(value)) {
    return value as keyof ProjectRoleFlags;
  }
  throw new HttpError(400, "Nieprawidłowe pole roli.");
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!hasFullAppAccess(profile.role)) {
      throw new HttpError(403, "Tylko administrator lub manager może przypisywać role projektowe.");
    }

    const { projectId, profileId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const field = parseField(body?.field);
    const value = body?.value === true;

    const admin = getSupabaseAdmin();
    await assertUserCanAccessProjectServer(admin, profile, projectId);

    await setProjectRoleFlagServer(admin, { projectId, profileId, field, value });
    const profiles = await fetchProjectAssignedProfilesServer(admin, projectId);
    return NextResponse.json({ profiles });
  } catch (error) {
    return jsonError(error);
  }
}
