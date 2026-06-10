import { NextResponse } from "next/server";
import { uploadKanbanTaskAttachment } from "@/lib/supabase/kanban-attachments-repository";
import { fetchKanbanBoardByToken } from "@/lib/supabase/kanban-repository";

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
  const authorName = typeof authorNameRaw === "string" ? authorNameRaw.trim() : "";
  const file = formData.get("file");

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  if (!authorName) {
    return NextResponse.json({ error: "authorName is required" }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  try {
    const board = await fetchKanbanBoardByToken(token);
    if (!board) {
      return NextResponse.json({ error: "Nie znaleziono tablicy." }, { status: 404 });
    }

    const attachment = await uploadKanbanTaskAttachment({
      boardId: board.id,
      taskId,
      file,
      authorName,
      authorSide: "client",
    });

    return NextResponse.json({ attachment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd przesyłania pliku." },
      { status: 400 },
    );
  }
}
