import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import type { MentionCandidate } from "@/lib/notifications/types";
import { sendKanbanMentionPush } from "@/lib/notifications/server";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedProfile();

    const data = (await request.json()) as {
      commentId?: string;
      taskId?: string;
      taskTitle?: string;
      body?: string;
      authorName?: string;
      candidates?: MentionCandidate[];
      linkUrl?: string;
    };

    if (!data.commentId || !data.taskId || !data.body || !data.authorName || !data.candidates?.length) {
      return NextResponse.json({ error: "Brak wymaganych danych." }, { status: 400 });
    }

    await sendKanbanMentionPush({
      commentId: data.commentId,
      taskId: data.taskId,
      taskTitle: data.taskTitle ?? "Zgłoszenie",
      body: data.body,
      authorName: data.authorName,
      candidates: data.candidates,
      linkUrl: data.linkUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd wysyłki powiadomienia push." },
      { status: 400 },
    );
  }
}
