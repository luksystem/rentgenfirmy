import { NextResponse } from "next/server";
import { requireIntegrationAdmin, requireIntegrationViewer } from "@/lib/auth/integration-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import type { IntegrationVariableInput } from "@/lib/integrations/integration-variable-types";
import { getProjectIntegrationMeta } from "@/lib/supabase/project-integrations-repository";
import {
  createIntegrationVariable,
  deleteIntegrationVariable,
  listIntegrationVariables,
  updateIntegrationVariable,
} from "@/lib/supabase/project-integration-variables-repository";

type RouteContext = { params: Promise<{ integrationId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireIntegrationViewer();
    const { integrationId } = await context.params;
    const integration = await getProjectIntegrationMeta(integrationId);
    if (!integration) {
      return NextResponse.json({ error: "Nie znaleziono integracji." }, { status: 404 });
    }
    const variables = await listIntegrationVariables(integrationId);
    return NextResponse.json({ variables });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania zmiennych." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireIntegrationAdmin();
    const { integrationId } = await context.params;
    const integration = await getProjectIntegrationMeta(integrationId);
    if (!integration) {
      return NextResponse.json({ error: "Nie znaleziono integracji." }, { status: 404 });
    }

    const body = (await request.json()) as IntegrationVariableInput;
    const variable = await createIntegrationVariable(integrationId, integration.projectId, body);
    return NextResponse.json({ variable }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd tworzenia zmiennej." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireIntegrationAdmin();
    const body = (await request.json()) as IntegrationVariableInput & { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Brak identyfikatora zmiennej." }, { status: 400 });
    }
    const variable = await updateIntegrationVariable(body.id, body);
    return NextResponse.json({ variable });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd aktualizacji zmiennej." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireIntegrationAdmin();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Brak identyfikatora zmiennej." }, { status: 400 });
    }
    await deleteIntegrationVariable(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd usuwania zmiennej." },
      { status: 500 },
    );
  }
}
