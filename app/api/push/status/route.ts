import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { createClient } from "@/lib/supabase/server-auth";
import { fetchPushSubscriptionByEndpoint } from "@/lib/push/subscription-repository";
import { isVapidConfigured } from "@/lib/push/vapid";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const url = new URL(request.url);
    const endpoint = url.searchParams.get("endpoint")?.trim();

    const supabase = await createClient();
    const { count, error: countError } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("active", true);

    if (countError) {
      throw new Error(countError.message);
    }

    let currentDeviceSubscribed = false;
    if (endpoint) {
      const record = await fetchPushSubscriptionByEndpoint(supabase, endpoint);
      currentDeviceSubscribed = Boolean(record && record.userId === userId && record.active);
    }

    return NextResponse.json({
      supported: true,
      vapidConfigured: isVapidConfigured(),
      activeDeviceCount: count ?? 0,
      currentDeviceSubscribed,
    });
  } catch (error) {
    return jsonError(error);
  }
}
