import { NextResponse } from "next/server";
import { notifyTeamAboutChangeRequestDecision } from "@/lib/notifications/change-request";
import {
  fetchChangeRequestByPublicToken,
  respondToChangeRequestByPublicToken,
} from "@/lib/supabase/project-change-request-public-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const bundle = await fetchChangeRequestByPublicToken(token);
    if (!bundle) {
      return NextResponse.json(
        { error: "Nie znaleziono zmiany lub link wygasł." },
        { status: 404 },
      );
    }
    return NextResponse.json(bundle);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania zmiany." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const body = (await request.json()) as {
      action?: "respond";
      authorName?: string;
      accepted?: boolean;
      clientResponseNote?: string;
    };

    if (body.action !== "respond") {
      return NextResponse.json({ error: "Nieobsługiwane działanie." }, { status: 400 });
    }

    const authorName = body.authorName?.trim();
    if (!authorName) {
      return NextResponse.json({ error: "Podaj imię lub firmę." }, { status: 400 });
    }

    const changeRequest = await respondToChangeRequestByPublicToken(token, {
      accepted: Boolean(body.accepted),
      clientResponseName: authorName,
      clientResponseNote: body.clientResponseNote,
    });

    await notifyTeamAboutChangeRequestDecision({
      changeRequestId: changeRequest.id,
      projectId: changeRequest.projectId,
      title: changeRequest.title,
      accepted: changeRequest.status === "accepted",
      clientResponseName: changeRequest.clientResponseName ?? authorName,
    }).catch(() => undefined);

    const bundle = await fetchChangeRequestByPublicToken(token);
    return NextResponse.json(bundle ?? { changeRequest, linkActive: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd operacji." },
      { status: 400 },
    );
  }
}
