import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { createSession, listSessions } from "@/lib/supabase/audit-repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const items = await listSessions(userId);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = body.name?.trim();
    if (!name) throw new HttpError(400, "Nazwa audytu jest wymagana.");
    const session = await createSession(userId, name);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
