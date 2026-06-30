import { NextResponse } from "next/server";
import {
  requireIntegrationAdmin,
  requireIntegrationViewer,
} from "@/lib/auth/integration-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import type { IntegrationInput } from "@/lib/integrations/types";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  createProjectIntegration,
  listIntegrationAuditLog,
  listProjectIntegrations,
} from "@/lib/supabase/project-integrations-repository";
import { listLatestTelemetryForProject } from "@/lib/supabase/project-telemetry-repository";

function parseCreateBody(body: unknown): IntegrationInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const data = body as Record<string, unknown>;
  if (
    typeof data.name !== "string" ||
    typeof data.integrationType !== "string" ||
    typeof data.connectionMethod !== "string" ||
    typeof data.password !== "string"
  ) {
    return null;
  }

  return {
    name: data.name,
    integrationType: data.integrationType as IntegrationInput["integrationType"],
    connectionMethod: data.connectionMethod as IntegrationInput["connectionMethod"],
    apiUrl: typeof data.apiUrl === "string" ? data.apiUrl : null,
    port: typeof data.port === "number" ? data.port : null,
    loginUsername: typeof data.loginUsername === "string" ? data.loginUsername : null,
    password: data.password,
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    technicalNotes: typeof data.technicalNotes === "string" ? data.technicalNotes : null,
    configJson:
      data.configJson && typeof data.configJson === "object"
        ? (data.configJson as IntegrationInput["configJson"])
        : {},
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await requireIntegrationViewer();
    const { projectId } = await context.params;
    const url = new URL(request.url);
    const includeAudit = url.searchParams.get("audit") === "1";

    const [integrations, telemetry] = await Promise.all([
      listProjectIntegrations(projectId),
      listLatestTelemetryForProject(projectId),
    ]);

    const audit = includeAudit ? await listIntegrationAuditLog(projectId) : undefined;

    return NextResponse.json({ integrations, telemetry, audit });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania integracji." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { userId, profile } = await requireIntegrationAdmin();
    const { projectId } = await context.params;
    const body = parseCreateBody(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
    }

    const integration = await createProjectIntegration(projectId, body, {
      userId,
      name: getUserDisplayName(profile),
    });
    return NextResponse.json({ integration });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd zapisu integracji." },
      { status: 400 },
    );
  }
}
