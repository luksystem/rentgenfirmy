import { NextResponse } from "next/server";
import {
  requireAdministratorProfile,
  requireAuthenticatedProfile,
} from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { normalizeProjectActivitySettings } from "@/lib/project-activity/settings";
import {
  fetchProjectActivitySettingsServer,
  saveProjectActivitySettingsServer,
} from "@/lib/supabase/project-activity-settings-server";
import { recomputeActiveProjectsServer } from "@/lib/supabase/project-activity-recompute-server";

export async function GET() {
  try {
    await requireAuthenticatedProfile();
    const settings = await fetchProjectActivitySettingsServer();
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdministratorProfile();
    const body = await request.json();
    const settings = normalizeProjectActivitySettings(
      body && typeof body === "object" && "settings" in body
        ? (body as { settings: unknown }).settings
        : body,
    );
    const saved = await saveProjectActivitySettingsServer(settings);

    let recompute = null;
    if (saved.autoDetectActiveProjects) {
      try {
        recompute = await recomputeActiveProjectsServer(saved);
      } catch (recomputeError) {
        recompute = {
          error:
            recomputeError instanceof Error
              ? recomputeError.message
              : "Nie udało się przeliczyć aktywności.",
        };
      }
    }

    return NextResponse.json({ settings: saved, recompute });
  } catch (error) {
    return jsonError(error);
  }
}
