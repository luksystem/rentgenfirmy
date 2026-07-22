import { NextResponse } from "next/server";
import {
  requireAdministratorProfile,
  requireAuthenticatedProfile,
} from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { normalizeMonthlyReviewSettings } from "@/lib/monthly-reviews/settings";
import {
  fetchMonthlyReviewSettingsServer,
  saveMonthlyReviewSettingsServer,
} from "@/lib/supabase/monthly-review-settings-server";

export async function GET() {
  try {
    await requireAuthenticatedProfile();
    const settings = await fetchMonthlyReviewSettingsServer();
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdministratorProfile();
    const body = await request.json();
    const settings = normalizeMonthlyReviewSettings(
      body && typeof body === "object" && "settings" in body
        ? (body as { settings: unknown }).settings
        : body,
    );
    const saved = await saveMonthlyReviewSettingsServer(settings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    return jsonError(error);
  }
}
