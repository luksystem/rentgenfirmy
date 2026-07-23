import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { buildClientOfferSummaries } from "@/lib/dashboard/client-offer-summary";
import { buildSettlementReportEmail } from "@/lib/email/settlement-templates";
import { isChannelEnabled, isEmailAudienceEnabled } from "@/lib/email/notification-routing";
import { sendTransactionalEmail } from "@/lib/email/send";
import { absoluteAppUrl } from "@/lib/messages/app-url";
import { renderPlainTemplateString } from "@/lib/notifications/dispatch";
import { formatPartyName } from "@/lib/party/display-name";
import { sendSms } from "@/lib/sms/sendSms";
import { buildSettlementOriginBreakdown } from "@/lib/settlements/origin-breakdown";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import {
  rowToChangeRequest,
  type ChangeRequestRow,
} from "@/lib/supabase/project-change-request-repository";
import { fetchProjectSettlementsBundleServer } from "@/lib/supabase/project-settlement-server";
import { rowToService } from "@/lib/supabase/service-mappers";
import type { ServiceRow } from "@/lib/supabase/database.types";

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
    const emailEnabled = isEmailAudienceEnabled(settings.routing, "settlement_report", "client");
    const smsEnabled = isChannelEnabled(settings.routing, "settlement_report", "sms");
    if (!emailEnabled && !smsEnabled) {
      return NextResponse.json({
        skipped: true,
        message:
          "Wysyłka raportu rozliczenia jest wyłączona w ustawieniach powiadomień (projekty → Raport rozliczenia).",
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
    type ClientEmailRow = { first_name?: string; last_name?: string; email?: string; phone?: string };
    let client: ClientEmailRow | null = null;
    if (clientId) {
      const { data } = await admin
        .from("clients")
        .select("id, first_name, last_name, email, phone")
        .eq("id", clientId)
        .maybeSingle();
      client = (data as ClientEmailRow | null) ?? null;
    }

    const to = (body.to ?? client?.email ?? "").trim();
    if (emailEnabled && !to) {
      return NextResponse.json({ error: "Brak adresu e-mail klienta." }, { status: 400 });
    }

    const bundle = await fetchProjectSettlementsBundleServer(projectId);
    const clientName = client
      ? formatPartyName({
          firstName: client.first_name ?? "",
          lastName: client.last_name ?? "",
        })
      : "Klient";
    const projectName = String((project as { name?: string }).name ?? "Projekt");

    const [changeRequestResult, serviceResult] = await Promise.all([
      admin.from("project_change_requests").select("*").eq("project_id", projectId),
      admin.from("services").select("*").eq("project_id", projectId),
    ]);
    const changeRequestRows = changeRequestResult.error ? [] : changeRequestResult.data ?? [];
    const serviceRows = serviceResult.error ? [] : serviceResult.data ?? [];
    const changeRequests = changeRequestRows.map((row) => rowToChangeRequest(row as ChangeRequestRow));
    const projectNames = new Map([[projectId, projectName]]);
    const offerSummaries = buildClientOfferSummaries(
      serviceRows.map((row) => rowToService(row as ServiceRow)),
      projectNames,
      { projectId },
    );

    const originBreakdown = buildSettlementOriginBreakdown({
      projectId,
      settings: bundle.settings,
      entries: bundle.entries,
      changeRequests,
      offerSummaries,
    });
    const pendingItems = [...originBreakdown.changeRequests.pending, ...originBreakdown.offers.pending].map(
      (line) => ({
        title: line.title,
        amountNet: line.amountNet,
        publicUrl: line.publicPath ? absoluteAppUrl(line.publicPath) : null,
      }),
    );

    const email = buildSettlementReportEmail({
      clientName,
      projectName,
      entries: bundle.entries,
      publicUrl: body.publicUrl,
      hourBudget: bundle.settings?.hourlyEnabled ? bundle.hourBudget ?? null : null,
      pendingItems,
    });

    let emailSkipped = false;
    if (emailEnabled && to) {
      const result = await sendTransactionalEmail({
        to,
        subject: email.subject,
        html: email.html,
      });
      emailSkipped = Boolean(result.skipped);
    }

    if (smsEnabled && client?.phone?.trim() && body.publicUrl) {
      try {
        const message = renderPlainTemplateString(settings.templates.settlement_report.sms, {
          project_name: projectName,
          public_url: body.publicUrl,
        });
        if (message) {
          await sendSms({
            phone: client.phone.trim(),
            message,
            metadata: { type: "settlement_report", projectId },
          });
        }
      } catch (smsError) {
        console.warn("[settlement-report] sms failed:", smsError);
      }
    }

    if (emailSkipped) {
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
