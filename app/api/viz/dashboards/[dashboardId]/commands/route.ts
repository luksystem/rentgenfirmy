import { NextResponse } from "next/server";
import { getUserDisplayName } from "@/lib/auth/types";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import {
  createVizBulkSetpointCommands,
  createVizSetpointCommand,
  listVizControlCommands,
  listWritableSetpointProjectIds,
} from "@/lib/viz/viz-commands-server";
import { requireVizPermission } from "@/lib/viz/viz-auth-server";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    await requireVizPermission(dashboardId, userId, profile.role, "viewDashboard");

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId")?.trim() || undefined;

    const commands = await listVizControlCommands({ dashboardId, projectId });
    return NextResponse.json({ commands });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania historii sterowania." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    await requireVizPermission(dashboardId, userId, profile.role, "controlSetpoint");

    const body = (await request.json()) as {
      projectId?: string;
      projectIds?: string[];
      allStores?: boolean;
      value?: number;
    };

    if (typeof body.value !== "number" || Number.isNaN(body.value)) {
      return NextResponse.json({ error: "Podaj poprawną wartość setpointu." }, { status: 400 });
    }

    const actor = {
      requestedByUserId: userId,
      requestedByName: getUserDisplayName(profile),
    };

    if (body.allStores) {
      const projectIds = await listWritableSetpointProjectIds(dashboardId);
      const result = await createVizBulkSetpointCommands({
        dashboardId,
        projectIds,
        value: body.value,
        ...actor,
      });

      return NextResponse.json(result, { status: result.failed > 0 && result.succeeded === 0 ? 500 : 201 });
    }

    if (Array.isArray(body.projectIds) && body.projectIds.length) {
      const projectIds = body.projectIds.map((id) => id.trim()).filter(Boolean);
      const result = await createVizBulkSetpointCommands({
        dashboardId,
        projectIds,
        value: body.value,
        ...actor,
      });

      return NextResponse.json(result, { status: result.failed > 0 && result.succeeded === 0 ? 500 : 201 });
    }

    if (!body.projectId?.trim()) {
      return NextResponse.json({ error: "projectId jest wymagane." }, { status: 400 });
    }

    const command = await createVizSetpointCommand({
      dashboardId,
      projectId: body.projectId.trim(),
      value: body.value,
      ...actor,
    });

    return NextResponse.json({ command }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd wysyłki komendy sterującej." },
      { status: 500 },
    );
  }
}
