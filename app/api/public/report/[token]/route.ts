import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth/http-error";
import {
  getShareRowByToken,
  incrementViewCount,
  logShareAccess,
} from "@/lib/supabase/audit-share-repository";
import {
  parseShareSessionValue,
  REPORT_PUBLIC_SESSION_COOKIE,
  clientIpFromHeaders,
  hashIp,
} from "@/lib/audit/report-share-crypto";
import { buildPublicReport, isShareExpired } from "@/lib/audit/public-report";
import { normalizeVisibility } from "@/lib/audit/report-visibility";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const NOINDEX = { "X-Robots-Tag": "noindex, nofollow" };

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const row = await getShareRowByToken(token);
    if (!row) {
      return NextResponse.json({ error: "Nie znaleziono raportu." }, { status: 404, headers: NOINDEX });
    }
    if (!row.is_active) {
      return NextResponse.json({ status: "unavailable", reason: "inactive" }, { headers: NOINDEX });
    }
    if (isShareExpired(row.expires_at)) {
      return NextResponse.json({ status: "unavailable", reason: "expired" }, { headers: NOINDEX });
    }

    const cookieStore = await cookies();
    const parsed = parseShareSessionValue(cookieStore.get(REPORT_PUBLIC_SESSION_COOKIE)?.value);
    const authorized = parsed?.token === token;

    if (!authorized) {
      return NextResponse.json({ status: "password" }, { headers: NOINDEX });
    }

    if (row.max_views !== null && row.view_count >= row.max_views) {
      return NextResponse.json({ status: "unavailable", reason: "view_limit" }, { headers: NOINDEX });
    }

    const visibility = normalizeVisibility(row.visible_sections);
    const report = await buildPublicReport(row.session_id, visibility);
    if (!report) {
      return NextResponse.json({ status: "unavailable", reason: "not_ready" }, { headers: NOINDEX });
    }

    await incrementViewCount(row.id, row.view_count);
    await logShareAccess(row.id, {
      event: "view",
      ipHash: hashIp(clientIpFromHeaders(request.headers)),
      userAgent: request.headers.get("user-agent"),
      passwordOk: true,
    });

    return NextResponse.json(
      { status: "ok", report, visibility },
      { headers: NOINDEX },
    );
  } catch (error) {
    return jsonError(error);
  }
}
