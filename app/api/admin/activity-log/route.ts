import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { fetchActivityLogPage } from "@/lib/supabase/activity-log-server";

export async function GET(request: Request) {
  try {
    await requireAdministratorProfile();

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
    const cursor = url.searchParams.get("cursor");
    const actorUserId = url.searchParams.get("actorUserId");
    const entityType = url.searchParams.get("entityType");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const page = await fetchActivityLogPage({
      limit,
      cursor,
      actorUserId,
      entityType,
      from,
      to,
    });

    return NextResponse.json(page);
  } catch (error) {
    return jsonError(error);
  }
}
