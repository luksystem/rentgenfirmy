import { NextResponse } from "next/server";
import { requireIntegrationAdmin } from "@/lib/auth/integration-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import type { IntegrationUpdateInput } from "@/lib/integrations/types";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  deleteProjectIntegration,
  getProjectIntegrationMeta,
  updateProjectIntegration,
} from "@/lib/supabase/project-integrations-repository";

function parseUpdateBody(body: unknown): IntegrationUpdateInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const data = body as Record<string, unknown>;
  return {
    name: typeof data.name === "string" ? data.name : undefined,
    integrationType:
      typeof data.integrationType === "string"
        ? (data.integrationType as IntegrationUpdateInput["integrationType"])
        : undefined,
    connectionMethod:
      typeof data.connectionMethod === "string"
        ? (data.connectionMethod as IntegrationUpdateInput["connectionMethod"])
        : undefined,
    apiUrl: data.apiUrl === null || typeof data.apiUrl === "string" ? data.apiUrl : undefined,
    port: data.port === null || typeof data.port === "number" ? data.port : undefined,
    loginUsername:
      data.loginUsername === null || typeof data.loginUsername === "string"
        ? data.loginUsername
        : undefined,
    password: typeof data.password === "string" ? data.password : undefined,
    isActive: typeof data.isActive === "boolean" ? data.isActive : undefined,
    technicalNotes:
      data.technicalNotes === null || typeof data.technicalNotes === "string"
        ? data.technicalNotes
        : undefined,
    configJson:
      data.configJson && typeof data.configJson === "object"
        ? (data.configJson as IntegrationUpdateInput["configJson"])
        : undefined,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ integrationId: string }> },
) {
  try {
    const { userId, profile } = await requireIntegrationAdmin();
    const { integrationId } = await context.params;
    const body = parseUpdateBody(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
    }

    const integration = await updateProjectIntegration(integrationId, body, {
      userId,
      name: getUserDisplayName(profile),
    });
    return NextResponse.json({ integration });
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
  context: { params: Promise<{ integrationId: string }> },
) {
  try {
    const { userId, profile } = await requireIntegrationAdmin();
    const { integrationId } = await context.params;
    const existing = await getProjectIntegrationMeta(integrationId);
    if (!existing) {
      return NextResponse.json({ error: "Nie znaleziono integracji." }, { status: 404 });
    }

    await deleteProjectIntegration(integrationId, {
      userId,
      name: getUserDisplayName(profile),
    });
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
