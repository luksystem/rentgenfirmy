import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import type { SystemCredentialUpdateInput } from "@/lib/dashboard/system-credentials-types";
import {
  deleteProjectSystemCredential,
  updateProjectSystemCredential,
} from "@/lib/supabase/project-system-credentials-server";

function parseUpdateBody(body: unknown): SystemCredentialUpdateInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const data = body as Record<string, unknown>;
  return {
    label: typeof data.label === "string" ? data.label : undefined,
    password: typeof data.password === "string" ? data.password : undefined,
    systemUrl:
      data.systemUrl === null || typeof data.systemUrl === "string" ? data.systemUrl : undefined,
    loginUsername:
      data.loginUsername === null || typeof data.loginUsername === "string"
        ? data.loginUsername
        : undefined,
    notes: data.notes === null || typeof data.notes === "string" ? data.notes : undefined,
    visibleToClient: typeof data.visibleToClient === "boolean" ? data.visibleToClient : undefined,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ credentialId: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { credentialId } = await context.params;
    const body = parseUpdateBody(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
    }

    const credential = await updateProjectSystemCredential(credentialId, body);
    return NextResponse.json({ credential });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd aktualizacji." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ credentialId: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { credentialId } = await context.params;
    await deleteProjectSystemCredential(credentialId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd usuwania." },
      { status: 400 },
    );
  }
}
