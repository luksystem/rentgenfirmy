import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { updateDashboardPublicAccessSettings } from "@/lib/supabase/public-dashboard-server";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const spaceId = typeof data.spaceId === "string" ? data.spaceId : null;

  if (!spaceId) {
    return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
  }

  try {
    const space = await updateDashboardPublicAccessSettings({
      spaceId,
      password:
        data.password === null
          ? null
          : typeof data.password === "string"
            ? data.password
            : undefined,
      username:
        data.username === null
          ? null
          : typeof data.username === "string"
            ? data.username
            : undefined,
      authorName:
        data.authorName === null
          ? null
          : typeof data.authorName === "string"
            ? data.authorName
            : undefined,
    });

    return NextResponse.json({ space });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać ustawień dostępu." },
      { status: 500 },
    );
  }
}
