import { NextResponse } from "next/server";
import { getKanbanSessionMaxAgeSeconds, KANBAN_PUBLIC_SESSION_COOKIE } from "@/lib/process/kanban-session";
import { buildKanbanSessionCookie } from "@/lib/process/kanban-public-request";
import { verifyKanbanPublicCredentials } from "@/lib/supabase/kanban-public-server";

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
    const { authorName } = await verifyKanbanPublicCredentials(token, password, username);
    const response = NextResponse.json({ ok: true, authorName });
    const cookie = buildKanbanSessionCookie(token, authorName);
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
  response.cookies.set(KANBAN_PUBLIC_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

export function GET() {
  return NextResponse.json({ maxAgeSeconds: getKanbanSessionMaxAgeSeconds() });
}
