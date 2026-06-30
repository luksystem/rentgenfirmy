import type { ConnectionMethod, LoxoneIntegrationConfig } from "@/lib/integrations/types";

type LoxoneLLResponse = {
  LL?: {
    control?: string;
    value?: unknown;
    Code?: string;
  };
};

export type LoxoneFetchParams = {
  apiUrl: string | null;
  port: number | null;
  connectionMethod: ConnectionMethod;
  config: LoxoneIntegrationConfig;
  loginUsername: string | null;
  password: string;
};

const REQUEST_TIMEOUT_MS = 15_000;

function normalizeSerialNumber(serialNumber: string | null | undefined) {
  return serialNumber?.replace(/:/g, "").trim() ?? "";
}

function buildHostUrl(
  host: string,
  port: number | null,
  useTls: boolean,
): string {
  const trimmed = host.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const scheme = useTls ? "https" : "http";
  const resolvedPort = port ?? (useTls ? 443 : 80);
  const defaultPort = useTls ? 443 : 80;
  if (resolvedPort === defaultPort) {
    return `${scheme}://${trimmed}`;
  }
  return `${scheme}://${trimmed}:${resolvedPort}`;
}

export async function resolveLoxoneBaseUrl(params: LoxoneFetchParams): Promise<string> {
  const useTls = params.config.useTls ?? false;
  const needsCloudResolve =
    params.connectionMethod === "remote_connect" || params.connectionMethod === "cloud";

  if (needsCloudResolve) {
    const snr = normalizeSerialNumber(params.config.serialNumber);
    if (!snr) {
      throw new Error("Numer seryjny Miniservera jest wymagany dla Remote Connect / Cloud.");
    }

    const response = await fetch(
      `https://connect.loxonecloud.com/getip?snr=${encodeURIComponent(snr)}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );

    if (!response.ok) {
      throw new Error(
        `CloudDNS nie zwrócił adresu (HTTP ${response.status}). Sprawdź numer seryjny i Remote Connect.`,
      );
    }

    const payload = (await response.json()) as { url?: string };
    if (!payload.url?.trim()) {
      throw new Error("CloudDNS nie zwrócił adresu Miniservera.");
    }
    return payload.url.replace(/\/+$/, "");
  }

  const host = params.apiUrl?.trim();
  if (!host) {
    throw new Error("Podaj adres IP lub URL Miniservera.");
  }

  return buildHostUrl(host, params.port, useTls);
}

function buildAuthHeader(loginUsername: string | null, password: string) {
  const user = loginUsername?.trim() || "admin";
  const token = Buffer.from(`${user}:${password}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export async function loxoneRequest(
  baseUrl: string,
  path: string,
  params: Pick<LoxoneFetchParams, "loginUsername" | "password" | "config">,
): Promise<{ data: LoxoneLLResponse; status: number; latencyMs: number }> {
  const started = Date.now();
  const url = `${baseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const tlsInsecure = params.config.tlsInsecure ?? false;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: buildAuthHeader(params.loginUsername, params.password),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ...(tlsInsecure && url.startsWith("https://")
      ? { cache: "no-store" as const }
      : {}),
  });

  const latencyMs = Date.now() - started;
  const text = await response.text();

  let data: LoxoneLLResponse = {};
  try {
    data = text ? (JSON.parse(text) as LoxoneLLResponse) : {};
  } catch {
    throw new Error(`Nieprawidłowa odpowiedź Miniservera (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const code = data.LL?.Code;
    throw new Error(
      code
        ? `Miniserver odrzucił żądanie (kod ${code}).`
        : `Błąd połączenia z Miniserverem (HTTP ${response.status}).`,
    );
  }

  if (data.LL?.Code && data.LL.Code !== "200") {
    throw new Error(`Miniserver zwrócił kod ${data.LL.Code}.`);
  }

  return { data, status: response.status, latencyMs };
}

export async function testLoxoneConnection(params: LoxoneFetchParams) {
  const baseUrl = await resolveLoxoneBaseUrl(params);
  const { data, latencyMs } = await loxoneRequest(baseUrl, "/jdev/cfg/apiKey", params);
  const value = data.LL?.value;

  return {
    ok: true,
    latencyMs,
    online: true,
    message: "Połączenie z Miniserverem działa.",
    details:
      value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : { value },
    baseUrl,
  };
}

export async function readLoxoneVirtualInputState(params: LoxoneFetchParams) {
  const config = params.config;
  const pointName = config.virtualInputName?.trim();
  if (!pointName) {
    throw new Error("Brak nazwy Virtual Input w konfiguracji integracji.");
  }

  const baseUrl = await resolveLoxoneBaseUrl(params);
  const encodedName = encodeURIComponent(pointName);
  const { data, latencyMs } = await loxoneRequest(
    baseUrl,
    `/jdev/sps/io/${encodedName}/state`,
    params,
  );

  const rawValue = data.LL?.value;
  const numeric =
    typeof rawValue === "number"
      ? rawValue
      : typeof rawValue === "string"
        ? Number.parseFloat(rawValue.replace(",", "."))
        : Number.NaN;

  if (Number.isNaN(numeric)) {
    throw new Error(
      `Nie udało się odczytać temperatury z punktu „${pointName}” (wartość: ${String(rawValue)}).`,
    );
  }

  return {
    baseUrl,
    latencyMs,
    temperature: numeric,
    rawValue,
    rawPayload: data,
  };
}
