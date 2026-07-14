import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import { VIZ_CHART_TYPES, type VizDashboardChartInput } from "@/lib/viz/chart-types";
import {
  createVizDashboardChart,
  deleteVizDashboardChart,
  listVizDashboardCharts,
  queryVizChartHistory,
  updateVizDashboardChart,
} from "@/lib/viz/viz-charts-server";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const url = new URL(request.url);

    if (url.searchParams.get("history") === "1") {
      const roleCode = url.searchParams.get("roleCode")?.trim();
      const projectIds = url.searchParams.get("projectIds")?.split(",").filter(Boolean) ?? [];
      const periodHours = Number(url.searchParams.get("periodHours") ?? "24");

      if (!roleCode || !projectIds.length) {
        return NextResponse.json({ error: "Wymagane roleCode i projectIds." }, { status: 400 });
      }

      const points = await queryVizChartHistory(dashboardId, {
        roleCode,
        projectIds,
        periodHours: Number.isFinite(periodHours) ? periodHours : 24,
      });

      return NextResponse.json({ points });
    }

    const charts = await listVizDashboardCharts(dashboardId);
    return NextResponse.json({ charts });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania wykresów." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const body = (await request.json()) as VizDashboardChartInput;

    if (!body.name?.trim() || !body.config?.roleCode) {
      return NextResponse.json({ error: "Nazwa i rola są wymagane." }, { status: 400 });
    }

    if (body.chartType && !VIZ_CHART_TYPES.includes(body.chartType)) {
      return NextResponse.json({ error: "Nieprawidłowy typ wykresu." }, { status: 400 });
    }

    const chart = await createVizDashboardChart(dashboardId, body);
    return NextResponse.json({ chart }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd tworzenia wykresu." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAuthenticatedProfile();
    const body = (await request.json()) as VizDashboardChartInput & { id?: string };

    if (!body.id) {
      return NextResponse.json({ error: "Brak identyfikatora wykresu." }, { status: 400 });
    }

    const chart = await updateVizDashboardChart(body.id, body);
    return NextResponse.json({ chart });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd aktualizacji wykresu." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuthenticatedProfile();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Brak identyfikatora wykresu." }, { status: 400 });
    }
    await deleteVizDashboardChart(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd usuwania wykresu." },
      { status: 500 },
    );
  }
}
