import {
  getNotificationActionDefinition,
  getRoutingRule,
  getRuleSchedule,
  isChannelEnabled,
  isEmailAudienceEnabled,
} from "@/lib/email/notification-routing";
import {
  buildOfferExpiryReminderEmail,
  buildOfferExpiryReminderPush,
  buildOfferExpiryReminderSms,
} from "@/lib/email/offer-expiry-templates";
import { sendTransactionalEmail } from "@/lib/email/send";
import { absoluteAppUrl } from "@/lib/messages/app-url";
import { sendPushToUser } from "@/lib/push/send-push";
import { sendSms } from "@/lib/sms/sendSms";
import { isOfferExpired } from "@/lib/service/offer-validity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";

const ACTION_ID = "client_offer_expiring";
const WARSAW_TZ = "Europe/Warsaw";

type OfferKind = "estimate" | "settlement";

type PendingOfferRow = {
  serviceId: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  token: string;
  expiresAt: string;
  kind: OfferKind;
};

function warsawYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WARSAW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function warsawHour(date: Date) {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    timeZone: WARSAW_TZ,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).find((part) => part.type === "hour")?.value;
  return Number(hourPart ?? "0");
}

function addCalendarDays(ymd: string, deltaDays: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + deltaDays);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isDueForReminder(expiresAt: string, daysBefore: number, notifyAtHour: number, now = new Date()) {
  if (isOfferExpired(expiresAt)) {
    return false;
  }
  if (warsawHour(now) !== notifyAtHour) {
    return false;
  }
  const targetDay = addCalendarDays(warsawYmd(new Date(expiresAt)), -daysBefore);
  return warsawYmd(now) === targetDay;
}

async function fetchPendingOffers(): Promise<PendingOfferRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, status, title, client_full_name, client_email, client_phone, client_offer_token, client_offer_expires_at, client_offer_status, settlement_offer_token, settlement_offer_expires_at, settlement_offer_status",
    )
    .or("client_offer_status.eq.pending,settlement_offer_status.eq.pending");

  if (error) {
    throw new Error(error.message);
  }

  const rows: PendingOfferRow[] = [];
  for (const record of data ?? []) {
    const workflowStatus = String(record.status ?? "");

    // Przypomnienie o ofercie tylko gdy status workflow = Oczekuje na klienta.
    if (
      workflowStatus === "Oczekuje na klienta" &&
      record.client_offer_status === "pending" &&
      record.client_offer_token &&
      record.client_offer_expires_at
    ) {
      rows.push({
        serviceId: record.id,
        title: record.title ?? "",
        clientName: record.client_full_name ?? "",
        clientEmail: record.client_email ?? "",
        clientPhone: record.client_phone ?? "",
        token: record.client_offer_token,
        expiresAt: record.client_offer_expires_at,
        kind: "estimate",
      });
    }

    // Rozliczenie: nie wysyłaj przy Wycena / Anulowany.
    if (
      workflowStatus !== "Wycena" &&
      workflowStatus !== "Anulowany" &&
      record.settlement_offer_status === "pending" &&
      record.settlement_offer_token &&
      record.settlement_offer_expires_at
    ) {
      rows.push({
        serviceId: record.id,
        title: record.title ?? "",
        clientName: record.client_full_name ?? "",
        clientEmail: record.client_email ?? "",
        clientPhone: record.client_phone ?? "",
        token: record.settlement_offer_token,
        expiresAt: record.settlement_offer_expires_at,
        kind: "settlement",
      });
    }
  }

  return rows;
}

async function wasReminderSent(input: {
  serviceId: string;
  kind: OfferKind;
  expiresAt: string;
  daysBefore: number;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("offer_expiry_reminder_log")
    .select("id")
    .eq("service_id", input.serviceId)
    .eq("offer_kind", input.kind)
    .eq("expires_at", input.expiresAt)
    .eq("days_before", input.daysBefore)
    .limit(1);

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return false;
    }
    throw new Error(error.message);
  }

  return (data ?? []).length > 0;
}

async function markReminderSent(input: {
  serviceId: string;
  kind: OfferKind;
  expiresAt: string;
  daysBefore: number;
  channels: string[];
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("offer_expiry_reminder_log").insert({
    id: crypto.randomUUID(),
    service_id: input.serviceId,
    offer_kind: input.kind,
    expires_at: input.expiresAt,
    days_before: input.daysBefore,
    channels: input.channels,
    sent_at: new Date().toISOString(),
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return;
    }
    throw new Error(error.message);
  }
}

async function notifyTeamPush(input: {
  serviceId: string;
  token: string;
  offerTitle: string;
  expiresAt: string;
  kind: OfferKind;
}) {
  const profiles = await fetchTeamProfilesServer().catch(() => []);
  if (!profiles.length) {
    return;
  }

  const pushCopy = buildOfferExpiryReminderPush(input);
  const offerPath = `/oferta/${input.token}`;
  const sourceId = `client_offer_expiring:${input.kind}:${input.serviceId}:${input.expiresAt}`;
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("user_notifications")
    .select("id")
    .eq("source_id", sourceId)
    .limit(1);

  if (!(existing ?? []).length) {
    const rows = profiles.map((profile) => ({
      id: crypto.randomUUID(),
      profile_id: profile.id,
      kind: "client_offer_expiring",
      title: pushCopy.title,
      body: pushCopy.body,
      link_url: offerPath,
      source_id: sourceId,
      created_at: now,
    }));

    const { error } = await supabase.from("user_notifications").insert(rows);
    if (error && !error.message.toLowerCase().includes("user_notifications_kind_check")) {
      console.warn("[offer-expiry] user_notifications insert:", error.message);
    }
  }

  await Promise.all(
    profiles.map(async (profile) => {
      try {
        await sendPushToUser(profile.id, {
          title: pushCopy.title,
          body: pushCopy.body,
          url: offerPath,
          tag: sourceId,
        });
      } catch {
        // Brak VAPID / subskrypcji — pomijamy.
      }
    }),
  );
}

export async function runOfferExpiryReminders(now = new Date()) {
  const settings = await fetchEmailSettingsServer();
  const rule = getRoutingRule(settings.routing, ACTION_ID);
  const definition = getNotificationActionDefinition(ACTION_ID);
  const schedule = getRuleSchedule(rule, definition);

  const emailEnabled = isEmailAudienceEnabled(settings.routing, ACTION_ID, "client");
  const smsEnabled = isChannelEnabled(settings.routing, ACTION_ID, "sms");
  const pushEnabled = isChannelEnabled(settings.routing, ACTION_ID, "push");

  if (!emailEnabled && !smsEnabled && !pushEnabled) {
    return { scanned: 0, due: 0, sent: 0, skipped: 0 };
  }

  const offers = await fetchPendingOffers();
  let due = 0;
  let sent = 0;
  let skipped = 0;

  const company = emailEnabled
    ? await resolveCompanyProfileDocumentServer().catch(() => null)
    : null;

  for (const offer of offers) {
    if (!isDueForReminder(offer.expiresAt, schedule.daysBefore, schedule.notifyAtHour, now)) {
      continue;
    }
    due += 1;

    if (
      await wasReminderSent({
        serviceId: offer.serviceId,
        kind: offer.kind,
        expiresAt: offer.expiresAt,
        daysBefore: schedule.daysBefore,
      })
    ) {
      skipped += 1;
      continue;
    }

    const publicUrl = absoluteAppUrl(`/oferta/${offer.token}`);
    const channels: string[] = [];

    if (emailEnabled && offer.clientEmail.trim()) {
      const email = buildOfferExpiryReminderEmail({
        clientName: offer.clientName,
        offerTitle: offer.title,
        expiresAt: offer.expiresAt,
        offerUrl: publicUrl,
        kind: offer.kind,
        brand: settings.brand,
        company,
      });
      try {
        await sendTransactionalEmail({
          to: offer.clientEmail.trim(),
          subject: email.subject,
          html: email.html,
        });
        channels.push("email");
      } catch (error) {
        console.warn("[offer-expiry] email failed:", error);
      }
    }

    if (smsEnabled && offer.clientPhone.trim()) {
      try {
        await sendSms({
          phone: offer.clientPhone.trim(),
          message: buildOfferExpiryReminderSms({
            offerTitle: offer.title,
            expiresAt: offer.expiresAt,
            offerUrl: publicUrl,
            kind: offer.kind,
          }),
          metadata: {
            type: ACTION_ID,
            serviceId: offer.serviceId,
            offerKind: offer.kind,
          },
        });
        channels.push("sms");
      } catch (error) {
        console.warn("[offer-expiry] sms failed:", error);
      }
    }

    if (pushEnabled) {
      try {
        await notifyTeamPush({
          serviceId: offer.serviceId,
          token: offer.token,
          offerTitle: offer.title,
          expiresAt: offer.expiresAt,
          kind: offer.kind,
        });
        channels.push("push");
      } catch (error) {
        console.warn("[offer-expiry] push failed:", error);
      }
    }

    if (!channels.length) {
      skipped += 1;
      continue;
    }

    await markReminderSent({
      serviceId: offer.serviceId,
      kind: offer.kind,
      expiresAt: offer.expiresAt,
      daysBefore: schedule.daysBefore,
      channels,
    });
    sent += 1;
  }

  return { scanned: offers.length, due, sent, skipped };
}
