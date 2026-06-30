import { NextResponse } from "next/server";
import { requireIntegrationOperator } from "@/lib/auth/integration-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { getUserDisplayName } from "@/lib/auth/types";
import { testIntegrationConnection } from "@/lib/integrations/sync-telemetry";

export async function POST(
  _request: Request,
  context: { params: Promise<{ integrationId: string }> },
) {
  try {
    const { userId, profile } = await requireIntegrationOperator();
    const { integrationId } = await context.params;
    const result = await testIntegrationConnection(integrationId, {
      userId,
      name: getUserDisplayName(profile),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd testu połączenia." },
      { status: 400 },
    );
  }
}
