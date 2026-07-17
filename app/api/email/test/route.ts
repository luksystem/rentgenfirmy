import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { sendTransactionalEmail } from "@/lib/email/send";

const EMAIL_TEST_RATE_LIMIT_MS = 60_000;
const lastTestByUser = new Map<string, number>();

function checkEmailTestRateLimit(userId: string) {
  const now = Date.now();
  const last = lastTestByUser.get(userId);

  if (last && now - last < EMAIL_TEST_RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((EMAIL_TEST_RATE_LIMIT_MS - (now - last)) / 1000);
    throw new HttpError(429, `Poczekaj ${waitSeconds} s przed kolejnym testem.`);
  }

  lastTestByUser.set(userId, now);
}

export async function POST() {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const to = profile.email?.trim();

    if (!to) {
      throw new HttpError(400, "Brak adresu e-mail na profilu użytkownika.");
    }

    checkEmailTestRateLimit(userId);

    const result = await sendTransactionalEmail({
      to,
      subject: "Test e-mail — Rentgen firmy",
      html: `
        <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
          <h1 style="font-size: 18px; margin: 0 0 12px;">Test wysyłki e-mail</h1>
          <p style="margin: 0 0 8px;">To jest wiadomość testowa z aplikacji Rentgen firmy.</p>
          <p style="margin: 0; color: #555;">Jeśli ją widzisz, konfiguracja Resend działa poprawnie.</p>
        </div>
      `,
    });

    if (result.skipped) {
      throw new HttpError(
        503,
        "Wysyłka e-mail nie jest skonfigurowana (brak RESEND_API_KEY).",
      );
    }

    return NextResponse.json({ ok: true, to });
  } catch (error) {
    return jsonError(error);
  }
}
