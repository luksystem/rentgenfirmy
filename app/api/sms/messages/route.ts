import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { listRecentSmsMessages } from "@/lib/supabase/sms-repository";

export async function GET(request: Request) {
  try {
    await requireAdministratorProfile();

    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;

    const items = await listRecentSmsMessages(limit);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
