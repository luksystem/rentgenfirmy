import { NextResponse } from "next/server";
import type { ProfileProjectAccessState } from "@/lib/project-access/types";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  fetchProfileProjectAccessServer,
  saveProfileProjectAccessServer,
} from "@/lib/supabase/project-access-server";

type RouteContext = { params: Promise<{ id: string }> };

function parseBody(body: unknown): ProfileProjectAccessState | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const data = body as Record<string, unknown>;
  if (typeof data.allProjectsAccess !== "boolean") {
    return null;
  }
  if (!Array.isArray(data.projectIds)) {
    return null;
  }
  return {
    allProjectsAccess: data.allProjectsAccess,
    projectIds: data.projectIds.filter((entry): entry is string => typeof entry === "string"),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAdministratorProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const access = await fetchProfileProjectAccessServer(admin, id);
    return NextResponse.json({ access });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAdministratorProfile();
    const { id } = await context.params;
    const body = parseBody(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Nieprawidłowe dane dostępu do projektów." }, { status: 400 });
    }
    const admin = getSupabaseAdmin();
    const access = await saveProfileProjectAccessServer(admin, id, body);
    return NextResponse.json({ access });
  } catch (error) {
    return jsonError(error);
  }
}
