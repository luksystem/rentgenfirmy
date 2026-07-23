import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { previewOfferEmailServer } from "@/lib/supabase/offer-send-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;

    const { subject, html, to, service } = await previewOfferEmailServer({
      serviceId: id,
      kind: "settlement",
      actingProfile: profile,
    });

    return NextResponse.json({ subject, html, to, service });
  } catch (error) {
    return jsonError(error);
  }
}
