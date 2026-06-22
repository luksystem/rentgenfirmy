import { NextResponse } from "next/server";
import {
  getDashboardSessionMaxAgeSeconds,
  DASHBOARD_PUBLIC_SESSION_COOKIE,
} from "@/lib/dashboard/dashboard-session";
import { buildDashboardSessionCookie } from "@/lib/dashboard/dashboard-public-request";
import { verifyDashboardPublicCredentials } from "@/lib/supabase/public-dashboard-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const password = typeof data.password === "string" ? data.password : "";
  const username = typeof data.username === "string" ? data.username : undefined;

  try {
    const { authorName } = await verifyDashboardPublicCredentials(token, password, username);
    const response = NextResponse.json({ ok: true, authorName });
    const cookie = buildDashboardSessionCookie(token, authorName);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Logowanie nie powiodło się." },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DASHBOARD_PUBLIC_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

export function GET() {
  return NextResponse.json({ maxAgeSeconds: getDashboardSessionMaxAgeSeconds() });
}
