import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { addWorkItemCommentServer } from "@/lib/supabase/my-work-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json()) as { body?: string };

    const admin = getSupabaseAdmin();
    const detail = await addWorkItemCommentServer(admin, id, body.body ?? "", profile);
    return NextResponse.json({ detail });
  } catch (error) {
    return jsonError(error);
  }
}
