import { NextResponse } from "next/server";
import { getUserDisplayName } from "@/lib/auth/types";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import {
  deleteVizDashboard,
  getVizDashboardById,
  updateVizDashboard,
} from "@/lib/supabase/viz-server";
import { VIZ_DASHBOARD_STATUSES, type VizDashboardStatus } from "@/lib/viz/types";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const dashboard = await getVizDashboardById(dashboardId);

    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard nie istnieje." }, { status: 404 });
    }

    return NextResponse.json({ dashboard });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania dashboardu." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      templateSlug?: string | null;
      clientId?: string | null;
      status?: VizDashboardStatus;
      layoutJson?: Record<string, unknown>;
      settingsJson?: Record<string, unknown>;
    };

    if (body.status && !VIZ_DASHBOARD_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Nieprawidłowy status dashboardu." }, { status: 400 });
    }

    const dashboard = await updateVizDashboard(
      dashboardId,
      body,
      { userId, userName: getUserDisplayName(profile) },
    );

    return NextResponse.json({ dashboard });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd aktualizacji dashboardu." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    await deleteVizDashboard(dashboardId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd usuwania dashboardu." },
      { status: 500 },
    );
  }
}
