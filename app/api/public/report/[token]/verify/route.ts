import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth/http-error";
import {
  getShareRowByToken,
  registerFailedAttempt,
  resetFailedAttempts,
  logShareAccess,
} from "@/lib/supabase/audit-share-repository";
import {
  verifySharePassword,
  createShareSessionValue,
  getShareSessionMaxAgeSeconds,
  REPORT_PUBLIC_SESSION_COOKIE,
  clientIpFromHeaders,
  hashIp,
} from "@/lib/audit/report-share-crypto";
import {
  isShareExpired,
  isShareLocked,
  shareLockUntilIso,
  SHARE_MAX_FAILED_ATTEMPTS,
} from "@/lib/audit/public-report";

export const runtime = "nodejs";

const NOINDEX = { "X-Robots-Tag": "noindex, nofollow" };

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const password = body.password ?? "";

    const row = await getShareRowByToken(token);
    if (!row || !row.is_active || isShareExpired(row.expires_at)) {
      return NextResponse.json({ error: "Link jest nieaktywny lub wygasł." }, { status: 404, headers: NOINDEX });
    }

    if (isShareLocked(row.locked_until)) {
      return NextResponse.json(
        { error: "Zbyt wiele błędnych prób. Spróbuj później." },
        { status: 429, headers: NOINDEX },
      );
    }

    const ipHash = hashIp(clientIpFromHeaders(request.headers));
    const userAgent = request.headers.get("user-agent");
    const ok = await verifySharePassword(password, row.password_hash);

    if (!ok) {
      const attempts = row.failed_attempts + 1;
      const lockUntil = attempts >= SHARE_MAX_FAILED_ATTEMPTS ? shareLockUntilIso() : row.locked_until;
      await registerFailedAttempt(row.id, row.failed_attempts, lockUntil);
      await logShareAccess(row.id, { event: "password_fail", ipHash, userAgent, passwordOk: false });
      return NextResponse.json({ error: "Nieprawidłowe hasło." }, { status: 401, headers: NOINDEX });
    }

    await resetFailedAttempts(row.id);
    await logShareAccess(row.id, { event: "password_ok", ipHash, userAgent, passwordOk: true });

    const response = NextResponse.json({ ok: true }, { headers: NOINDEX });
    response.cookies.set(REPORT_PUBLIC_SESSION_COOKIE, createShareSessionValue(token), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getShareSessionMaxAgeSeconds(),
    });
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
