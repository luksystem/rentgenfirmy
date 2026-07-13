import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { deactivatePushSubscription } from "@/lib/push/subscription-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const body = (await request.json()) as { endpoint?: string };
    const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";

    if (!endpoint) {
      return NextResponse.json({ error: "Brak endpointu subskrypcji." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const deactivated = await deactivatePushSubscription(supabase, userId, endpoint);

    return NextResponse.json({ ok: true, deactivated });
  } catch (error) {
    return jsonError(error);
  }
}
