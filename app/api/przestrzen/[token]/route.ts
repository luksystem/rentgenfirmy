import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  parseDashboardSessionValue,
  DASHBOARD_PUBLIC_SESSION_COOKIE,
} from "@/lib/dashboard/dashboard-session";
import {
  fetchDashboardPublicMeta,
  fetchPublicDashboardPayload,
} from "@/lib/supabase/public-dashboard-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? undefined;

  try {
    const meta = await fetchDashboardPublicMeta(token);
    if (!meta) {
      return NextResponse.json({ error: "Nie znaleziono dashboardu klienta." }, { status: 404 });
    }

    const cookieStore = await cookies();
    const session = parseDashboardSessionValue(
      cookieStore.get(DASHBOARD_PUBLIC_SESSION_COOKIE)?.value,
    );
    const sessionValid = session?.token === token;

    if (meta.access.authRequired && !sessionValid) {
      return NextResponse.json({
        authRequired: true,
        access: meta.access,
        context: meta.context,
      });
    }

    const payload = await fetchPublicDashboardPayload(token, projectId);
    if (!payload) {
      return NextResponse.json({ error: "Nie znaleziono dashboardu klienta." }, { status: 404 });
    }

    return NextResponse.json({
      ...payload,
      authorName: sessionValid && session ? session.authorName : payload.client.fullName,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania dashboardu." },
      { status: 500 },
    );
  }
}
