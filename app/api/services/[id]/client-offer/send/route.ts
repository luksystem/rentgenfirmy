import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { sendOfferEmailServer } from "@/lib/supabase/offer-send-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { note?: string } | null;

    const { service, emailSkipped } = await sendOfferEmailServer({
      serviceId: id,
      kind: "estimate",
      actingProfile: profile,
      note: body?.note,
    });

    return NextResponse.json({ service, emailSkipped });
  } catch (error) {
    return jsonError(error);
  }
}
