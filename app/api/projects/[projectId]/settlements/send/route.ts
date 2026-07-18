import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { buildSettlementReportEmail } from "@/lib/email/settlement-templates";
import { isEmailAudienceEnabled } from "@/lib/email/notification-routing";
import { sendTransactionalEmail } from "@/lib/email/send";
import { formatPartyName } from "@/lib/party/display-name";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import { fetchProjectSettlementsBundleServer } from "@/lib/supabase/project-settlement-server";
import {
  buildProjectHourBudget,
  countBillableWorkMinutes,
} from "@/lib/time-tracking/project-hour-budget";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedProfile();
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      to?: string;
      publicUrl?: string | null;
    };

    const settings = await fetchEmailSettingsServer();
    if (!isEmailAudienceEnabled(settings.routing, "settlement_report", "client")) {
      return NextResponse.json({
        skipped: true,
        message:
          "Wysyłka raportu rozliczenia jest wyłączona w ustawieniach powiadomień e-mail (projekty → Raport rozliczenia).",
      });
    }

    const admin = getSupabaseAdmin();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id, name, client_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      throw new Error(projectError.message);
    }
    if (!project) {
      return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
    }

    const clientId = (project as { client_id?: string | null }).client_id;
    type ClientEmailRow = { first_name?: string; last_name?: string; email?: string };
    let client: ClientEmailRow | null = null;
    if (clientId) {
      const { data } = await admin
        .from("clients")
        .select("id, first_name, last_name, email")
        .eq("id", clientId)
        .maybeSingle();
      client = (data as ClientEmailRow | null) ?? null;
    }

    const to = (body.to ?? client?.email ?? "").trim();
    if (!to) {
      return NextResponse.json({ error: "Brak adresu e-mail klienta." }, { status: 400 });
    }

    const bundle = await fetchProjectSettlementsBundleServer(projectId);
    const clientName = client
      ? formatPartyName({
          firstName: client.first_name ?? "",
          lastName: client.last_name ?? "",
        })
      : "Klient";

    let hourBudget = null;
    if (bundle.settings?.hourlyEnabled) {
      const { data: timeRows, error: timeError } = await admin
        .from("time_entries")
        .select("duration_minutes, status")
        .eq("project_id", projectId);
      if (timeError && !timeError.message.toLowerCase().includes("does not exist")) {
        throw new Error(timeError.message);
      }
      const usedMinutes = countBillableWorkMinutes(
        (timeRows ?? []).map((row) => ({
          durationMinutes: Number((row as { duration_minutes?: number }).duration_minutes) || 0,
          status: String((row as { status?: string }).status ?? ""),
        })),
      );
      hourBudget = buildProjectHourBudget(bundle.quotas, usedMinutes);
    }

    const email = buildSettlementReportEmail({
      clientName,
      projectName: String((project as { name?: string }).name ?? "Projekt"),
      entries: bundle.entries,
      publicUrl: body.publicUrl,
      hourBudget,
    });

    const result = await sendTransactionalEmail({
      to,
      subject: email.subject,
      html: email.html,
    });

    if (result.skipped) {
      return NextResponse.json({
        skipped: true,
        message: "Brak konfiguracji RESEND_API_KEY — e-mail nie został wysłany.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
