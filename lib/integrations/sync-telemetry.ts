import type { IntegrationMeta, IntegrationTestResult } from "@/lib/integrations/types";
import {
  readLoxonePointState,
  testLoxoneConnection,
  type LoxoneFetchParams,
} from "@/lib/integrations/loxone-client";
import type { LoxoneIntegrationConfig } from "@/lib/integrations/types";
import {
  appendIntegrationAuditLog,
  getProjectIntegrationMeta,
  markIntegrationSyncResult,
  revealIntegrationPassword,
} from "@/lib/supabase/project-integrations-repository";
import {
  ensureLegacyLoxoneVariable,
  listIntegrationVariables,
} from "@/lib/supabase/project-integration-variables-repository";
import { insertProjectTelemetry } from "@/lib/supabase/project-telemetry-repository";

function toLoxoneParams(
  integration: IntegrationMeta,
  password: string,
): LoxoneFetchParams {
  return {
    apiUrl: integration.apiUrl,
    port: integration.port,
    connectionMethod: integration.connectionMethod,
    config: integration.configJson as LoxoneIntegrationConfig,
    loginUsername: integration.loginUsername,
    password,
  };
}

async function resolveSyncVariables(integration: IntegrationMeta) {
  let variables = await listIntegrationVariables(integration.id);
  if (!variables.length) {
    const config = integration.configJson as LoxoneIntegrationConfig;
    const legacy = await ensureLegacyLoxoneVariable(integration.id, integration.projectId, {
      virtualInputName: config.virtualInputName,
      locationLabel: config.locationLabel,
      integrationName: integration.name,
    });
    if (legacy) {
      variables = [legacy];
    }
  }
  return variables.filter((variable) => variable.isActive);
}

async function readAndStoreVariable(
  integration: IntegrationMeta,
  params: LoxoneFetchParams,
  variable: Awaited<ReturnType<typeof listIntegrationVariables>>[number],
) {
  const reading = await readLoxonePointState(params, variable.sourceKey);
  const measuredAt = new Date().toISOString();
  const numericValue = reading.numericValue;
  const textValue = reading.textValue;

  if (numericValue == null && !textValue) {
    throw new Error(`Brak wartości dla punktu „${variable.sourceKey}”.`);
  }

  await insertProjectTelemetry({
    projectId: integration.projectId,
    integrationId: integration.id,
    integrationVariableId: variable.id,
    temperature: numericValue,
    numericValue,
    textValue,
    onlineStatus: true,
    sourceName: variable.locationLabel?.trim() || variable.name,
    measuredAt,
    rawPayloadJson: reading.rawPayload as Record<string, unknown>,
  });

  return {
    variableId: variable.id,
    sourceKey: variable.sourceKey,
    numericValue,
    textValue,
  };
}

export async function testIntegrationConnection(
  integrationId: string,
  actor?: { userId?: string; name: string },
): Promise<IntegrationTestResult> {
  const integration = await getProjectIntegrationMeta(integrationId);
  if (!integration) {
    throw new Error("Nie znaleziono integracji.");
  }

  if (integration.integrationType !== "loxone") {
    throw new Error("Test połączenia jest na razie dostępny tylko dla Loxone.");
  }

  const password = await revealIntegrationPassword(integrationId);
  const started = Date.now();

  try {
    const params = toLoxoneParams(integration, password);
    const connection = await testLoxoneConnection(params);
    const variables = await resolveSyncVariables(integration);
    if (!variables.length) {
      throw new Error("Dodaj co najmniej jedną zmienną (punkt Loxone) do integracji.");
    }

    const readings = [];
    for (const variable of variables) {
      readings.push(await readAndStoreVariable(integration, params, variable));
    }

    await markIntegrationSyncResult(integrationId, { ok: true });

    const first = readings[0];
    const valueLabel =
      first.numericValue == null
        ? (first.textValue ?? "—")
        : first.numericValue === 0 || first.numericValue === 1
          ? `stan ${first.numericValue}`
          : `${first.numericValue.toFixed(1)}`;

    const payload: IntegrationTestResult = {
      ok: true,
      latencyMs: connection.latencyMs,
      online: true,
      message: `Połączenie działa. Odczyt ${readings.length} zmiennych (pierwsza: ${valueLabel}).`,
      details: {
        ...connection.details,
        variablesRead: readings.length,
        readings,
        baseUrl: connection.details?.baseUrl,
      },
    };

    await appendIntegrationAuditLog({
      integrationId,
      projectId: integration.projectId,
      action: "test_connection",
      actorUserId: actor?.userId ?? null,
      actorName: actor?.name ?? "System",
      metadataJson: { ok: true, latencyMs: payload.latencyMs, variablesRead: readings.length },
    });

    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd testu połączenia.";
    await appendIntegrationAuditLog({
      integrationId,
      projectId: integration.projectId,
      action: "test_connection",
      actorUserId: actor?.userId ?? null,
      actorName: actor?.name ?? "System",
      metadataJson: { ok: false, message, latencyMs: Date.now() - started },
    });
    return {
      ok: false,
      latencyMs: Date.now() - started,
      online: false,
      message,
    };
  }
}

export async function syncIntegrationTelemetry(
  integrationId: string,
  actorName = "System",
) {
  const integration = await getProjectIntegrationMeta(integrationId);
  if (!integration || !integration.isActive) {
    return { skipped: true as const };
  }

  if (integration.integrationType !== "loxone") {
    await markIntegrationSyncResult(integrationId, {
      ok: false,
      error: "Synchronizacja obsługuje na razie tylko typ Loxone.",
    });
    return { skipped: true as const };
  }

  const password = await revealIntegrationPassword(integrationId);
  const params = toLoxoneParams(integration, password);

  try {
    const variables = await resolveSyncVariables(integration);
    if (!variables.length) {
      await markIntegrationSyncResult(integrationId, {
        ok: false,
        error: "Brak aktywnych zmiennych do synchronizacji.",
      });
      return { ok: false as const, error: "Brak aktywnych zmiennych." };
    }

    const readings = [];
    const errors: string[] = [];

    for (const variable of variables) {
      try {
        readings.push(await readAndStoreVariable(integration, params, variable));
      } catch (variableError) {
        errors.push(
          `${variable.sourceKey}: ${
            variableError instanceof Error ? variableError.message : "Błąd odczytu"
          }`,
        );
      }
    }

    if (!readings.length) {
      const message = errors.join("; ") || "Błąd synchronizacji wszystkich zmiennych.";
      await markIntegrationSyncResult(integrationId, { ok: false, error: message });
      await appendIntegrationAuditLog({
        integrationId,
        projectId: integration.projectId,
        action: "sync_failure",
        actorName,
        metadataJson: { message, errors },
      });
      return { ok: false as const, error: message };
    }

    await markIntegrationSyncResult(integrationId, { ok: true });
    await appendIntegrationAuditLog({
      integrationId,
      projectId: integration.projectId,
      action: "sync_success",
      actorName,
      metadataJson: {
        variablesRead: readings.length,
        variableErrors: errors,
        readings,
      },
    });

    return {
      ok: true as const,
      variablesRead: readings.length,
      partialErrors: errors.length ? errors : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd synchronizacji.";
    await markIntegrationSyncResult(integrationId, { ok: false, error: message });
    await appendIntegrationAuditLog({
      integrationId,
      projectId: integration.projectId,
      action: "sync_failure",
      actorName,
      metadataJson: { message },
    });
    return { ok: false as const, error: message };
  }
}

const SYNC_CONCURRENCY = 5;

export async function syncAllActiveIntegrations(actorName = "Cron") {
  const { listActiveIntegrations } = await import("@/lib/supabase/project-integrations-repository");
  const integrations = await listActiveIntegrations();

  const results: Array<{ integrationId: string; ok: boolean; error?: string }> = [];

  for (let index = 0; index < integrations.length; index += SYNC_CONCURRENCY) {
    const batch = integrations.slice(index, index + SYNC_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (integration) => {
        const result = await syncIntegrationTelemetry(integration.id, actorName);
        if ("skipped" in result && result.skipped) {
          return { integrationId: integration.id, ok: false, error: "Pominięto" };
        }
        if ("ok" in result && result.ok) {
          return { integrationId: integration.id, ok: true };
        }
        return {
          integrationId: integration.id,
          ok: false,
          error: "error" in result ? result.error : "Błąd",
        };
      }),
    );

    for (const entry of settled) {
      if (entry.status === "fulfilled") {
        results.push(entry.value);
      } else {
        results.push({
          integrationId: "unknown",
          ok: false,
          error: entry.reason instanceof Error ? entry.reason.message : "Błąd",
        });
      }
    }
  }

  return {
    total: integrations.length,
    success: results.filter((entry) => entry.ok).length,
    failed: results.filter((entry) => !entry.ok).length,
    results,
  };
}
