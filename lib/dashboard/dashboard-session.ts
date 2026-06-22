import { createHmac, timingSafeEqual } from "crypto";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const DASHBOARD_PUBLIC_SESSION_COOKIE = "dashboard_public_session";

type DashboardSessionPayload = {
  token: string;
  authorName: string;
  exp: number;
};

function getSessionSecret() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.CLIENTS_API_SECRET ??
    "dashboard-dev-session-secret"
  );
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createDashboardSessionValue(token: string, authorName: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${token}|${authorName}|${exp}`;
  const signature = signPayload(payload);
  return `${payload}|${signature}`;
}

export function parseDashboardSessionValue(
  value: string | undefined | null,
): DashboardSessionPayload | null {
  if (!value) {
    return null;
  }

  const parts = value.split("|");
  if (parts.length !== 4) {
    return null;
  }

  const [token, authorName, expRaw, signature] = parts;
  const payload = `${token}|${authorName}|${expRaw}`;
  const expected = signPayload(payload);

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  const exp = Number(expRaw);
  if (!token || !authorName || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return { token, authorName, exp };
}

export function getDashboardSessionMaxAgeSeconds() {
  return SESSION_MAX_AGE_SECONDS;
}
