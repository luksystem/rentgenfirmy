import { NextResponse } from "next/server";
import { getUserDisplayName } from "@/lib/auth/types";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import type { VizTravelCalcInput } from "@/lib/viz/contract-types";
import {
  calculateDashboardTravelCost,
  deleteVizTravelCalcSnapshot,
  listVizTravelCalcSnapshots,
  saveVizTravelCalcSnapshot,
} from "@/lib/viz/viz-travel-server";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const snapshots = await listVizTravelCalcSnapshots(dashboardId);
    return NextResponse.json({ snapshots });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania snapshotów." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const body = (await request.json()) as VizTravelCalcInput & {
      saveSnapshot?: boolean;
      label?: string | null;
    };

    if (!body.projectId) {
      return NextResponse.json({ error: "Wybierz sklep." }, { status: 400 });
    }

    const result = await calculateDashboardTravelCost(dashboardId, body);

    if (body.saveSnapshot) {
      const snapshot = await saveVizTravelCalcSnapshot(
        dashboardId,
        result,
        { userId, userName: getUserDisplayName(profile) },
        body.label,
      );
      return NextResponse.json({ result, snapshot }, { status: 201 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd kalkulacji dojazdu." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuthenticatedProfile();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Brak identyfikatora snapshotu." }, { status: 400 });
    }
    await deleteVizTravelCalcSnapshot(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd usuwania snapshotu." },
      { status: 500 },
    );
  }
}
