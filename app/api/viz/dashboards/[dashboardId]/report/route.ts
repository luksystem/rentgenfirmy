import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateVizDashboardReportPdf } from "@/lib/viz/viz-report-pdf";
import { getVizDashboardLiveSnapshots } from "@/lib/viz/viz-telemetry-server";
import { getVizDashboardServiceSla } from "@/lib/viz/viz-service-sla-server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ dashboardId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { dashboardId } = await context.params;

    const supabase = getSupabaseAdmin();
    const { data: dashboard, error } = await supabase
      .from("viz_dashboards")
      .select("name")
      .eq("id", dashboardId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!dashboard) {
      return NextResponse.json({ error: "Nie znaleziono dashboardu." }, { status: 404 });
    }

    const [live, sla] = await Promise.all([
      getVizDashboardLiveSnapshots(dashboardId),
      getVizDashboardServiceSla(dashboardId),
    ]);

    const pdfBytes = await generateVizDashboardReportPdf({
      dashboardName: dashboard.name as string,
      generatedAt: new Date().toISOString(),
      kpi: live.kpi,
      snapshots: live.snapshots,
      sla,
    });

    const safeName = String(dashboard.name)
      .replace(/[^\w\s-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="raport-bms-${safeName || dashboardId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd generowania raportu." },
      { status: 500 },
    );
  }
}
