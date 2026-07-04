import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { markIntakeOfferReviewedServer } from "@/lib/supabase/service-repository-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { id } = await context.params;
    const service = await markIntakeOfferReviewedServer(id);
    return NextResponse.json({ service });
  } catch (error) {
    return jsonError(error);
  }
}
