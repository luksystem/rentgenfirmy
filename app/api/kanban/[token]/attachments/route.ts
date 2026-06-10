import { NextResponse } from "next/server";
import { resolveKanbanPublicAuthor } from "@/lib/process/kanban-public-request";
import { uploadKanbanTaskAttachment } from "@/lib/supabase/kanban-attachments-repository";
import { fetchPublicKanbanBoardGraph } from "@/lib/supabase/kanban-public-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const taskIdRaw = formData.get("taskId");
  const authorNameRaw = formData.get("authorName");
  const taskId = typeof taskIdRaw === "string" ? taskIdRaw : null;
  const authorNameFallback = typeof authorNameRaw === "string" ? authorNameRaw.trim() : "";
  const file = formData.get("file");
  const setAsCardCoverRaw = formData.get("setAsCardCover");
  const setAsCardCover =
    setAsCardCoverRaw === "true" || setAsCardCoverRaw === "1" || setAsCardCoverRaw === "on";

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  try {
    const authorResult = await resolveKanbanPublicAuthor(token, authorNameFallback);
    if (!authorResult.ok) {
      return NextResponse.json({ error: authorResult.error }, { status: authorResult.status });
    }

    const board = await fetchPublicKanbanBoardGraph(token);
    if (!board) {
      return NextResponse.json({ error: "Nie znaleziono tablicy." }, { status: 404 });
    }

    const attachment = await uploadKanbanTaskAttachment({
      boardId: board.id,
      taskId,
      file,
      authorName: authorResult.authorName,
      authorSide: "client",
      setAsCardCover,
    });

    return NextResponse.json({ attachment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd przesyłania pliku." },
      { status: 400 },
    );
  }
}
