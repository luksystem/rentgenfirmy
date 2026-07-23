import { isChannelEnabled, isEmailAudienceEnabled } from "@/lib/email/notification-routing";
import { isWarrantyExpiringSoon, resolveProjectWarrantyEndsAt } from "@/lib/project/warranty";
import { sendPushToUser } from "@/lib/push/send-push";
import { sendTransactionalEmail } from "@/lib/email/send";
import { renderEmailSubject, renderEmailTemplateString } from "@/lib/email/template-render";
import { buildEmailShell } from "@/lib/email/layout";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

const ACTION_ID = "warranty_expiring" as const;

type ProjectWarrantyRow = {
  id: string;
  name: string | null;
  client_id: string | null;
  warranty_ends_at: string | null;
  system_handover_at: string | null;
  warranty_duration_months: number | null;
};

/** Serwerowy odpowiednik ensureWarrantyExpiringNotifications — wywoływany przez cron, może wysyłać realny push/e-mail. */
export async function runWarrantyExpiringNotificationsServer() {
  const supabase = getSupabaseAdmin();
  const settings = await fetchEmailSettingsServer();

  const pushEnabled = isChannelEnabled(settings.routing, ACTION_ID, "push");
  const emailUserEnabled = isEmailAudienceEnabled(settings.routing, ACTION_ID, "user");
  const emailClientEnabled = isEmailAudienceEnabled(settings.routing, ACTION_ID, "client");

  if (!pushEnabled && !emailUserEnabled && !emailClientEnabled) {
    return { scanned: 0, expiring: 0, notified: 0 };
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client_id, warranty_ends_at, system_handover_at, warranty_duration_months");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ProjectWarrantyRow[];
  const expiring = rows.filter((row) =>
    isWarrantyExpiringSoon({
      warrantyEndsAt: row.warranty_ends_at ?? undefined,
      systemHandoverAt: row.system_handover_at ?? undefined,
      warrantyDurationMonths: row.warranty_duration_months ?? undefined,
    }),
  );

  if (!expiring.length) {
    return { scanned: rows.length, expiring: 0, notified: 0 };
  }

  const teamProfiles =
    pushEnabled || emailUserEnabled ? await fetchTeamProfilesServer().catch(() => []) : [];
  const company = emailUserEnabled || emailClientEnabled
    ? await resolveCompanyProfileDocumentServer().catch(() => null)
    : null;

  let notified = 0;

  for (const project of expiring) {
    const endsAt = resolveProjectWarrantyEndsAt({
      warrantyEndsAt: project.warranty_ends_at ?? undefined,
      systemHandoverAt: project.system_handover_at ?? undefined,
      warrantyDurationMonths: project.warranty_duration_months ?? undefined,
    });
    if (!endsAt) {
      continue;
    }

    const sourceId = `warranty_expiring:${project.id}:${endsAt}`;
    const linkUrl = project.client_id
      ? `/przestrzenie/klient/${project.client_id}?project=${project.id}`
      : "/projekty";
    const projectName = project.name ?? "Projekt";
    const endsAtLabel = formatDate(endsAt);

    const { data: existing } = await supabase
      .from("user_notifications")
      .select("id")
      .eq("source_id", sourceId)
      .limit(1);

    if ((existing ?? []).length > 0) {
      continue;
    }

    const template = settings.templates[ACTION_ID];
    const variables: Record<string, string> = {
      project_name: projectName,
      ends_at: endsAtLabel,
      warranty_hint: "Przygotuj przedłużenie lub przegląd systemu.",
    };

    if (teamProfiles.length) {
      const now = new Date().toISOString();
      const rowsToInsert = teamProfiles.map((profile) => ({
        id: crypto.randomUUID(),
        profile_id: profile.id,
        kind: ACTION_ID,
        title: `Gwarancja kończy się wkrótce: ${projectName}`,
        body: `Koniec gwarancji ${endsAtLabel}. Przygotuj przedłużenie lub przegląd systemu.`,
        link_url: linkUrl,
        source_id: sourceId,
        created_at: now,
      }));

      const { error: insertError } = await supabase.from("user_notifications").insert(rowsToInsert);
      if (insertError && !insertError.message.toLowerCase().includes("user_notifications_kind_check")) {
        console.warn("[warranty-expiring] user_notifications insert:", insertError.message);
      }

      if (pushEnabled) {
        const title = renderEmailSubject(template.pushTitle, variables) || template.label;
        const body = template.pushBody
          .replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "")
          .trim();
        await Promise.all(
          teamProfiles.map(async (profile) => {
            try {
              await sendPushToUser(profile.id, { title, body, url: linkUrl, tag: sourceId });
            } catch {
              // Brak VAPID / subskrypcji — pomijamy.
            }
          }),
        );
      }

      if (emailUserEnabled) {
        for (const profile of teamProfiles) {
          if (!profile.email.trim()) continue;
          try {
            await sendTransactionalEmail({
              to: profile.email.trim(),
              subject: renderEmailSubject(template.subject, variables),
              html: buildEmailShell({
                content: renderEmailTemplateString(template.body, variables),
                eyebrow: template.eyebrow,
                disclaimer: template.disclaimer,
                brand: settings.brand,
                company,
              }),
            });
          } catch (emailError) {
            console.warn("[warranty-expiring] email (user) failed:", emailError);
          }
        }
      }
    }

    if (emailClientEnabled && project.client_id) {
      const { data: clientRow } = await supabase
        .from("clients")
        .select("email")
        .eq("id", project.client_id)
        .maybeSingle();
      const clientEmail = (clientRow?.email as string | undefined)?.trim();
      if (clientEmail) {
        try {
          await sendTransactionalEmail({
            to: clientEmail,
            subject: renderEmailSubject(template.subject, variables),
            html: buildEmailShell({
              content: renderEmailTemplateString(template.body, variables),
              eyebrow: template.eyebrow,
              disclaimer: template.disclaimer,
              brand: settings.brand,
              company,
            }),
          });
        } catch (emailError) {
          console.warn("[warranty-expiring] email (client) failed:", emailError);
        }
      }
    }

    notified += 1;
  }

  return { scanned: rows.length, expiring: expiring.length, notified };
}
