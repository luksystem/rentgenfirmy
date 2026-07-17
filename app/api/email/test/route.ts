import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { defaultEmailSettings } from "@/lib/email/email-settings";
import { buildEmailShell } from "@/lib/email/layout";
import { sendTransactionalEmail } from "@/lib/email/send";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";

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

    const [settings, company] = await Promise.all([
      fetchEmailSettingsServer().catch(() => defaultEmailSettings()),
      resolveCompanyProfileDocumentServer().catch(() => null),
    ]);

    const html = buildEmailShell({
      content: `
        <h1 style="margin:0 0 12px;font-size:18px;color:#111827;">Test wysyłki e-mail</h1>
        <p style="margin:0 0 8px;color:#374151;line-height:1.55;">
          To jest wiadomość testowa z aplikacji Rentgen firmy.
        </p>
        <p style="margin:0;color:#6b7280;line-height:1.55;">
          Jeśli ją widzisz, konfiguracja Resend oraz szablon layoutu działają poprawnie.
        </p>
      `,
      eyebrow: "Test",
      brand: settings.brand,
      company,
    });

    const result = await sendTransactionalEmail({
      to,
      subject: "Test e-mail — Rentgen firmy",
      html,
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
