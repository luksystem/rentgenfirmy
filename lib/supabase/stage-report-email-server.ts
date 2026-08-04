import "server-only";

import { formatPartyName } from "@/lib/party/display-name";
import { getUserDisplayName } from "@/lib/auth/types";
import { buildStageReportDeliveryEmail } from "@/lib/email/stage-report-templates";
import { isEmailAudienceEnabled } from "@/lib/email/notification-routing";
import { sendTransactionalEmail } from "@/lib/email/send";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToStageReport } from "@/lib/supabase/stage-report-repository";
import type { ProjectStageReportRow } from "@/lib/supabase/database.types";
import type { StageReport } from "@/lib/stage-report/types";

async function fetchReportTarget(reportId: string): Promise<{
  report: StageReport;
  recipientEmail: string;
  recipientName: string;
}> {
  const admin = getSupabaseAdmin();
  const { data: reportRow, error: reportError } = await admin
    .from("project_stage_reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();
  if (reportError) throw new Error(reportError.message);
  if (!reportRow) throw new Error("Nie znaleziono raportu etapowego.");

  const report = rowToStageReport(reportRow as ProjectStageReportRow);
  if (report.status === "wygenerowany") {
    throw new Error("Raport musi być najpierw zatwierdzony.");
  }

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("client_id")
    .eq("id", report.projectId)
    .maybeSingle();
  if (projectError) throw new Error(projectError.message);

  let recipientEmail = "";
  let recipientName = "Klient";

  if (project?.client_id) {
    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("first_name, last_name, email")
      .eq("id", project.client_id)
      .maybeSingle();
    if (clientError) throw new Error(clientError.message);

    recipientEmail = String(client?.email ?? "").trim();
    recipientName =
      formatPartyName({
        firstName: String(client?.first_name ?? "").trim(),
        lastName: String(client?.last_name ?? "").trim(),
      }) || recipientName;
  }

  return { report, recipientEmail, recipientName };
}

/** Buduje treść maila (podgląd) bez wysyłki — do dialogu "podgląd + notatka" przed potwierdzeniem. */
export async function previewStageReportEmailServer(input: { reportId: string; note?: string | null }) {
  const target = await fetchReportTarget(input.reportId);

  const [settings, company] = await Promise.all([
    fetchEmailSettingsServer(),
    resolveCompanyProfileDocumentServer(),
  ]);

  const template = buildStageReportDeliveryEmail({
    recipientName: target.recipientName,
    projectName: target.report.content.projectName,
    stageTitle: target.report.content.stageTitle,
    milestoneTitle: target.report.content.milestoneTitle,
    content: target.report.content,
    coordinatorComment: target.report.coordinatorComment,
    settings,
    company,
    senderNote: input.note,
  });

  return {
    subject: template.subject,
    html: template.html,
    to: target.recipientEmail,
  };
}

export async function sendStageReportEmailServer(input: {
  reportId: string;
  sentBy: string;
  note?: string | null;
}) {
  const target = await fetchReportTarget(input.reportId);

  const [settings, company] = await Promise.all([
    fetchEmailSettingsServer(),
    resolveCompanyProfileDocumentServer(),
  ]);

  if (!isEmailAudienceEnabled(settings.routing, "stage_report_delivery", "client")) {
    throw new Error("Wysyłka e-mail raportów etapowych jest wyłączona w Ustawienia → E-mail → Kiedy wysyłać.");
  }

  if (!target.recipientEmail) {
    throw new Error("Klient nie ma adresu e-mail w bazie.");
  }

  const template = buildStageReportDeliveryEmail({
    recipientName: target.recipientName,
    projectName: target.report.content.projectName,
    stageTitle: target.report.content.stageTitle,
    milestoneTitle: target.report.content.milestoneTitle,
    content: target.report.content,
    coordinatorComment: target.report.coordinatorComment,
    settings,
    company,
    senderNote: input.note,
  });

  const result = await sendTransactionalEmail({
    to: target.recipientEmail,
    subject: template.subject,
    html: template.html,
  });

  if (result.skipped) {
    throw new Error("Wysyłka e-mail nie jest skonfigurowana (brak RESEND_API_KEY).");
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("project_stage_reports")
    .update({ status: "wyslany", sent_at: now, sent_by: input.sentBy })
    .eq("id", input.reportId)
    .select("*")
    .single();
  if (updateError) throw new Error(updateError.message);

  const { data: senderProfile } = await admin
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", input.sentBy)
    .maybeSingle();
  const sentByName = senderProfile
    ? getUserDisplayName({
        firstName: senderProfile.first_name ?? "",
        lastName: senderProfile.last_name ?? "",
        email: senderProfile.email ?? "",
      })
    : "";

  // Append-only historia — niezależna od project_stage_reports.sent_at/sent_by (te trzymają tylko
  // ostatnią wysyłkę), więc "Wyślij ponownie" nie gubi śladu po poprzednich wysyłkach ani ich notatkach.
  const { error: deliveryError } = await admin.from("project_stage_report_deliveries").insert({
    report_id: input.reportId,
    sent_at: now,
    sent_by: input.sentBy,
    sent_by_name: sentByName,
    recipient_email: target.recipientEmail,
    subject: template.subject,
    note: input.note ?? "",
  });
  if (deliveryError) throw new Error(deliveryError.message);

  return {
    ok: true as const,
    recipientEmail: target.recipientEmail,
    report: rowToStageReport(updated as ProjectStageReportRow),
  };
}
