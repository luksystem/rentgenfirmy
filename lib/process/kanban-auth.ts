import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashKanbanPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyKanbanPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;

  if (hash.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(hash, expected);
}

export function normalizeKanbanLogin(value: string) {
  return value.trim().toLocaleLowerCase("pl-PL");
}
