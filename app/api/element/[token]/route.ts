import { NextResponse } from "next/server";
import { fetchPublicProcessItemByToken } from "@/lib/supabase/process-public-server";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const payload = await fetchPublicProcessItemByToken(token);

  if (!payload || payload.isInternalAcceptance) {
    return NextResponse.json({ error: "Nie znaleziono publicznego elementu." }, { status: 404 });
  }

  return NextResponse.json({ item: payload });
}
