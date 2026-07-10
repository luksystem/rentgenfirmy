// Bezpieczeństwo publicznego raportu: token, hash hasła (scrypt), sesja (HMAC), hash IP.
// Wzorzec spójny z lib/process/kanban-auth.ts + kanban-session.ts.
import { randomBytes, scrypt, timingSafeEqual, createHmac, createHash } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export const REPORT_PUBLIC_SESSION_COOKIE = "report_public_session";
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 h

function secret() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.CLIENTS_API_SECRET ??
    "report-dev-session-secret"
  );
}

export function generateShareToken() {
  return randomBytes(24).toString("base64url");
}

export async function hashSharePassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifySharePassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "base64");
  const expected = Buffer.from(parts[2], "base64");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createShareSessionValue(token: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${token}|${exp}`;
  return `${payload}|${sign(payload)}`;
}

export function parseShareSessionValue(value: string | undefined | null): { token: string; exp: number } | null {
  if (!value) return null;
  const parts = value.split("|");
  if (parts.length !== 3) return null;
  const [token, expRaw, signature] = parts;
  const payload = `${token}|${expRaw}`;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const exp = Number(expRaw);
  if (!token || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  return { token, exp };
}

export function getShareSessionMaxAgeSeconds() {
  return SESSION_MAX_AGE_SECONDS;
}

// Hash IP zgodny z prywatnością (brak surowego IP w bazie).
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${ip}|${secret()}`).digest("hex").slice(0, 32);
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip");
}
