import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { convertContactToClientServer } from "@/lib/supabase/contact-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedProfile();
    const { id } = await context.params;
    const result = await convertContactToClientServer(id, { source: "manual" });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
