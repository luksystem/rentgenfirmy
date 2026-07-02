import { getSmsConfig } from "@/lib/sms/config";
import type { SmsProvider, SmsSendPayload, SmsSendProviderResult } from "@/lib/sms/types";

const SMSAPI_URL = "https://api.smsapi.pl/sms.do";
const SMSAPI_BACKUP_URL = "https://api2.smsapi.pl/sms.do";

type SmsApiListItem = {
  id?: string;
  status?: string;
  error?: string | number;
};

type SmsApiSuccessResponse = {
  count?: number;
  list?: SmsApiListItem[];
  error?: string | number;
  message?: string;
};

function parseSmsApiResponse(raw: unknown): SmsSendProviderResult {
  const payload = raw as SmsApiSuccessResponse;

  if (payload.error !== undefined && payload.error !== null && payload.error !== 0) {
    throw new Error(
      typeof payload.message === "string" && payload.message.trim()
        ? payload.message
        : `SMSAPI error: ${String(payload.error)}`,
    );
  }

  const first = payload.list?.[0];
  if (first?.error !== undefined && first.error !== null && first.error !== 0) {
    throw new Error(`SMSAPI error: ${String(first.error)}`);
  }

  return {
    providerMessageId: first?.id?.trim() || null,
    providerStatus: first?.status?.trim() || null,
    rawResponse: raw,
  };
}

async function postToSmsApi(url: string, token: string, body: URLSearchParams) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();
  let json: unknown;

  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error(text.trim() || `SMSAPI HTTP ${response.status}`);
  }

  if (!response.ok) {
    const payload = json as SmsApiSuccessResponse;
    throw new Error(
      typeof payload.message === "string" && payload.message.trim()
        ? payload.message
        : `SMSAPI HTTP ${response.status}`,
    );
  }

  return parseSmsApiResponse(json);
}

export function createSmsApiProvider(): SmsProvider {
  return {
    name: "smsapi",
    async send(payload: SmsSendPayload): Promise<SmsSendProviderResult> {
      const config = getSmsConfig();

      if (!config.smsapiToken) {
        throw new Error("Brak SMSAPI_TOKEN — ustaw token operatora SMS w zmiennych środowiskowych.");
      }

      const body = new URLSearchParams({
        to: payload.to,
        from: payload.from || config.smsapiFrom,
        message: payload.message,
        format: "json",
        encoding: "utf-8",
      });

      if (payload.notifyUrl) {
        body.set("notify_url", payload.notifyUrl);
      }

      if (payload.test ?? config.testMode) {
        body.set("test", "1");
      }

      try {
        return await postToSmsApi(SMSAPI_URL, config.smsapiToken, body);
      } catch (primaryError) {
        try {
          return await postToSmsApi(SMSAPI_BACKUP_URL, config.smsapiToken, body);
        } catch {
          throw primaryError instanceof Error ? primaryError : new Error("SMSAPI send failed.");
        }
      }
    },
  };
}
