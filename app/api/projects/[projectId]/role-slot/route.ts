import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { hasFullAppAccess } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PROCESS_ROLE_CODES, type ProcessRoleCode } from "@/lib/process/types";
import {
  assertUserCanAccessProjectServer,
  fetchProjectAssignedProfilesServer,
  fetchProjectRoleSlotsServer,
  setProjectRoleSlotServer,
} from "@/lib/supabase/project-access-server";

type RouteContext = { params: Promise<{ projectId: string }> };

function parseRoleCode(value: unknown): ProcessRoleCode {
  if (typeof value === "string" && (PROCESS_ROLE_CODES as readonly string[]).includes(value)) {
    return value as ProcessRoleCode;
  }
  throw new HttpError(400, "Nieprawidłowy kod roli.");
}

/**
 * D46 (D20 §2) — edytor pojedynczego slotu, osobna ścieżka od zagregowanych checkboxów
 * (`.../accessible-profiles/[profileId]/role`, ustawia PARY ról). Tu jeden kod roli -> jedna
 * osoba (`assigneeId`, `null` zdejmuje obsadę bez wskazania następcy) — pokrywa `wlasciciel` i
 * `asystent_procesu`, które nie mają żadnego checkboxa, oraz pozwala rozdzielić pary.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!hasFullAppAccess(profile.role)) {
      throw new HttpError(403, "Tylko administrator lub manager może przypisywać role projektowe.");
    }

    const { projectId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const roleCode = parseRoleCode(body?.roleCode);
    const assigneeId = typeof body?.assigneeId === "string" ? body.assigneeId : null;

    const admin = getSupabaseAdmin();
    await assertUserCanAccessProjectServer(admin, profile, projectId);

    await setProjectRoleSlotServer(admin, { projectId, roleCode, profileId: assigneeId });
    const [profiles, slots] = await Promise.all([
      fetchProjectAssignedProfilesServer(admin, projectId),
      fetchProjectRoleSlotsServer(admin, projectId),
    ]);
    return NextResponse.json({ profiles, slots });
  } catch (error) {
    return jsonError(error);
  }
}
