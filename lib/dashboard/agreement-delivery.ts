import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import {
  PROJECT_AGREEMENT_CATEGORY_LABELS,
  formatAgreementCost,
} from "@/lib/dashboard/agreement-types";
import { getAgreementPublicUrl } from "@/lib/dashboard/agreement-collaboration-types";
import type { AgreementApproverRole } from "@/lib/dashboard/agreement-collaboration-types";
import { AGREEMENT_BINDING_DISCLAIMER } from "@/lib/email/agreement-templates";
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

function publicActionUrls(publicUrl: string | null) {
  if (!publicUrl) {
    return { accept: null, discuss: null };
  }
  return {
    accept: `${publicUrl}?focus=accept`,
    discuss: `${publicUrl}?focus=discussion`,
  };
}

function agreementPlainTextDetails(agreement: ProjectClientAgreement, publicUrl: string | null): string[] {
  const costLabel = formatAgreementCost(agreement);
  const { accept, discuss } = publicActionUrls(publicUrl);

  return [
    `Tytuł: ${agreement.title}`,
    `Kategoria: ${PROJECT_AGREEMENT_CATEGORY_LABELS[agreement.category]}`,
    agreement.body ? `Opis: ${agreement.body}` : null,
    costLabel ? `Koszt: ${costLabel}` : null,
    agreement.costNote?.trim() &&
    agreement.costNote.trim() !== costLabel?.trim()
      ? `Notatka do kosztów: ${agreement.costNote.trim()}`
      : agreement.costNote?.trim()
        ? `Notatka do kosztów: ${agreement.costNote.trim()}`
        : null,
    agreement.communicationProtocols?.length
      ? `Protokoły: ${agreement.communicationProtocols.join(", ")}`
      : null,
    accept ? "" : null,
    accept ? "Akceptacja — otwórz link:" : null,
    accept,
    discuss ? "" : null,
    discuss ? "Dyskusja / zmiany w ustaleniu — jeśli chcesz przekazać więcej informacji lub coś zmienić, kliknij:" : null,
    discuss,
    "",
    AGREEMENT_BINDING_DISCLAIMER,
  ].filter((line): line is string => line !== null);
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
    ...agreementPlainTextDetails(input.agreement, publicUrl),
    "",
    "Pozdrawiamy,",
    "Zespół projektowy",
  ].join("\n");

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
    ...agreementPlainTextDetails(input.agreement, publicUrl),
    "",
    "Pozdrawiamy,",
    "Zespół projektowy",
  ].join("\n");

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildAgreementClientBatchMailtoUrl(input: {
  agreements: ProjectClientAgreement[];
  clientEmail: string;
  clientName?: string;
  projectName?: string;
}) {
  const email = input.clientEmail.trim();
  if (!email || !input.agreements.length) {
    return null;
  }

  const subject =
    input.agreements.length === 1
      ? `Ustalenie do akceptacji: ${input.agreements[0].title}`
      : `${input.agreements.length} ustaleń do akceptacji${input.projectName ? ` — ${input.projectName}` : ""}`;

  const greeting = input.clientName?.trim() ? `Dzień dobry ${input.clientName.trim()},` : "Dzień dobry,";

  const blocks = input.agreements.flatMap((agreement, index) => {
    const publicUrl = buildAgreementPublicUrl(agreement);
    return [
      input.agreements.length > 1 ? `--- Ustalenie ${index + 1} ---` : null,
      ...agreementPlainTextDetails(agreement, publicUrl),
      "",
    ].filter((line): line is string => line !== null);
  });

  const body = [
    greeting,
    "",
    `Przesyłamy ${input.agreements.length} ${
      input.agreements.length === 1 ? "ustalenie" : input.agreements.length < 5 ? "ustalenia" : "ustaleń"
    } projektowych do Państwa akceptacji.`,
    input.projectName ? `Projekt: ${input.projectName}` : null,
    "",
    ...blocks,
    "Pozdrawiamy,",
    "Zespół projektowy",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildTradeBatchMailtoUrl(input: {
  agreements: ProjectClientAgreement[];
  trade: ProjectTrade;
  projectName?: string;
}) {
  const email = input.trade.email.trim();
  if (!email || !input.agreements.length) {
    return null;
  }

  const roleLabel = formatProjectTradeRoleLabel(input.trade);
  const subject = `${input.agreements.length} ${
    input.agreements.length === 1 ? "ustalenie" : "ustaleń"
  } do akceptacji (${roleLabel})${input.projectName ? ` — ${input.projectName}` : ""}`;

  const blocks = input.agreements.flatMap((agreement, index) => {
    const publicUrl = buildAgreementPublicUrl(agreement);
    return [
      `--- Ustalenie ${index + 1} ---`,
      ...agreementPlainTextDetails(agreement, publicUrl),
      "",
    ];
  });

  const body = [
    `Dzień dobry${input.trade.contactName.trim() ? ` ${input.trade.contactName.trim()}` : ""},`,
    "",
    `Prosimy o zapoznanie się z ${input.agreements.length} ${
      input.agreements.length === 1 ? "ustaleniem" : "ustaleniami"
    } projektowymi w ramach Państwa branży (${roleLabel}).`,
    input.projectName ? `Projekt: ${input.projectName}` : null,
    "",
    ...blocks,
    "Pozdrawiamy,",
    "Zespół projektowy",
  ].join("\n");

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
