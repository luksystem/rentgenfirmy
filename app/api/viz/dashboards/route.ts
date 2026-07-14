import { NextResponse } from "next/server";
import { getUserDisplayName } from "@/lib/auth/types";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import {
  createVizDashboard,
  listVizDashboardTemplates,
  listVizDashboards,
  listVizIntegratedSystems,
  listVizVariableRoles,
} from "@/lib/supabase/viz-server";
import { VIZ_DASHBOARD_STATUSES, type VizDashboardStatus } from "@/lib/viz/types";

export async function GET() {
  try {
    await requireAuthenticatedProfile();
    const [dashboards, templates, systems, variableRoles] = await Promise.all([
      listVizDashboards(),
      listVizDashboardTemplates(),
      listVizIntegratedSystems(),
      listVizVariableRoles(),
    ]);

    return NextResponse.json({ dashboards, templates, systems, variableRoles });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania dashboardów." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      templateSlug?: string | null;
      clientId?: string | null;
      status?: VizDashboardStatus;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nazwa dashboardu jest wymagana." }, { status: 400 });
    }

    if (body.status && !VIZ_DASHBOARD_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Nieprawidłowy status dashboardu." }, { status: 400 });
    }

    const dashboard = await createVizDashboard(
      {
        name: body.name,
        description: body.description,
        templateSlug: body.templateSlug,
        clientId: body.clientId,
        status: body.status,
      },
      { userId, userName: getUserDisplayName(profile) },
    );

    return NextResponse.json({ dashboard }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd tworzenia dashboardu." },
      { status: 500 },
    );
  }
}
