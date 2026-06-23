import { NextResponse } from "next/server";
import {
  addAgreementComment,
  fetchAgreementCollaborationByToken,
  respondToAgreementApproval,
} from "@/lib/supabase/project-agreement-collaboration-repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const bundle = await fetchAgreementCollaborationByToken(token);
    if (!bundle) {
      return NextResponse.json({ error: "Nie znaleziono ustalenia." }, { status: 404 });
    }
    return NextResponse.json(bundle);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania ustalenia." },
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
    const bundle = await fetchAgreementCollaborationByToken(token);
    if (!bundle) {
      return NextResponse.json({ error: "Nie znaleziono ustalenia." }, { status: 404 });
    }

    const body = (await request.json()) as {
      action?: "comment" | "respond";
      authorName?: string;
      authorRoleLabel?: string;
      commentBody?: string;
      roleId?: string;
      accepted?: boolean;
      responseNote?: string;
    };

    if (body.action === "comment") {
      const authorName = body.authorName?.trim();
      const commentBody = body.commentBody?.trim();

      if (!authorName) {
        return NextResponse.json({ error: "Podaj imię lub firmę." }, { status: 400 });
      }
      if (!commentBody) {
        return NextResponse.json({ error: "Wpisz treść komentarza." }, { status: 400 });
      }

      const comment = await addAgreementComment(bundle.agreement.id, {
        authorName,
        authorSource: "external",
        authorRoleLabel: body.authorRoleLabel,
        body: commentBody,
      });
      return NextResponse.json({ comment });
    }

    if (body.action === "respond") {
      if (!body.roleId) {
        return NextResponse.json({ error: "Wybierz rolę akceptacji." }, { status: 400 });
      }
      const authorName = body.authorName?.trim();
      if (!authorName) {
        return NextResponse.json({ error: "Podaj imię lub firmę." }, { status: 400 });
      }
      const roleExists = bundle.roles.some((role) => role.id === body.roleId);
      if (!roleExists) {
        return NextResponse.json({ error: "Wybrana rola nie jest dostępna w tym ustaleniu." }, { status: 400 });
      }
      const next = await respondToAgreementApproval(bundle.agreement.id, body.roleId, {
        accepted: Boolean(body.accepted),
        respondedByName: authorName,
        responseNote: body.responseNote,
      });
      return NextResponse.json(next);
    }

    return NextResponse.json({ error: "Nieobsługiwane działanie." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd operacji." },
      { status: 500 },
    );
  }
}
