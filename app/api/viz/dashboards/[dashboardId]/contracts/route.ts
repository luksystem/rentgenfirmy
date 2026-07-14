import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import type {
  VizServiceContractInput,
  VizServiceContractProjectTermInput,
  VizServiceContractRateVersionInput,
} from "@/lib/viz/contract-types";
import {
  createVizServiceContract,
  createVizServiceContractRateVersion,
  deleteVizServiceContract,
  listVizServiceContracts,
  summarizeDashboardBillableHours,
  upsertVizServiceContractProjectTerm,
} from "@/lib/viz/viz-contracts-server";
import { VIZ_SERVICE_CONTRACT_STATUSES } from "@/lib/viz/types";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const url = new URL(request.url);

    if (url.searchParams.get("hours") === "1") {
      const summary = await summarizeDashboardBillableHours(dashboardId);
      return NextResponse.json({ summary });
    }

    const contracts = await listVizServiceContracts(dashboardId);
    return NextResponse.json({ contracts });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania umów." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    const body = (await request.json()) as
      | ({ kind: "contract" } & VizServiceContractInput)
      | ({ kind: "rateVersion" } & VizServiceContractRateVersionInput)
      | ({ kind: "projectTerm" } & VizServiceContractProjectTermInput);

    if (body.kind === "projectTerm") {
      if (!body.contractId || !body.projectId) {
        return NextResponse.json({ error: "Wymagane contractId i projectId." }, { status: 400 });
      }
      const term = await upsertVizServiceContractProjectTerm(body);
      return NextResponse.json({ term }, { status: 201 });
    }

    if (body.kind === "rateVersion") {
      if (!body.contractId || !body.versionLabel?.trim() || !body.validFrom) {
        return NextResponse.json({ error: "Wymagane pola wersji stawek." }, { status: 400 });
      }
      const rateVersion = await createVizServiceContractRateVersion(body);
      return NextResponse.json({ rateVersion }, { status: 201 });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nazwa umowy jest wymagana." }, { status: 400 });
    }

    if (body.contractType && !VIZ_SERVICE_CONTRACT_STATUSES.includes(body.contractType)) {
      return NextResponse.json({ error: "Nieprawidłowy typ umowy." }, { status: 400 });
    }

    const contract = await createVizServiceContract(dashboardId, body);
    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd tworzenia umowy." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuthenticatedProfile();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Brak identyfikatora umowy." }, { status: 400 });
    }
    await deleteVizServiceContract(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd usuwania umowy." },
      { status: 500 },
    );
  }
}
