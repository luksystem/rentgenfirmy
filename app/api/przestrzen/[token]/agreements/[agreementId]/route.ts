import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  parseDashboardSessionValue,
  DASHBOARD_PUBLIC_SESSION_COOKIE,
} from "@/lib/dashboard/dashboard-session";
import type { AgreementCollaborationBundle } from "@/lib/dashboard/agreement-collaboration-types";
import {
  addAgreementComment,
  fetchAgreementCollaboration,
  respondToAgreementApproval,
} from "@/lib/supabase/project-agreement-collaboration-repository";
import {
  fetchDashboardPublicMeta,
  fetchPublicDashboardPayload,
} from "@/lib/supabase/public-dashboard-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { respondToProjectAgreement } from "@/lib/supabase/project-agreement-repository";
import { notifyTeamAboutAgreementResponse } from "@/lib/notifications/agreement-response";

async function assertPublicDashboardAccess(token: string) {
  const meta = await fetchDashboardPublicMeta(token);
  if (!meta) {
    return { ok: false as const, status: 404, error: "Nie znaleziono dashboardu klienta." };
  }

  if (meta.access.authRequired) {
    const cookieStore = await cookies();
    const session = parseDashboardSessionValue(
      cookieStore.get(DASHBOARD_PUBLIC_SESSION_COOKIE)?.value,
    );
    if (!session || session.token !== token) {
      return { ok: false as const, status: 401, error: "Brak dostępu do dashboardu." };
    }
  }

  return { ok: true as const };
}

async function resolveAgreementInDashboard(
  dashboardToken: string,
  agreementId: string,
  projectId: string | null,
) {
  if (!projectId) {
    return null;
  }

  const payload = await fetchPublicDashboardPayload(dashboardToken, projectId);
  if (!payload || payload.initialProjectId !== projectId) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .select("id, project_id")
    .eq("id", agreementId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string; agreementId: string }> },
) {
  const { token, agreementId } = await context.params;

  try {
    const access = await assertPublicDashboardAccess(token);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const projectId = new URL(request.url).searchParams.get("projectId");
    const resolvedId = await resolveAgreementInDashboard(token, agreementId, projectId);
    if (!resolvedId) {
      return NextResponse.json({ error: "Nie znaleziono ustalenia." }, { status: 404 });
    }

    const bundle = await fetchAgreementCollaboration(resolvedId);
    return NextResponse.json(bundle satisfies AgreementCollaborationBundle);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania ustalenia." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string; agreementId: string }> },
) {
  const { token, agreementId } = await context.params;

  try {
    const access = await assertPublicDashboardAccess(token);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const projectId = new URL(request.url).searchParams.get("projectId");
    const resolvedId = await resolveAgreementInDashboard(token, agreementId, projectId);
    if (!resolvedId) {
      return NextResponse.json({ error: "Nie znaleziono ustalenia." }, { status: 404 });
    }

    const body = (await request.json()) as {
      action?: "comment" | "respond" | "legacy_respond";
      authorName?: string;
      commentBody?: string;
      roleId?: string;
      accepted?: boolean;
      responseNote?: string;
      clientResponseNote?: string;
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

      const comment = await addAgreementComment(resolvedId, {
        authorName,
        authorSource: "client",
        authorRoleLabel: "Klient",
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

      const bundle = await respondToAgreementApproval(resolvedId, body.roleId, {
        accepted: Boolean(body.accepted),
        respondedByName: authorName,
        responseNote: body.responseNote,
      });
      return NextResponse.json(bundle);
    }

    if (body.action === "legacy_respond") {
      const authorName = body.authorName?.trim();
      if (!authorName) {
        return NextResponse.json({ error: "Podaj imię lub firmę." }, { status: 400 });
      }

      const responseInput = {
        accepted: Boolean(body.accepted),
        clientResponseName: authorName,
        clientResponseNote: body.clientResponseNote ?? body.responseNote,
      };
      const agreement = await respondToProjectAgreement(resolvedId, responseInput);
      void notifyTeamAboutAgreementResponse({
        agreementId: agreement.id,
        projectId: agreement.projectId,
        title: agreement.title,
        accepted: responseInput.accepted,
        clientResponseName: responseInput.clientResponseName,
        clientResponseNote: responseInput.clientResponseNote,
      }).catch(() => undefined);
      return NextResponse.json({ agreement });
    }

    return NextResponse.json({ error: "Nieobsługiwana akcja." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operacja nie powiodła się." },
      { status: 400 },
    );
  }
}
