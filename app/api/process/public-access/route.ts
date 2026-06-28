import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import {
  ensureProcessPublicAccess,
  setProcessPublicEnabled,
  updateProcessPublicAccessSettings,
} from "@/lib/supabase/process-public-access-repository";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
  const projectProcessItemId =
    typeof data.projectProcessItemId === "string" ? data.projectProcessItemId : null;

  if (!projectProcessItemId) {
    return NextResponse.json({ error: "projectProcessItemId is required" }, { status: 400 });
  }

  try {
    if (typeof data.enabled === "boolean") {
      const access = await setProcessPublicEnabled(
        getSupabaseAdmin(),
        projectProcessItemId,
        data.enabled,
      );
      return NextResponse.json({ access });
    }

    const access = await updateProcessPublicAccessSettings({
      projectProcessItemId,
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

    return NextResponse.json({ access });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać ustawień dostępu." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  const projectProcessItemId = new URL(request.url).searchParams.get("projectProcessItemId");
  if (!projectProcessItemId) {
    return NextResponse.json({ error: "projectProcessItemId is required" }, { status: 400 });
  }

  try {
    const access = await ensureProcessPublicAccess(getSupabaseAdmin(), projectProcessItemId);
    return NextResponse.json({ access });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wczytać ustawień dostępu." },
      { status: 500 },
    );
  }
}
