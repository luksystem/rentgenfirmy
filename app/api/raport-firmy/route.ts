import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { isAdministratorRole } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchReportKpiConfigMapServer } from "@/lib/supabase/report-kpi-config-server";
import { computeTeamDomainReport } from "@/lib/report-kpi/domains/team";
import { computeGrowthDomainReport } from "@/lib/report-kpi/domains/growth";
import { computeSalesDomainReport } from "@/lib/report-kpi/domains/sales";
import { computeServiceDomainReport } from "@/lib/report-kpi/domains/service";
import { computeBudgetDomainReport } from "@/lib/report-kpi/domains/budget";
import type { RaportFirmyPayload } from "@/lib/report-kpi/types";

export async function GET() {
  try {
    const session = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const configByKey = await fetchReportKpiConfigMapServer(admin);
    const asOf = new Date();

    const [team, growth, sales, service] = await Promise.all([
      computeTeamDomainReport(admin, asOf, configByKey),
      computeGrowthDomainReport(admin, asOf, configByKey),
      computeSalesDomainReport(admin, asOf, configByKey),
      computeServiceDomainReport(admin, asOf, configByKey),
    ]);

    const payload: RaportFirmyPayload = {
      generatedAt: asOf.toISOString(),
      team,
      growth,
      sales,
      service,
    };

    // Budżet dokładany tylko dla administratora — dla innych ról klucz `budget` w ogóle
    // nie istnieje w odpowiedzi (nie jest "ukryty", tylko nieobecny w JSON-ie).
    if (isAdministratorRole(session.profile.role)) {
      payload.budget = await computeBudgetDomainReport(admin, asOf, configByKey);
    }

    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
