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
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { respondToProjectChangeRequest } from "@/lib/supabase/project-change-request-repository";

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

async function resolveChangeRequestInDashboard(
  dashboardToken: string,
  changeRequestId: string,
  projectId: string | null,
) {
  if (!projectId) {
    return null;
  }

  const payload = await fetchPublicDashboardPayload(dashboardToken, projectId);
  if (!payload || payload.initialProjectId !== projectId) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_change_requests")
    .select("id, project_id")
    .eq("id", changeRequestId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string; changeRequestId: string }> },
) {
  const { token, changeRequestId } = await context.params;

  try {
    const access = await assertPublicDashboardAccess(token);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const projectId = new URL(request.url).searchParams.get("projectId");
    const resolvedId = await resolveChangeRequestInDashboard(token, changeRequestId, projectId);
    if (!resolvedId) {
      return NextResponse.json({ error: "Nie znaleziono zmiany." }, { status: 404 });
    }

    const body = (await request.json()) as {
      action?: "respond";
      authorName?: string;
      accepted?: boolean;
      clientResponseNote?: string;
    };

    if (body.action !== "respond") {
      return NextResponse.json({ error: "Nieobsługiwana akcja." }, { status: 400 });
    }

    const authorName = body.authorName?.trim();
    if (!authorName) {
      return NextResponse.json({ error: "Podaj imię lub firmę." }, { status: 400 });
    }

    const changeRequest = await respondToProjectChangeRequest(resolvedId, {
      accepted: Boolean(body.accepted),
      clientResponseName: authorName,
      clientResponseNote: body.clientResponseNote,
    });
    return NextResponse.json({ changeRequest });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operacja nie powiodła się." },
      { status: 400 },
    );
  }
}
