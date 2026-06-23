import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import type { SystemCredentialInput } from "@/lib/dashboard/system-credentials-types";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  createProjectSystemCredential,
  listProjectSystemCredentials,
} from "@/lib/supabase/project-system-credentials-server";

function parseCreateBody(body: unknown): SystemCredentialInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const data = body as Record<string, unknown>;
  if (typeof data.label !== "string" || typeof data.password !== "string") {
    return null;
  }
  return {
    label: data.label,
    password: data.password,
    systemUrl: typeof data.systemUrl === "string" ? data.systemUrl : null,
    loginUsername: typeof data.loginUsername === "string" ? data.loginUsername : null,
    notes: typeof data.notes === "string" ? data.notes : null,
    visibleToClient: data.visibleToClient !== false,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { projectId } = await context.params;
    const credentials = await listProjectSystemCredentials(projectId);
    return NextResponse.json({ credentials });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania haseł." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { projectId } = await context.params;
    const body = parseCreateBody(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
    }

    const credential = await createProjectSystemCredential(
      projectId,
      body,
      getUserDisplayName(profile),
    );
    return NextResponse.json({ credential });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd zapisu hasła." },
      { status: 400 },
    );
  }
}
