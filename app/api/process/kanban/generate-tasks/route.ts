import { NextResponse } from "next/server";
import { generateKanbanTasksFromClientText } from "@/lib/ai/kanban-task-generator";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";

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
  const clientText = typeof data.clientText === "string" ? data.clientText : "";

  try {
    const tasks = await generateKanbanTasksFromClientText(clientText);
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wygenerować tasków." },
      { status: 500 },
    );
  }
}
