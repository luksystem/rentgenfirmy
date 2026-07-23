import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { sendOfferEmailServer } from "@/lib/supabase/offer-send-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;

    const { service, emailSkipped } = await sendOfferEmailServer({
      serviceId: id,
      kind: "estimate",
      actingProfile: profile,
    });

    return NextResponse.json({ service, emailSkipped });
  } catch (error) {
    return jsonError(error);
  }
}
