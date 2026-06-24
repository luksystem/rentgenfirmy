import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  parseDashboardSessionValue,
  DASHBOARD_PUBLIC_SESSION_COOKIE,
} from "@/lib/dashboard/dashboard-session";
import type {
  AgreementFulfillmentInput,
  ProjectSatisfactionOverviewInput,
  SpecificationFulfillmentInput,
  StageSatisfactionInput,
} from "@/lib/dashboard/satisfaction-types";
import {
  fetchDashboardPublicMeta,
  fetchPublicDashboardPayload,
} from "@/lib/supabase/public-dashboard-server";
import {
  fetchProjectSatisfactionBundleServer,
  upsertAgreementFulfillmentServer,
  upsertProjectSatisfactionOverviewServer,
  upsertSpecificationFulfillmentServer,
  upsertStageSatisfactionServer,
} from "@/lib/supabase/project-satisfaction-server";

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

async function resolveProjectId(token: string, projectId: string | null) {
  if (!projectId) {
    return null;
  }

  const payload = await fetchPublicDashboardPayload(token, projectId);
  if (!payload || payload.initialProjectId !== projectId) {
    return null;
  }

  return payload.initialProjectId;
}

function enforceClientSide(input: { reviewedBySide?: string; authorSide?: string }) {
  if (input.reviewedBySide && input.reviewedBySide !== "client") {
    throw new Error("Publiczny dashboard pozwala zapisywać tylko oceny klienta.");
  }
  if (input.authorSide && input.authorSide !== "client") {
    throw new Error("Publiczny dashboard pozwala zapisywać tylko oceny klienta.");
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const access = await assertPublicDashboardAccess(token);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const projectId = new URL(request.url).searchParams.get("projectId");
    const resolvedProjectId = await resolveProjectId(token, projectId);
    if (!resolvedProjectId) {
      return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
    }

    const bundle = await fetchProjectSatisfactionBundleServer(resolvedProjectId);
    return NextResponse.json({
      bundle: bundle ?? {
        agreementFulfillments: [],
        specificationFulfillments: [],
        stageSatisfactions: [],
        overview: null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania ocen." },
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
    const access = await assertPublicDashboardAccess(token);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const projectId = new URL(request.url).searchParams.get("projectId");
    const resolvedProjectId = await resolveProjectId(token, projectId);
    if (!resolvedProjectId) {
      return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
    }

    const body = (await request.json()) as {
      action?: string;
      input?: Record<string, unknown>;
    };

    switch (body.action) {
      case "agreement": {
        const input = body.input as AgreementFulfillmentInput;
        enforceClientSide(input);
        const entry = await upsertAgreementFulfillmentServer(resolvedProjectId, {
          ...input,
          reviewedBySide: "client",
        });
        return NextResponse.json({ kind: "agreement", entry });
      }
      case "specification": {
        const input = body.input as SpecificationFulfillmentInput;
        enforceClientSide(input);
        const entry = await upsertSpecificationFulfillmentServer(resolvedProjectId, {
          ...input,
          reviewedBySide: "client",
        });
        return NextResponse.json({ kind: "specification", entry });
      }
      case "stage": {
        const input = body.input as StageSatisfactionInput;
        enforceClientSide(input);
        const entry = await upsertStageSatisfactionServer(resolvedProjectId, {
          ...input,
          authorSide: "client",
        });
        return NextResponse.json({ kind: "stage", entry });
      }
      case "overview": {
        const input = body.input as ProjectSatisfactionOverviewInput;
        enforceClientSide(input);
        const entry = await upsertProjectSatisfactionOverviewServer(resolvedProjectId, {
          ...input,
          reviewedBySide: "client",
        });
        return NextResponse.json({ kind: "overview", entry });
      }
      default:
        return NextResponse.json({ error: "Nieobsługiwana operacja." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd zapisu oceny." },
      { status: 500 },
    );
  }
}
