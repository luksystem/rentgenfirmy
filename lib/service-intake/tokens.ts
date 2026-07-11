import { createHmac, timingSafeEqual } from "crypto";

import { splitPartyFullName } from "@/lib/party/display-name";

type IntakeSessionPayload = {
  kind: "session";
  email: string;
  exp: number;
};

type IntakeVerifiedPayload = {
  kind: "verified";
  email: string;
  clientId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  exp: number;
};

type IntakeGuestPayload = {
  kind: "guest";
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  exp: number;
};

function getSecret() {
  return (
    process.env.CLIENTS_API_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "dev-service-intake-secret")
  );
}

function signPayload(payload: IntakeSessionPayload | IntakeVerifiedPayload | IntakeGuestPayload) {
  const secret = getSecret();
  if (!secret) {
    throw new Error("Brak sekretu do podpisywania sesji zgłoszenia.");
  }

  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function readPayload<T extends IntakeSessionPayload | IntakeVerifiedPayload | IntakeGuestPayload>(
  token: string,
): T | null {
  const secret = getSecret();
  if (!secret) {
    return null;
  }

  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    if (!payload?.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

const SESSION_TTL_MS = 30 * 60 * 1000;
const VERIFIED_TTL_MS = 45 * 60 * 1000;

export function createIntakeSessionToken(email: string) {
  return signPayload({
    kind: "session",
    email: email.trim().toLowerCase(),
    exp: Date.now() + SESSION_TTL_MS,
  });
}

export function readIntakeSessionToken(token: string) {
  const payload = readPayload<IntakeSessionPayload>(token);
  if (!payload || payload.kind !== "session") {
    return null;
  }
  return payload;
}

function normalizeGuestOrVerifiedNames(payload: {
  firstName?: string;
  lastName?: string;
  fullName?: string;
}) {
  if (payload.firstName !== undefined || payload.lastName !== undefined) {
    return {
      firstName: payload.firstName?.trim() ?? "",
      lastName: payload.lastName?.trim() ?? "",
    };
  }

  return splitPartyFullName(payload.fullName ?? "");
}

export function intakeTokenFullName(payload: {
  firstName?: string;
  lastName?: string;
  fullName?: string;
}) {
  const { firstName, lastName } = normalizeGuestOrVerifiedNames(payload);
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

export function createIntakeVerifiedToken(input: {
  email: string;
  clientId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}) {
  const { firstName, lastName } = normalizeGuestOrVerifiedNames(input);
  return signPayload({
    kind: "verified",
    email: input.email.trim().toLowerCase(),
    clientId: input.clientId,
    firstName,
    lastName,
    exp: Date.now() + VERIFIED_TTL_MS,
  });
}

export function createIntakeGuestToken(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}) {
  const { firstName, lastName } = normalizeGuestOrVerifiedNames(input);
  return signPayload({
    kind: "guest",
    email: input.email.trim().toLowerCase(),
    firstName,
    lastName,
    exp: Date.now() + VERIFIED_TTL_MS,
  });
}

export function readIntakeGuestToken(token: string) {
  const payload = readPayload<IntakeGuestPayload>(token);
  if (!payload || payload.kind !== "guest") {
    return null;
  }
  const { firstName, lastName } = normalizeGuestOrVerifiedNames(payload);
  return { ...payload, firstName, lastName, fullName: intakeTokenFullName(payload) };
}

export function readIntakeAuthToken(
  token: string,
): IntakeVerifiedPayload | IntakeGuestPayload | null {
  const verified = readIntakeVerifiedToken(token);
  if (verified) {
    return verified;
  }

  const guest = readIntakeGuestToken(token);
  if (guest) {
    return guest;
  }

  return null;
}

export function readIntakeVerifiedToken(token: string) {
  const payload = readPayload<IntakeVerifiedPayload>(token);
  if (!payload || payload.kind !== "verified") {
    return null;
  }
  const { firstName, lastName } = normalizeGuestOrVerifiedNames(payload);
  return { ...payload, firstName, lastName, fullName: intakeTokenFullName(payload) };
}
