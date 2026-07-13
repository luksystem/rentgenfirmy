import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import {
  upsertPushSubscription,
  validateSubscriptionInput,
} from "@/lib/push/subscription-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const body = await request.json();
    const subscription = validateSubscriptionInput(body);
    const userAgent = request.headers.get("user-agent");

    const supabase = getSupabaseAdmin();
    const saved = await upsertPushSubscription(supabase, {
      userId,
      subscription,
      userAgent,
    });

    return NextResponse.json({
      ok: true,
      subscription: {
        id: saved.id,
        endpoint: saved.endpoint,
        active: saved.active,
        deviceName: saved.deviceName,
        platform: saved.platform,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
