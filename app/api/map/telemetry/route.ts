import { NextResponse } from "next/server";
import { requireIntegrationViewer } from "@/lib/auth/integration-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import {
  groupTelemetryByProject,
  listLatestTelemetryForProjects,
} from "@/lib/supabase/project-telemetry-repository";

export async function GET(request: Request) {
  try {
    await requireIntegrationViewer();
    const url = new URL(request.url);
    const projectIdsParam = url.searchParams.get("projectIds") ?? "";
    const projectIds = projectIdsParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (projectIds.length === 0) {
      return NextResponse.json({ byProjectId: {} });
    }

    const snapshots = await listLatestTelemetryForProjects(projectIds);
    const grouped = groupTelemetryByProject(snapshots);
    const byProjectId = Object.fromEntries(grouped.entries());

    return NextResponse.json({ byProjectId, snapshots });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania telemetrii." },
      { status: 500 },
    );
  }
}
