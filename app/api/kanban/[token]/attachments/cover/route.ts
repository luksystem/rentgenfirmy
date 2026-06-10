import { NextResponse } from "next/server";
import { resolveKanbanPublicAuthor } from "@/lib/process/kanban-public-request";
import {
  clearKanbanTaskAttachmentCover,
  setKanbanTaskAttachmentCover,
} from "@/lib/supabase/kanban-attachments-repository";
import { fetchPublicKanbanBoardGraph } from "@/lib/supabase/kanban-public-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const taskId = typeof data.taskId === "string" ? data.taskId : null;
  const attachmentId = typeof data.attachmentId === "string" ? data.attachmentId : null;
  const isCardCover = data.isCardCover === true;

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  try {
    const authorResult = await resolveKanbanPublicAuthor(
      token,
      typeof data.authorName === "string" ? data.authorName : undefined,
    );
    if (!authorResult.ok) {
      return NextResponse.json({ error: authorResult.error }, { status: authorResult.status });
    }

    const board = await fetchPublicKanbanBoardGraph(token);
    if (!board) {
      return NextResponse.json({ error: "Nie znaleziono tablicy." }, { status: 404 });
    }

    if (attachmentId) {
      const attachment = await setKanbanTaskAttachmentCover({
        boardId: board.id,
        taskId,
        attachmentId,
        isCardCover,
      });
      return NextResponse.json({ attachment });
    }

    if (!isCardCover) {
      await clearKanbanTaskAttachmentCover({ boardId: board.id, taskId });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "attachmentId is required when setting cover" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zmienić okładki." },
      { status: 400 },
    );
  }
}
