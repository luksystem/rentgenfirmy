import { NextResponse } from "next/server";
import { runNotificationPushRelay } from "@/lib/notifications/push-relay-server";

/**
 * D44 — dosyła push dla powiadomień utworzonych triggerem w bazie (te omijają dispatcher w TS).
 *
 * Uwierzytelnianie Bearerem, nie sesją: woła to pg_cron przez net.http_post, który sesji nie ma
 * i mieć nie może. Middleware musi przepuszczać /api/cron/* — inaczej przekierowanie na logowanie
 * zamienia wywołanie w 405, tak jak przy D39.
 */
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.CLIENTS_API_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }
  return header.slice("Bearer ".length) === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runNotificationPushRelay();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd przekaźnika push." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
