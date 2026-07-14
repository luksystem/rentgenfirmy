import { NextResponse } from "next/server";
import { getUserDisplayName } from "@/lib/auth/types";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import { listVizDashboardProjects } from "@/lib/supabase/viz-server";
import {
  analyzeVizEnergyInvoice,
  getVizEnergySummary,
  listVizEnergyInvoices,
  uploadVizEnergyInvoice,
} from "@/lib/viz/viz-energy-server";
import { requireVizPermission } from "@/lib/viz/viz-auth-server";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    await requireVizPermission(dashboardId, userId, profile.role, "viewEnergy");

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId")?.trim() || undefined;

    if (url.searchParams.get("summary") === "1") {
      const summary = await getVizEnergySummary({ dashboardId, projectId });
      return NextResponse.json(summary);
    }

    const invoices = await listVizEnergyInvoices({ dashboardId, projectId });
    return NextResponse.json({ invoices });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania faktur energii." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    await requireVizPermission(dashboardId, userId, profile.role, "uploadInvoices");

    const formData = await request.formData();
    const projectId = String(formData.get("projectId") ?? "").trim();
    const file = formData.get("file");

    if (!projectId) {
      return NextResponse.json({ error: "projectId jest wymagane." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Plik PDF jest wymagany." }, { status: 400 });
    }

    const projects = await listVizDashboardProjects(dashboardId);
    const project = projects.find((item) => item.projectId === projectId);
    if (!project) {
      return NextResponse.json({ error: "Projekt nie należy do dashboardu." }, { status: 400 });
    }

    const parseNumber = (value: FormDataEntryValue | null) => {
      if (typeof value !== "string" || !value.trim()) {
        return null;
      }
      const numeric = Number.parseFloat(value.replace(",", "."));
      return Number.isNaN(numeric) ? null : numeric;
    };

    const invoice = await uploadVizEnergyInvoice({
      dashboardId,
      projectId,
      clientId: project.clientId,
      file,
      meta: {
        billingPeriodStart: String(formData.get("billingPeriodStart") ?? "").trim() || null,
        billingPeriodEnd: String(formData.get("billingPeriodEnd") ?? "").trim() || null,
        totalKwh: parseNumber(formData.get("totalKwh")),
        totalCostPln: parseNumber(formData.get("totalCostPln")),
        supplierName: String(formData.get("supplierName") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
      },
      uploadedByUserId: userId,
      uploadedByName: getUserDisplayName(profile),
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd zapisu faktury energii." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;
    await requireVizPermission(dashboardId, userId, profile.role, "analyzeInvoices");

    const body = (await request.json()) as { invoiceId?: string };
    if (!body.invoiceId?.trim()) {
      return NextResponse.json({ error: "invoiceId jest wymagane." }, { status: 400 });
    }

    const invoice = await analyzeVizEnergyInvoice(body.invoiceId.trim());
    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd analizy faktury energii." },
      { status: 500 },
    );
  }
}
