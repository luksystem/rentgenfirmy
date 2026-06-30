import type { IntegrationMeta, IntegrationTestResult } from "@/lib/integrations/types";
import {
  readLoxoneVirtualInputState,
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
    const result = await testLoxoneConnection(toLoxoneParams(integration, password));
    const payload: IntegrationTestResult = {
      ok: true,
      latencyMs: result.latencyMs,
      online: true,
      message: result.message,
      details: result.details,
    };

    await appendIntegrationAuditLog({
      integrationId,
      projectId: integration.projectId,
      action: "test_connection",
      actorUserId: actor?.userId ?? null,
      actorName: actor?.name ?? "System",
      metadataJson: { ok: true, latencyMs: result.latencyMs },
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

  const config = integration.configJson as LoxoneIntegrationConfig;
  const password = await revealIntegrationPassword(integrationId);

  try {
    const result = await readLoxoneVirtualInputState(toLoxoneParams(integration, password));
    const measuredAt = new Date().toISOString();

    await insertProjectTelemetry({
      projectId: integration.projectId,
      integrationId: integration.id,
      temperature: result.temperature,
      onlineStatus: true,
      sourceName: config.locationLabel?.trim() || integration.name,
      measuredAt,
      rawPayloadJson: result.rawPayload as Record<string, unknown>,
    });

    await markIntegrationSyncResult(integrationId, { ok: true });
    await appendIntegrationAuditLog({
      integrationId,
      projectId: integration.projectId,
      action: "sync_success",
      actorName,
      metadataJson: {
        temperature: result.temperature,
        sourceName: config.locationLabel,
      },
    });

    return { ok: true as const, temperature: result.temperature };
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
