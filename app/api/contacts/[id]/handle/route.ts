import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { markContactHandledServer } from "@/lib/supabase/contact-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { id } = await context.params;
    const contact = await markContactHandledServer(id);
    return NextResponse.json({ contact });
  } catch (error) {
    return jsonError(error);
  }
}
