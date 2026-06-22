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
      const comment = await addAgreementComment(bundle.agreement.id, {
        authorName: body.authorName?.trim() || "Gość",
        authorSource: "external",
        authorRoleLabel: body.authorRoleLabel,
        body: body.commentBody ?? "",
      });
      return NextResponse.json({ comment });
    }

    if (body.action === "respond") {
      if (!body.roleId) {
        return NextResponse.json({ error: "Wybierz rolę akceptacji." }, { status: 400 });
      }
      const next = await respondToAgreementApproval(bundle.agreement.id, body.roleId, {
        accepted: Boolean(body.accepted),
        respondedByName: body.authorName?.trim() || "Gość",
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
