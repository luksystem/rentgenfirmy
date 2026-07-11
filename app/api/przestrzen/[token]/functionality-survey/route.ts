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
import {
  ensureFunctionalitySurvey,
  fetchFunctionalitySurveyBundle,
} from "@/lib/supabase/project-functionality-survey-server";

async function assertPublicDashboardAccess(token: string) {
  const meta = await fetchDashboardPublicMeta(token);
  if (!meta) {
    return { ok: false as const, status: 404, error: "Nie znaleziono dashboardu klienta." };
  }

  if (meta.access.authRequired) {
    const cookieStore = await cookies();
    const session = parseDashboardSessionValue(
      cookieStore.get(DASHBOARD_PUBLIC_SESSION_COOKIE)?.value,
    );
    if (!session || session.token !== token) {
      return { ok: false as const, status: 401, error: "Brak dostępu do dashboardu." };
    }
  }

  return { ok: true as const };
}

async function resolveProjectId(token: string, projectId: string | null) {
  if (!projectId) {
    return null;
  }

  const payload = await fetchPublicDashboardPayload(token, projectId);
  if (!payload || payload.initialProjectId !== projectId) {
    return null;
  }

  return payload.initialProjectId;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const access = await assertPublicDashboardAccess(token);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const projectId = new URL(request.url).searchParams.get("projectId");
    const resolvedProjectId = await resolveProjectId(token, projectId);
    if (!resolvedProjectId) {
      return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
    }

    await ensureFunctionalitySurvey(resolvedProjectId);
    const bundle = await fetchFunctionalitySurveyBundle(resolvedProjectId);
    return NextResponse.json({ bundle });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania ankiety." },
      { status: 500 },
    );
  }
}
