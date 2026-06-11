import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseKanbanSessionValue, KANBAN_PUBLIC_SESSION_COOKIE } from "@/lib/process/kanban-session";
import { resolveKanbanPublicAuthor } from "@/lib/process/kanban-public-request";
import {
  addKanbanComment,
  closeKanbanTask,
  createKanbanTask,
  moveKanbanTask,
  updateKanbanTask,
} from "@/lib/supabase/kanban-repository";
import {
  fetchKanbanPublicMeta,
  fetchPublicKanbanBoardGraph,
} from "@/lib/supabase/kanban-public-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const meta = await fetchKanbanPublicMeta(token);
    if (!meta) {
      return NextResponse.json({ error: "Nie znaleziono tablicy." }, { status: 404 });
    }

    const cookieStore = await cookies();
    const session = parseKanbanSessionValue(cookieStore.get(KANBAN_PUBLIC_SESSION_COOKIE)?.value);
    const sessionValid = session?.token === token;

    if (meta.access.authRequired && !sessionValid) {
      return NextResponse.json({
        authRequired: true,
        access: meta.access,
        context: meta.context,
      });
    }

    const board = await fetchPublicKanbanBoardGraph(token);
    if (!board) {
      return NextResponse.json({ error: "Nie znaleziono tablicy." }, { status: 404 });
    }

    return NextResponse.json({
      board,
      context: meta.context,
      access: meta.access,
      authorName: sessionValid ? session.authorName : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania tablicy." },
      { status: 500 },
    );
  }
}

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
  const action = typeof data.action === "string" ? data.action : null;

  try {
    const authorResult = await resolveKanbanPublicAuthor(
      token,
      typeof data.authorName === "string" ? data.authorName : undefined,
    );
    if (!authorResult.ok) {
      return NextResponse.json({ error: authorResult.error }, { status: authorResult.status });
    }

    const { authorName } = authorResult;
    const board = await fetchPublicKanbanBoardGraph(token);
    if (!board) {
      return NextResponse.json({ error: "Nie znaleziono tablicy." }, { status: 404 });
    }

    if (action === "createTask") {
      const columnId = typeof data.columnId === "string" ? data.columnId : null;
      const title = typeof data.title === "string" ? data.title : "";
      if (!columnId) {
        return NextResponse.json({ error: "columnId is required" }, { status: 400 });
      }
      const task = await createKanbanTask({
        columnId,
        title,
        authorSide: "client",
        authorName,
        priority:
          data.priority === "low" ||
          data.priority === "normal" ||
          data.priority === "high" ||
          data.priority === "urgent"
            ? data.priority
            : undefined,
        dueDate: typeof data.dueDate === "string" ? data.dueDate : null,
      });
      return NextResponse.json({ task });
    }

    if (action === "moveTask") {
      const taskId = typeof data.taskId === "string" ? data.taskId : null;
      const columnId = typeof data.columnId === "string" ? data.columnId : null;
      const position = typeof data.position === "number" ? data.position : 0;
      if (!taskId || !columnId) {
        return NextResponse.json({ error: "taskId and columnId are required" }, { status: 400 });
      }
      const task = await moveKanbanTask(taskId, columnId, position);
      return NextResponse.json({ task });
    }

    if (action === "addComment") {
      const taskId = typeof data.taskId === "string" ? data.taskId : null;
      const commentBody = typeof data.body === "string" ? data.body : "";
      if (!taskId) {
        return NextResponse.json({ error: "taskId is required" }, { status: 400 });
      }
      const comment = await addKanbanComment({
        taskId,
        authorName,
        authorSide: "client",
        body: commentBody,
      });
      return NextResponse.json({ comment });
    }

    if (action === "updateTask") {
      const taskId = typeof data.taskId === "string" ? data.taskId : null;
      if (!taskId) {
        return NextResponse.json({ error: "taskId is required" }, { status: 400 });
      }
      const task = await updateKanbanTask(taskId, {
        title: typeof data.title === "string" ? data.title : undefined,
        description: typeof data.description === "string" ? data.description : undefined,
        priority:
          data.priority === "low" ||
          data.priority === "normal" ||
          data.priority === "high" ||
          data.priority === "urgent"
            ? data.priority
            : undefined,
        dueDate: typeof data.dueDate === "string" ? data.dueDate : data.dueDate === null ? null : undefined,
        assigneeName:
          typeof data.assigneeName === "string"
            ? data.assigneeName
            : data.assigneeName === null
              ? null
              : undefined,
      });
      return NextResponse.json({ task });
    }

    if (action === "closeTask") {
      const taskId = typeof data.taskId === "string" ? data.taskId : null;
      if (!taskId) {
        return NextResponse.json({ error: "taskId is required" }, { status: 400 });
      }
      const task = await closeKanbanTask(taskId, true, { authorName, authorSide: "client" });
      return NextResponse.json({ task });
    }

    if (action === "reopenTask") {
      const taskId = typeof data.taskId === "string" ? data.taskId : null;
      if (!taskId) {
        return NextResponse.json({ error: "taskId is required" }, { status: 400 });
      }
      const task = await closeKanbanTask(taskId, false, { authorName, authorSide: "client" });
      return NextResponse.json({ task });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd operacji." },
      { status: 500 },
    );
  }
}
