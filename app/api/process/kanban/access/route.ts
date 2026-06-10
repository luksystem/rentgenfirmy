import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { updateKanbanPublicAccessSettings } from "@/lib/supabase/kanban-public-server";
import { fetchKanbanBoardByItemId } from "@/lib/supabase/kanban-repository";

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
    await updateKanbanPublicAccessSettings({
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

    const board = await fetchKanbanBoardByItemId(projectProcessItemId);
    return NextResponse.json({ board });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać ustawień dostępu." },
      { status: 500 },
    );
  }
}
