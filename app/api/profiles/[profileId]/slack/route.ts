import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { hasFullAppAccess } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ profileId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { profileId } = await context.params;
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("profiles").select("slack_user_id").eq("id", profileId).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return NextResponse.json({ slackUserId: data?.slack_user_id ?? null });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!hasFullAppAccess(profile.role)) {
      throw new HttpError(403, "Tylko administrator lub manager może ustawić Slack ID.");
    }

    const { profileId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const slackUserId = typeof body?.slackUserId === "string" ? body.slackUserId.trim() || null : null;

    const admin = getSupabaseAdmin();
    const { error } = await admin.from("profiles").update({ slack_user_id: slackUserId }).eq("id", profileId);
    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, slackUserId });
  } catch (error) {
    return jsonError(error);
  }
}
