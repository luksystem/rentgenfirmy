import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { hasFullAppAccess, getUserDisplayName } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildAdminSummaryMessage,
  buildClientDigestMessage,
  buildEmployeeDigestMessage,
  filterItemsInRange,
  type DistributionPlanItem,
} from "@/lib/resource-plan/distribution";
import { sendSlackDirectMessage } from "@/lib/slack/send-slack";
import { sendTransactionalEmail } from "@/lib/email/send";
import { sendSms } from "@/lib/sms/sendSms";
import { buildEmailShell, escapeEmailHtml } from "@/lib/email/layout";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { formatPartyName } from "@/lib/party/display-name";

type ClientSelection = { clientId: string; channel: "email" | "sms"; messageType: "summary" | "offer_notice" };

type DistributionResult = {
  kind: "employee" | "client" | "admin";
  recipientId: string;
  recipientName: string;
  channel: string;
  ok: boolean;
  error?: string;
};

function parseBody(body: unknown) {
  const record = (body ?? {}) as Record<string, unknown>;
  const from = typeof record.from === "string" ? record.from : null;
  const to = typeof record.to === "string" ? record.to : null;
  if (!from || !to) {
    throw new HttpError(400, "Wymagany zakres dat (from, to).");
  }
  const employeeIds = Array.isArray(record.employeeIds)
    ? record.employeeIds.filter((id): id is string => typeof id === "string")
    : [];
  const clientSelections: ClientSelection[] = Array.isArray(record.clientSelections)
    ? record.clientSelections
        .filter(
          (entry): entry is ClientSelection =>
            Boolean(entry) &&
            typeof (entry as ClientSelection).clientId === "string" &&
            ((entry as ClientSelection).channel === "email" || (entry as ClientSelection).channel === "sms"),
        )
        .map((entry) => ({
          ...entry,
          messageType: entry.messageType === "offer_notice" ? "offer_notice" : "summary",
        }))
    : [];
  const notifyAdmins = record.notifyAdmins === true;
  return { from, to, employeeIds, clientSelections, notifyAdmins };
}

async function sendPlainEmail(input: {
  to: string;
  subject: string;
  text: string;
  brand: Awaited<ReturnType<typeof fetchEmailSettingsServer>>["brand"];
  company: Awaited<ReturnType<typeof resolveCompanyProfileDocumentServer>> | null;
}) {
  const html = buildEmailShell({
    content: `<p style="white-space:pre-line;">${escapeEmailHtml(input.text)}</p>`,
    brand: input.brand,
    company: input.company,
  });
  await sendTransactionalEmail({ to: input.to, subject: input.subject, html });
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!hasFullAppAccess(profile.role)) {
      throw new HttpError(403, "Tylko administrator lub manager może rozsyłać plany.");
    }

    const body = await request.json().catch(() => ({}));
    const { from, to, employeeIds, clientSelections, notifyAdmins } = parseBody(body);

    const admin = getSupabaseAdmin();
    const results: DistributionResult[] = [];

    const { data: itemRows, error: itemsError } = await admin
      .from("resource_plan_items")
      .select("id, title, start_at, end_at, planned_hours, assignee_id, client_id, completion_feedback")
      .lte("start_at", `${to}T23:59:59`)
      .gte("end_at", `${from}T00:00:00`);
    if (itemsError) {
      throw new Error(itemsError.message);
    }

    const items: DistributionPlanItem[] = filterItemsInRange(
      (itemRows ?? []).map((row) => ({
        id: row.id as string,
        title: row.title as string,
        startAt: row.start_at as string,
        endAt: row.end_at as string,
        plannedHours: row.planned_hours as number | null,
        assigneeId: row.assignee_id as string | null,
        clientId: row.client_id as string | null,
        completionFeedback: (row.completion_feedback as string | null) ?? "",
      })),
      `${from}T00:00:00`,
      `${to}T23:59:59`,
    );

    const settings = await fetchEmailSettingsServer();
    const company = await resolveCompanyProfileDocumentServer().catch(() => null);

    if (employeeIds.length > 0) {
      const { data: employeeRows, error: employeesError } = await admin
        .from("profiles")
        .select("id, first_name, last_name, email, slack_user_id")
        .in("id", employeeIds);
      if (employeesError) {
        throw new Error(employeesError.message);
      }

      for (const employee of employeeRows ?? []) {
        const name = getUserDisplayName({ firstName: employee.first_name, lastName: employee.last_name, email: employee.email });
        const employeeItems = items.filter((item) => item.assigneeId === employee.id);
        const message = buildEmployeeDigestMessage({ employeeName: name, from, to, items: employeeItems });
        const slackUserId = (employee as { slack_user_id: string | null }).slack_user_id;

        if (slackUserId) {
          const sent = await sendSlackDirectMessage({ slackUserId, text: message });
          results.push({
            kind: "employee",
            recipientId: employee.id,
            recipientName: name,
            channel: "slack",
            ok: sent.ok,
            error: sent.ok ? undefined : "error" in sent ? sent.error : "Slack nie skonfigurowany (SLACK_BOT_TOKEN).",
          });
        } else if (employee.email) {
          try {
            await sendPlainEmail({
              to: employee.email,
              subject: `Twój plan pracy (${from} – ${to})`,
              text: message,
              brand: settings.brand,
              company,
            });
            results.push({ kind: "employee", recipientId: employee.id, recipientName: name, channel: "email", ok: true });
          } catch (error) {
            results.push({
              kind: "employee",
              recipientId: employee.id,
              recipientName: name,
              channel: "email",
              ok: false,
              error: error instanceof Error ? error.message : "Błąd wysyłki e-mail.",
            });
          }
        } else {
          results.push({
            kind: "employee",
            recipientId: employee.id,
            recipientName: name,
            channel: "none",
            ok: false,
            error: "Brak Slack ID i adresu e-mail.",
          });
        }
      }
    }

    if (clientSelections.length > 0) {
      const clientIds = clientSelections.map((selection) => selection.clientId);
      const { data: clientRows, error: clientsError } = await admin
        .from("clients")
        .select("id, first_name, last_name, email, phone")
        .in("id", clientIds);
      if (clientsError) {
        throw new Error(clientsError.message);
      }

      for (const selection of clientSelections) {
        const client = (clientRows ?? []).find((row) => row.id === selection.clientId);
        if (!client) continue;
        const name = formatPartyName({ firstName: client.first_name, lastName: client.last_name });
        const clientItems = items.filter((item) => item.clientId === client.id);
        const message = buildClientDigestMessage({
          clientName: name,
          from,
          to,
          items: clientItems,
          messageType: selection.messageType,
        });

        if (selection.channel === "email") {
          if (!client.email) {
            results.push({ kind: "client", recipientId: client.id, recipientName: name, channel: "email", ok: false, error: "Brak adresu e-mail." });
            continue;
          }
          try {
            await sendPlainEmail({
              to: client.email,
              subject: "Planowane prace u Państwa",
              text: message,
              brand: settings.brand,
              company,
            });
            results.push({ kind: "client", recipientId: client.id, recipientName: name, channel: "email", ok: true });
          } catch (error) {
            results.push({
              kind: "client",
              recipientId: client.id,
              recipientName: name,
              channel: "email",
              ok: false,
              error: error instanceof Error ? error.message : "Błąd wysyłki e-mail.",
            });
          }
        } else {
          if (!client.phone) {
            results.push({ kind: "client", recipientId: client.id, recipientName: name, channel: "sms", ok: false, error: "Brak numeru telefonu." });
            continue;
          }
          try {
            await sendSms({ phone: client.phone, message, metadata: { type: "resource_plan_distribution" } });
            results.push({ kind: "client", recipientId: client.id, recipientName: name, channel: "sms", ok: true });
          } catch (error) {
            results.push({
              kind: "client",
              recipientId: client.id,
              recipientName: name,
              channel: "sms",
              ok: false,
              error: error instanceof Error ? error.message : "Błąd wysyłki SMS.",
            });
          }
        }
      }
    }

    if (notifyAdmins) {
      const { data: adminRows, error: adminError } = await admin
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("role", "administrator")
        .eq("is_active", true);
      if (adminError) {
        throw new Error(adminError.message);
      }
      const message = buildAdminSummaryMessage({ from, to, items });
      for (const adminProfile of adminRows ?? []) {
        const name = getUserDisplayName({
          firstName: adminProfile.first_name,
          lastName: adminProfile.last_name,
          email: adminProfile.email,
        });
        if (!adminProfile.email) {
          results.push({ kind: "admin", recipientId: adminProfile.id, recipientName: name, channel: "email", ok: false, error: "Brak adresu e-mail." });
          continue;
        }
        try {
          await sendPlainEmail({
            to: adminProfile.email,
            subject: `Podsumowanie planu (${from} – ${to})`,
            text: message,
            brand: settings.brand,
            company,
          });
          results.push({ kind: "admin", recipientId: adminProfile.id, recipientName: name, channel: "email", ok: true });
        } catch (error) {
          results.push({
            kind: "admin",
            recipientId: adminProfile.id,
            recipientName: name,
            channel: "email",
            ok: false,
            error: error instanceof Error ? error.message : "Błąd wysyłki e-mail.",
          });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return jsonError(error);
  }
}
