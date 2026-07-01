import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import { getAgreementPublicUrl } from "@/lib/dashboard/agreement-collaboration-types";
import type { AgreementApproverRole } from "@/lib/dashboard/agreement-collaboration-types";
import {
  findProjectTradeByRoleLabel,
  formatProjectTradeRoleLabel,
  type ProjectTrade,
} from "@/lib/dashboard/trade-types";

export function buildAgreementPublicUrl(agreement: Pick<ProjectClientAgreement, "publicToken" | "publicEnabled">) {
  if (!agreement.publicEnabled || !agreement.publicToken) {
    return null;
  }
  return getAgreementPublicUrl(agreement.publicToken);
}

export function buildAgreementTradeMailtoUrl(input: {
  agreement: ProjectClientAgreement;
  trade: ProjectTrade;
  publicUrl?: string | null;
}) {
  const email = input.trade.email.trim();
  if (!email) {
    return null;
  }

  const publicUrl = input.publicUrl ?? buildAgreementPublicUrl(input.agreement);
  const roleLabel = formatProjectTradeRoleLabel(input.trade);
  const subject = `Ustalenie do akceptacji (${roleLabel}): ${input.agreement.title}`;

  const body = [
    `Dzień dobry${input.trade.contactName.trim() ? ` ${input.trade.contactName.trim()}` : ""},`,
    "",
    "Prosimy o zapoznanie się z ustaleniem projektowym i akceptację w ramach Państwa branży.",
    "",
    `Tytuł: ${input.agreement.title}`,
    input.agreement.body ? `Opis: ${input.agreement.body}` : null,
    input.agreement.communicationProtocols?.length
      ? `Protokoły: ${input.agreement.communicationProtocols.join(", ")}`
      : null,
    publicUrl ? "" : null,
    publicUrl ? "Link do ustaleń (publiczny):" : null,
    publicUrl ?? null,
    "",
    "Pozdrawiamy,",
    "Rentgen firmy",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildAgreementClientMailtoUrl(input: {
  agreement: ProjectClientAgreement;
  clientEmail: string;
  clientName?: string;
  publicUrl?: string | null;
}) {
  const email = input.clientEmail.trim();
  if (!email) {
    return null;
  }

  const publicUrl = input.publicUrl ?? buildAgreementPublicUrl(input.agreement);
  const subject = `Ustalenie do akceptacji: ${input.agreement.title}`;
  const greeting = input.clientName?.trim() ? `Dzień dobry ${input.clientName.trim()},` : "Dzień dobry,";

  const body = [
    greeting,
    "",
    "Przesyłamy ustalenie projektowe do Państwa akceptacji.",
    "",
    `Tytuł: ${input.agreement.title}`,
    input.agreement.body ? `Opis: ${input.agreement.body}` : null,
    publicUrl ? "" : null,
    publicUrl ? "Link do ustaleń:" : null,
    publicUrl ?? null,
    "",
    "Pozdrawiamy,",
    "Rentgen firmy",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildTradeDeliveryLinks(
  agreement: ProjectClientAgreement,
  roles: AgreementApproverRole[],
  trades: ProjectTrade[],
) {
  return roles
    .filter((role) => !role.isClientRole && !role.isTeamRole)
    .map((role) => {
      const trade = findProjectTradeByRoleLabel(trades, role.label);
      if (!trade) {
        return null;
      }
      return {
        roleLabel: role.label,
        trade,
        mailtoUrl: buildAgreementTradeMailtoUrl({ agreement, trade }),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}
