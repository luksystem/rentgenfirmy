import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import { getVizDashboardLiveSnapshots } from "@/lib/viz/viz-telemetry-server";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const live = await getVizDashboardLiveSnapshots(dashboardId);
    return NextResponse.json(live);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania danych na żywo." },
      { status: 500 },
    );
  }
}

export async function POST(_request: Request, context: RouteContext) {
  return GET(_request, context);
}
