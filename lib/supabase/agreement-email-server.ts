import { formatPartyName } from "@/lib/party/display-name";
import {
  agreementToEmailEntry,
  buildAgreementDeliveryEmail,
} from "@/lib/email/agreement-templates";
import { isChannelEnabled, isEmailAudienceEnabled } from "@/lib/email/notification-routing";
import { sendTransactionalEmail } from "@/lib/email/send";
import { renderPlainTemplateString } from "@/lib/notifications/dispatch";
import { sendSms } from "@/lib/sms/sendSms";
import { absoluteAppUrl } from "@/lib/messages/app-url";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import type { AgreementApproverRole } from "@/lib/dashboard/agreement-collaboration-types";
import { isTeamApproverRole } from "@/lib/dashboard/agreement-collaboration-types";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import {
  formatProjectTradeRoleLabel,
  type ProjectTrade,
} from "@/lib/dashboard/trade-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  rowToAgreement,
} from "@/lib/supabase/project-agreement-collaboration-repository";
import { AGREEMENT_ATTACHMENTS_BUCKET } from "@/lib/supabase/project-agreement-attachments-repository";

/** Dłuższe okno niż standardowe (1h) — link ląduje w treści maila, więc musi przeżyć do momentu,
 *  gdy klient go faktycznie otworzy, nie tylko do momentu wysyłki. */
const EMAIL_PHOTO_SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

/** Zdjęcie robocze z budowy trafia do maila tylko z PIERWSZEJ pozycji, tylko gdy nadawca tego nie
 *  odznaczy (checkbox w podglądzie) — a nawet wtedy dopiero po sprawdzeniu, że w ogóle jest zdjęcie. */
async function fetchFirstAgreementPhotoUrl(agreementId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("project_agreement_attachments")
    .select("storage_path")
    .eq("agreement_id", agreementId)
    .eq("media_kind", "image")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  const storagePath = (data as { storage_path?: string } | null)?.storage_path;
  if (!storagePath) {
    return null;
  }

  const { data: signed } = await supabase.storage
    .from(AGREEMENT_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, EMAIL_PHOTO_SIGNED_URL_TTL_SEC);

  return signed?.signedUrl ?? null;
}

async function buildAgreementEmailEntries(
  agreements: ProjectClientAgreement[],
  includePhoto: boolean,
) {
  const entries = agreements.map(agreementToEmailEntry);
  const photoUrl = entries.length ? await fetchFirstAgreementPhotoUrl(agreements[0].id) : null;
  if (includePhoto && photoUrl) {
    entries[0] = { ...entries[0], photoUrl };
  }
  return { entries, hasPhoto: Boolean(photoUrl) };
}

/**
 * "reminder" — przypomnienie o ustaleniach już kiedyś ujętych w paczce/przypomnieniu
 * (sent_at ustawiony), wciąż oczekujących na klienta. "new_batch" — pierwsza wysyłka wybranych
 * (checkboxy) ustaleń, które jeszcze nigdy nie były w takiej paczce (sent_at puste) — po wysyłce
 * ustawia sent_at.
 */
export type AgreementEmailScope =
  | "single"
  | "single_trade"
  | "reminder"
  | "new_batch"
  | "trade_pending";

type AgreementRow = Parameters<typeof rowToAgreement>[0];

type RoleRow = {
  id: string;
  agreement_id: string;
  label: string;
  position: number;
  is_required: boolean;
  is_client_role: boolean;
  is_team_role?: boolean;
  created_at: string;
};

function rowToRole(row: RoleRow): AgreementApproverRole {
  return {
    id: row.id,
    agreementId: row.agreement_id,
    label: row.label,
    position: row.position,
    isRequired: row.is_required,
    isClientRole: row.is_client_role,
    isTeamRole: row.is_team_role ?? isTeamApproverRole({
      label: row.label,
      isClientRole: row.is_client_role,
      isTeamRole: row.is_team_role ?? false,
    }),
    createdAt: row.created_at,
  };
}

async function fetchPendingAgreements(
  projectId: string,
  filter?: { sentAt: "set" | "unset" } | { ids: string[] },
): Promise<ProjectClientAgreement[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("project_client_agreements")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "pending_client");

  if (filter && "ids" in filter) {
    query = query.in("id", filter.ids);
  } else if (filter && filter.sentAt === "set") {
    query = query.not("sent_at", "is", null);
  } else if (filter && filter.sentAt === "unset") {
    query = query.is("sent_at", null);
  }

  const { data, error } = await query
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToAgreement(row as AgreementRow));
}

async function fetchAgreementRoles(agreementIds: string[]): Promise<Map<string, AgreementApproverRole[]>> {
  const map = new Map<string, AgreementApproverRole[]>();
  if (!agreementIds.length) {
    return map;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_agreement_approver_roles")
    .select("*")
    .in("agreement_id", agreementIds)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as RoleRow[]) {
    const list = map.get(row.agreement_id) ?? [];
    list.push(rowToRole(row));
    map.set(row.agreement_id, list);
  }

  return map;
}

async function ensurePublicLinks(agreements: ProjectClientAgreement[]): Promise<ProjectClientAgreement[]> {
  const supabase = getSupabaseAdmin();
  const refreshed: ProjectClientAgreement[] = [];

  for (const agreement of agreements) {
    if (agreement.publicEnabled && agreement.publicToken) {
      refreshed.push(agreement);
      continue;
    }

    const { data, error } = await supabase
      .from("project_client_agreements")
      .update({ public_enabled: true, updated_at: new Date().toISOString() })
      .eq("id", agreement.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    refreshed.push(rowToAgreement(data as AgreementRow));
  }

  return refreshed;
}

async function fetchProjectContext(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }
  if (!project) {
    throw new Error("Nie znaleziono projektu.");
  }

  let clientEmail = "";
  let clientPhone = "";
  let clientName = "Klient";

  if (project.client_id) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("first_name, last_name, email, phone")
      .eq("id", project.client_id)
      .maybeSingle();

    if (clientError) {
      throw new Error(clientError.message);
    }

    clientEmail = String(client?.email ?? "").trim();
    clientPhone = String(client?.phone ?? "").trim();
    clientName =
      formatPartyName({
        firstName: String(client?.first_name ?? "").trim(),
        lastName: String(client?.last_name ?? "").trim(),
      }) || clientName;
  }

  const { data: trades, error: tradesError } = await supabase
    .from("project_trades")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (tradesError) {
    throw new Error(tradesError.message);
  }

  const tradeRows = (trades ?? []) as Array<{
    id: string;
    project_id: string;
    name: string;
    company: string;
    contact_name: string;
    email: string;
    phone: string;
    description: string;
    hired_by: string;
    position: number;
    created_at: string;
    updated_at: string;
  }>;

  const projectTrades: ProjectTrade[] = tradeRows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    company: row.company,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    description: row.description,
    hiredBy: row.hired_by,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    projectName: String(project.name ?? "Projekt"),
    clientEmail,
    clientPhone,
    clientName,
    projectTrades,
  };
}

function agreementsForTrade(
  agreements: ProjectClientAgreement[],
  rolesByAgreement: Map<string, AgreementApproverRole[]>,
  trade: ProjectTrade,
): ProjectClientAgreement[] {
  const tradeLabel = formatProjectTradeRoleLabel(trade);

  return agreements.filter((agreement) => {
    const roles = rolesByAgreement.get(agreement.id) ?? [];
    return roles.some(
      (role) => !role.isClientRole && !role.isTeamRole && role.label.trim() === tradeLabel,
    );
  });
}

type AgreementEmailTarget = {
  agreements: ProjectClientAgreement[];
  recipientEmail: string;
  recipientName: string;
  intro: string;
  subjectPrefix?: string;
  audience: "client" | "trade";
  projectName: string;
  clientPhone: string;
};

async function resolveAgreementEmailTarget(input: {
  projectId: string;
  scope: AgreementEmailScope;
  agreementId?: string;
  agreementIds?: string[];
  tradeId?: string;
}): Promise<AgreementEmailTarget> {
  const context = await fetchProjectContext(input.projectId);

  let agreements: ProjectClientAgreement[] = [];
  let recipientEmail = "";
  let recipientName = "";
  let intro = "";

  if (input.scope === "single") {
    if (!input.agreementId) {
      throw new Error("Brak identyfikatora ustalenia.");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("project_client_agreements")
      .select("*")
      .eq("id", input.agreementId)
      .eq("project_id", input.projectId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      throw new Error("Nie znaleziono ustalenia.");
    }

    const agreement = rowToAgreement(data as AgreementRow);
    if (agreement.status !== "pending_client") {
      throw new Error("To ustalenie nie oczekuje na akceptację.");
    }

    agreements = [agreement];
    recipientEmail = context.clientEmail;
    recipientName = context.clientName;
    intro =
      "Przesyłamy ustalenie projektowe do Państwa akceptacji. Poniżej znajdują się szczegóły, koszty oraz przyciski do akceptacji i dyskusji.";
  } else if (input.scope === "single_trade") {
    if (!input.agreementId || !input.tradeId) {
      throw new Error("Brak identyfikatora ustalenia lub branży.");
    }

    const trade = context.projectTrades.find((entry) => entry.id === input.tradeId);
    if (!trade) {
      throw new Error("Nie znaleziono branży w projekcie.");
    }
    if (!trade.email.trim()) {
      throw new Error(`Brak adresu e-mail dla branży ${trade.name}.`);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("project_client_agreements")
      .select("*")
      .eq("id", input.agreementId)
      .eq("project_id", input.projectId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      throw new Error("Nie znaleziono ustalenia.");
    }

    const agreement = rowToAgreement(data as AgreementRow);
    if (agreement.status !== "pending_client") {
      throw new Error("To ustalenie nie oczekuje na akceptację.");
    }

    const rolesByAgreement = await fetchAgreementRoles([agreement.id]);
    const matched = agreementsForTrade([agreement], rolesByAgreement, trade);
    if (!matched.length) {
      throw new Error("To ustalenie nie jest przypisane do wybranej branży.");
    }

    agreements = matched;
    recipientEmail = trade.email.trim();
    recipientName = trade.contactName.trim() || trade.company.trim() || trade.name;
    intro =
      "Prosimy o zapoznanie się z ustaleniem projektowym w ramach Państwa branży i wymaganą akceptację.";
  } else if (input.scope === "new_batch") {
    const ids = input.agreementIds ?? [];
    if (!ids.length) {
      throw new Error("Wybierz co najmniej jedno ustalenie do wysłania.");
    }
    if (!context.clientEmail) {
      throw new Error("Klient nie ma adresu e-mail w systemie.");
    }

    agreements = await fetchPendingAgreements(input.projectId, { ids });
    if (!agreements.length) {
      throw new Error("Nie znaleziono wybranych ustaleń oczekujących na akceptację klienta.");
    }

    recipientEmail = context.clientEmail;
    recipientName = context.clientName;
    intro = `Przesyłamy ${agreements.length} ${
      agreements.length === 1 ? "ustalenie" : agreements.length < 5 ? "ustalenia" : "ustaleń"
    } projektowych oczekujących na Państwa akceptację. Każde ustalenie można zaakceptować lub skomentować osobno — poniżej przyciski do każdego z nich.`;
  } else if (input.scope === "reminder") {
    if (!context.clientEmail) {
      throw new Error("Klient nie ma adresu e-mail w systemie.");
    }

    agreements = await fetchPendingAgreements(input.projectId, { sentAt: "set" });
    if (!agreements.length) {
      throw new Error("Brak ustaleń do przypomnienia — żadne nie było jeszcze wysłane w paczce.");
    }

    recipientEmail = context.clientEmail;
    recipientName = context.clientName;
    intro = `Przypominamy o ${agreements.length} ${
      agreements.length === 1 ? "ustaleniu" : agreements.length < 5 ? "ustaleniach" : "ustaleniach"
    } projektowych wciąż oczekujących na Państwa akceptację. Każde ustalenie można zaakceptować lub skomentować osobno — poniżej przyciski do każdego z nich.`;
  } else if (input.scope === "trade_pending") {
    if (!input.tradeId) {
      throw new Error("Brak identyfikatora branży.");
    }

    const trade = context.projectTrades.find((entry) => entry.id === input.tradeId);
    if (!trade) {
      throw new Error("Nie znaleziono branży w projekcie.");
    }
    if (!trade.email.trim()) {
      throw new Error(`Brak adresu e-mail dla branży ${trade.name}.`);
    }

    const pending = await fetchPendingAgreements(input.projectId);
    const rolesByAgreement = await fetchAgreementRoles(pending.map((entry) => entry.id));
    agreements = agreementsForTrade(pending, rolesByAgreement, trade);

    if (!agreements.length) {
      throw new Error(`Brak oczekujących ustaleń przypisanych do branży ${trade.name}.`);
    }

    recipientEmail = trade.email.trim();
    recipientName = trade.contactName.trim() || trade.company.trim() || trade.name;
    intro = `Prosimy o zapoznanie się z ${
      agreements.length === 1 ? "ustaleniem" : `${agreements.length} ustaleniami`
    } projektowymi w ramach Państwa branży (${formatProjectTradeRoleLabel(trade)}) i wymagane akceptacje.`;
  } else {
    throw new Error("Nieobsługiwany zakres wysyłki.");
  }

  if (!recipientEmail) {
    throw new Error("Brak adresu e-mail odbiorcy.");
  }

  agreements = await ensurePublicLinks(agreements);
  const subjectPrefix =
    input.scope === "trade_pending" || input.scope === "single_trade"
      ? `[${formatProjectTradeRoleLabel(context.projectTrades.find((t) => t.id === input.tradeId) ?? { name: "Branża", company: "" })}] `
      : undefined;
  const audience =
    input.scope === "trade_pending" || input.scope === "single_trade" ? "trade" : "client";

  return {
    agreements,
    recipientEmail,
    recipientName,
    intro,
    subjectPrefix,
    audience,
    projectName: context.projectName,
    clientPhone: context.clientPhone,
  };
}

/** Buduje treść maila (podgląd) bez wysyłki — do dialogu "podgląd + notatka" przed potwierdzeniem. */
export async function previewAgreementEmailServer(input: {
  projectId: string;
  scope: AgreementEmailScope;
  agreementId?: string;
  agreementIds?: string[];
  tradeId?: string;
  note?: string | null;
  includePhoto?: boolean;
}) {
  const target = await resolveAgreementEmailTarget(input);
  const { entries, hasPhoto } = await buildAgreementEmailEntries(
    target.agreements,
    input.includePhoto ?? true,
  );

  const [settings, company] = await Promise.all([
    fetchEmailSettingsServer(),
    resolveCompanyProfileDocumentServer(),
  ]);

  const template = buildAgreementDeliveryEmail({
    recipientName: target.recipientName,
    projectName: target.projectName,
    intro: target.intro,
    entries,
    subjectPrefix: target.subjectPrefix,
    settings,
    company,
    senderNote: input.note,
  });

  return {
    subject: template.subject,
    html: template.html,
    to: target.recipientEmail,
    agreementCount: target.agreements.length,
    hasPhoto,
  };
}

export async function sendProjectAgreementEmails(input: {
  projectId: string;
  scope: AgreementEmailScope;
  agreementId?: string;
  agreementIds?: string[];
  tradeId?: string;
  note?: string | null;
  includePhoto?: boolean;
}) {
  const target = await resolveAgreementEmailTarget(input);
  const { entries } = await buildAgreementEmailEntries(target.agreements, input.includePhoto ?? true);

  const [settings, company] = await Promise.all([
    fetchEmailSettingsServer(),
    resolveCompanyProfileDocumentServer(),
  ]);

  if (!isEmailAudienceEnabled(settings.routing, "agreement_delivery", target.audience)) {
    throw new Error(
      target.audience === "trade"
        ? "Wysyłka e-mail do branży jest wyłączona w Ustawieniach e-mail → Kiedy wysyłać."
        : "Wysyłka e-mail do klienta jest wyłączona w Ustawieniach e-mail → Kiedy wysyłać.",
    );
  }

  const template = buildAgreementDeliveryEmail({
    recipientName: target.recipientName,
    projectName: target.projectName,
    intro: target.intro,
    entries,
    subjectPrefix: target.subjectPrefix,
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
    throw new Error(
      "Wysyłka e-mail nie jest skonfigurowana (brak RESEND_API_KEY). Użyj opcji „Otwórz w kliencie poczty”.",
    );
  }

  // SMS tylko do klienta (nie do branży) i tylko gdy chodzi o pojedyncze ustalenie — przy
  // wysyłce wielu ustaleń naraz nie ma jednego, sensownego linku do podania w SMS.
  if (
    target.audience === "client" &&
    entries.length === 1 &&
    target.clientPhone.trim() &&
    isChannelEnabled(settings.routing, "agreement_delivery", "sms")
  ) {
    try {
      const agreement = target.agreements[0];
      const message = renderPlainTemplateString(settings.templates.agreement_delivery.sms, {
        agreement_title: agreement.title,
        project_name: target.projectName,
        offer_url: agreement.publicToken ? `${absoluteAppUrl(`/ustalenie/${agreement.publicToken}`)}` : "",
      });
      if (message) {
        await sendSms({
          phone: target.clientPhone.trim(),
          message,
          metadata: { type: "agreement_delivery", agreementId: agreement.id },
        });
      }
    } catch (smsError) {
      console.warn("[agreement-delivery] sms failed:", smsError);
    }
  }

  // Paczka i przypomnienie oznaczają wysłane ustalenia jako "ujęte w paczce" — dzięki temu kolejne
  // "Wyślij paczkę do akceptacji" nie proponuje ich ponownie, a "Przypomnij o akceptacjach" wie,
  // że już były wysłane.
  if (input.scope === "new_batch" || input.scope === "reminder") {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("project_client_agreements")
      .update({ sent_at: new Date().toISOString() })
      .in(
        "id",
        target.agreements.map((entry) => entry.id),
      );

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    ok: true as const,
    recipientEmail: target.recipientEmail,
    agreementCount: target.agreements.length,
    subject: template.subject,
  };
}

export async function listTradePendingAgreementCounts(projectId: string) {
  const context = await fetchProjectContext(projectId);
  const pending = await fetchPendingAgreements(projectId);
  const rolesByAgreement = await fetchAgreementRoles(pending.map((entry) => entry.id));

  return context.projectTrades
    .map((trade) => ({
      tradeId: trade.id,
      tradeName: trade.name,
      tradeLabel: formatProjectTradeRoleLabel(trade),
      email: trade.email.trim(),
      count: agreementsForTrade(pending, rolesByAgreement, trade).length,
    }))
    .filter((entry) => entry.count > 0);
}

