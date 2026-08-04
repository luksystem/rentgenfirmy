import type { CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { defaultEmailSettings, type EmailSettings } from "@/lib/email/email-settings";
import { buildEmailShell, escapeEmailHtml } from "@/lib/email/layout";
import { renderEmailSubject, renderEmailTemplateString } from "@/lib/email/template-render";
import { renderStageReportText } from "@/lib/stage-report/render";
import type { StageReportContent } from "@/lib/stage-report/types";

/**
 * Treść raportu ma zamkniętą strukturę 8 sekcji (docs/role/03 §3, `renderStageReportText`,
 * "sekcje i ich kolejność są zamknięte, nie zmieniać"). Zamiast budować DRUGI, niezależny
 * renderer HTML sekcja-po-sekcji (ryzyko rozjazdu z wersją tekstową — dokładnie ten sam błąd,
 * przed którym ostrzega CLAUDE.md "jedna informacja ma jedno miejsce"), owijamy identyczny
 * tekst w prosty, czytelny blok HTML (pre-wrap, ten sam trik co `entry.body` w
 * agreement-templates.ts).
 */
export function renderStageReportBlock(content: StageReportContent, coordinatorComment: string): string {
  const text = renderStageReportText(content, coordinatorComment);
  return `<div style="margin:0 0 20px;padding:20px;border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;font-family:'SFMono-Regular',Consolas,monospace;font-size:13px;line-height:1.7;color:#111827;white-space:pre-wrap;">${escapeEmailHtml(text)}</div>`;
}

export function buildStageReportDeliveryEmail(input: {
  recipientName?: string;
  projectName: string;
  stageTitle: string;
  milestoneTitle: string;
  content: StageReportContent;
  coordinatorComment: string;
  settings?: EmailSettings;
  company?: CompanyProfileDocument | null;
  /** Osobista notatka nadawcy wpisana przed wysyłką — pokazana w mailu jako wyróżniony akapit. */
  senderNote?: string | null;
}) {
  const settings = input.settings ?? defaultEmailSettings();
  const template = settings.templates.stage_report_delivery;

  const greeting = input.recipientName?.trim()
    ? `<p style="margin:0 0 12px;font-size:16px;color:#111827;">Dzień dobry ${escapeEmailHtml(input.recipientName.trim())},</p>`
    : `<p style="margin:0 0 12px;font-size:16px;color:#111827;">Dzień dobry,</p>`;

  const senderNote = input.senderNote?.trim();
  const senderNoteHtml = senderNote
    ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f8fafc;border-left:3px solid #0f172a;border-radius:6px;font-size:14px;line-height:1.6;color:#111827;white-space:pre-wrap;">${escapeEmailHtml(senderNote)}</p>`
    : "";

  const reportBlock = renderStageReportBlock(input.content, input.coordinatorComment);

  const content = renderEmailTemplateString(
    template.body,
    {
      project_name: input.projectName,
      stage_title: input.stageTitle,
      milestone_title: input.milestoneTitle,
    },
    {
      greeting,
      sender_note: senderNoteHtml,
      report_block: reportBlock,
    },
  );

  const html = buildEmailShell({
    content,
    eyebrow: template.eyebrow,
    disclaimer: template.disclaimer,
    brand: settings.brand,
    company: input.company,
  });

  const subject = renderEmailSubject(template.subject, {
    project_name: input.projectName,
    stage_title: input.stageTitle,
    milestone_title: input.milestoneTitle,
  });

  return { subject, html };
}
