import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  fetchReportKpiConfigServer,
  updateReportKpiConfigServer,
} from "@/lib/supabase/report-kpi-config-server";
import type { ComparisonPeriodKind } from "@/lib/report-kpi/types";

const COMPARISON_PERIODS: ComparisonPeriodKind[] = ["none", "day", "week", "month", "quarter", "year"];

export async function GET() {
  try {
    await requireAdministratorProfile();
    const admin = getSupabaseAdmin();
    const items = await fetchReportKpiConfigServer(admin);
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdministratorProfile();
    const body = await request.json();

    if (!body || typeof body !== "object" || typeof body.kpiKey !== "string") {
      return NextResponse.json({ error: "Brak kpiKey." }, { status: 400 });
    }

    if (body.comparisonPeriod !== undefined && !COMPARISON_PERIODS.includes(body.comparisonPeriod)) {
      return NextResponse.json({ error: "Nieprawidłowy okres odniesienia." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const item = await updateReportKpiConfigServer(admin, body.kpiKey, {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      warningThreshold:
        body.warningThreshold === null || typeof body.warningThreshold === "number"
          ? body.warningThreshold
          : undefined,
      criticalThreshold:
        body.criticalThreshold === null || typeof body.criticalThreshold === "number"
          ? body.criticalThreshold
          : undefined,
      comparisonPeriod: body.comparisonPeriod,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return jsonError(error);
  }
}
