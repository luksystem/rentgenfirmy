import { NextResponse } from "next/server";
import { getSmsConfig } from "@/lib/sms/config";
import { mapWebhookUpdateToStatus, parseSmsApiWebhookPayload } from "@/lib/sms/webhook";
import { updateSmsMessageByProviderId } from "@/lib/supabase/sms-repository";

function readWebhookParams(request: Request) {
  const url = new URL(request.url);
  const params: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  return params;
}

async function readWebhookBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(json)) {
      if (value === undefined || value === null) {
        continue;
      }
      params[key] = String(value);
    }
    return params;
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      params[key] = String(value);
    }
    return params;
  }

  return {};
}

function verifyWebhookSecret(request: Request) {
  const config = getSmsConfig();
  if (!config.webhookSecret) {
    return true;
  }

  const headerSecret = request.headers.get("x-sms-webhook-secret");
  const querySecret = new URL(request.url).searchParams.get("secret");
  return headerSecret === config.webhookSecret || querySecret === config.webhookSecret;
}

export async function GET(request: Request) {
  return handleWebhook(request, readWebhookParams(request));
}

export async function POST(request: Request) {
  const queryParams = readWebhookParams(request);
  const bodyParams = await readWebhookBody(request);
  return handleWebhook(request, { ...queryParams, ...bodyParams });
}

async function handleWebhook(request: Request, params: Record<string, string>) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  try {
    const updates = parseSmsApiWebhookPayload(params);
    const applied: string[] = [];

    for (const update of updates) {
      const status = mapWebhookUpdateToStatus(update);
      const record = await updateSmsMessageByProviderId({
        providerMessageId: update.providerMessageId,
        status,
        deliveredAt: status === "delivered" ? update.deliveredAt : null,
        errorMessage: status === "failed" ? update.providerStatusName : null,
        metadataPatch: {
          providerStatus: update.providerStatus,
          providerStatusName: update.providerStatusName,
          webhookReceivedAt: new Date().toISOString(),
        },
      });

      if (record) {
        applied.push(record.id);
      }
    }

    return NextResponse.json({
      ok: true,
      processed: updates.length,
      applied,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook SMS error." },
      { status: 500 },
    );
  }
}
