import { isChannelEnabled, isEmailAudienceEnabled } from "@/lib/email/notification-routing";
import { buildOfferApprovalRequestedEmail } from "@/lib/email/offer-approval-templates";
import { sendTransactionalEmail } from "@/lib/email/send";
import { absoluteAppUrl } from "@/lib/messages/app-url";
import { sendPushToUser } from "@/lib/push/send-push";
import type { OfferKind } from "@/lib/service/offer-approval";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";

const ACTION_ID = "offer_approval_requested";
const KIND_LABEL: Record<OfferKind, string> = { estimate: "Wycena", settlement: "Rozliczenie" };

/** Wysyła e-mail i/lub push do wskazanego administratora, zgodnie z ustawieniami powiadomień. */
export async function notifyOfferApprovalRequestedChannels(input: {
  serviceId: string;
  kind: OfferKind;
  requestedByName: string;
  serviceTitle: string;
  assignedAdminId: string;
  assignedAdminEmail: string;
}) {
  const settings = await fetchEmailSettingsServer();
  const emailEnabled = isEmailAudienceEnabled(settings.routing, ACTION_ID, "user");
  const pushEnabled = isChannelEnabled(settings.routing, ACTION_ID, "push");

  if (!emailEnabled && !pushEnabled) {
    return;
  }

  const link = absoluteAppUrl(`/oferty/${input.serviceId}`);

  if (emailEnabled && input.assignedAdminEmail.trim()) {
    try {
      const company = await resolveCompanyProfileDocumentServer().catch(() => null);
      const email = buildOfferApprovalRequestedEmail({
        requestedByName: input.requestedByName,
        serviceTitle: input.serviceTitle,
        kind: input.kind,
        link,
        brand: settings.brand,
        company,
      });
      await sendTransactionalEmail({ to: input.assignedAdminEmail.trim(), subject: email.subject, html: email.html });
    } catch (error) {
      console.warn("[offer-approval-requested] email failed:", error);
    }
  }

  if (pushEnabled) {
    try {
      await sendPushToUser(input.assignedAdminId, {
        title: `${input.requestedByName} prosi o akceptację`,
        body: `${KIND_LABEL[input.kind]}: ${input.serviceTitle}`,
        url: `/oferty/${input.serviceId}`,
        tag: `offer_approval_requested:${input.serviceId}:${input.kind}`,
      });
    } catch (error) {
      console.warn("[offer-approval-requested] push failed:", error);
    }
  }
}
