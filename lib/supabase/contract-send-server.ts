import "server-only";

import { HttpError } from "@/lib/auth/http-error";
import { appendContractHistory, isContractExpired } from "@/lib/contracts/normalize";
import { calculateContractTotals } from "@/lib/contracts/totals";
import { emptyContractVatDeclaration, type Contract } from "@/lib/contracts/types";
import { buildContractSendEmail } from "@/lib/email/contract-templates";
import { sendTransactionalEmail } from "@/lib/email/send";
import { absoluteAppUrl } from "@/lib/messages/app-url";
import { defaultClientOfferExpiry, resolveClientOfferExpiresAt } from "@/lib/service/offer-validity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { contractToInsert, rowToContract } from "@/lib/supabase/contract-mappers";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import { formatDate } from "@/lib/utils";

/**
 * Wysyłka linku umowy do klienta — server-only, wzorem `lib/supabase/offer-send-server.ts`
 * (Szybkie oferty). Bez etapu zatwierdzania (Umowy go nie mają) i bez SMS — tylko generowanie
 * tokenu na żądanie, e-mail przez Resend i blokada podwójnej wysyłki (`token_sent_at`).
 */

async function fetchContractOrThrow(contractId: string): Promise<Contract> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new HttpError(404, "Nie znaleziono umowy.");
  }
  return rowToContract(data);
}

function assertContractSendable(contract: Contract) {
  if (contract.status === "signed_client" || contract.status === "signed_both") {
    throw new HttpError(400, "Ta umowa została już podpisana przez klienta.");
  }
  if (contract.status === "rejected") {
    throw new HttpError(400, "Umowa została odrzucona przez klienta.");
  }
  if (!contract.client.email.trim()) {
    throw new HttpError(400, "Brak adresu e-mail klienta.");
  }
}

/** Generuje token tylko jeśli brak / wygasł / był już wysłany — inaczej reużywa świeży, niewysłany link. */
async function ensureContractToken(contract: Contract): Promise<Contract> {
  if (contract.publicToken && !isContractExpired(contract) && !contract.tokenSentAt) {
    return contract;
  }

  const supabase = getSupabaseAdmin();
  const token = crypto.randomUUID();
  const isRegeneration = Boolean(contract.publicToken);

  const updated: Contract = {
    ...contract,
    status: "draft",
    publicToken: token,
    tokenExpiresAt: resolveClientOfferExpiresAt(contract.tokenExpiresAt) || defaultClientOfferExpiry(),
    tokenSentAt: null,
    clientSignature: null,
    companySignature: null,
    selectedPaymentPlanId: null,
    vatDeclaration: emptyContractVatDeclaration(),
    history: appendContractHistory(contract.history, {
      type: isRegeneration ? "link_regenerated" : "link_generated",
      message: isRegeneration ? "Wygenerowano ponownie link do podpisania." : "Wygenerowano link do podpisania.",
    }),
  };

  const { data, error } = await supabase
    .from("contracts")
    .upsert(contractToInsert({ ...updated, updatedAt: new Date().toISOString() }), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowToContract(data);
}

function contractPublicUrl(contract: Contract) {
  return absoluteAppUrl(`/podpisz-umowe/${contract.publicToken}`);
}

async function buildEmailForContract(contract: Contract, note?: string | null) {
  const [settings, company] = await Promise.all([
    fetchEmailSettingsServer(),
    resolveCompanyProfileDocumentServer().catch(() => null),
  ]);

  const totals = calculateContractTotals(contract.sections);

  const email = buildContractSendEmail({
    clientName: contract.client.fullName,
    contractTitle: contract.title,
    contractUrl: contractPublicUrl(contract),
    expiresAtLabel: contract.tokenExpiresAt ? formatDate(contract.tokenExpiresAt) : null,
    netTotal: totals.totalNet,
    brand: settings.brand,
    company,
    senderNote: note,
  });

  return { ...email, to: contract.client.email.trim() };
}

export async function previewContractEmailServer(input: { contractId: string; note?: string | null }) {
  const contract = await fetchContractOrThrow(input.contractId);
  assertContractSendable(contract);

  const withToken = await ensureContractToken(contract);
  const email = await buildEmailForContract(withToken, input.note);

  return { ...email, contract: withToken };
}

const CONTRACT_ALREADY_SENT_MESSAGE =
  "Ta umowa została już wysłana do klienta. Wygeneruj nowy link, aby wysłać ponownie.";

/**
 * Blokada podwójnej wysyłki (dwie osoby klikające "Wyślij" niemal jednocześnie) — warunkowy
 * UPDATE ... WHERE token_sent_at IS NULL jest atomowy, wzorem `claimOfferSendLock`.
 */
async function claimContractSendLock(contract: Contract): Promise<{ claimedAt: string }> {
  if (!contract.publicToken) {
    throw new Error("Brak tokenu umowy do wysyłki.");
  }
  const claimedAt = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("contracts")
    .update({ token_sent_at: claimedAt })
    .eq("id", contract.id)
    .eq("public_token", contract.publicToken)
    .is("token_sent_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new HttpError(409, CONTRACT_ALREADY_SENT_MESSAGE);
  }
  return { claimedAt };
}

async function releaseContractSendLock(contractId: string) {
  const supabase = getSupabaseAdmin();
  await supabase.from("contracts").update({ token_sent_at: null }).eq("id", contractId);
}

export async function sendContractEmailServer(input: { contractId: string; note?: string | null }) {
  const contract = await fetchContractOrThrow(input.contractId);
  assertContractSendable(contract);

  const withToken = await ensureContractToken(contract);
  await claimContractSendLock(withToken);

  let result: { skipped?: boolean } = {};
  try {
    const email = await buildEmailForContract(withToken, input.note);
    result = await sendTransactionalEmail({ to: email.to, subject: email.subject, html: email.html });
  } catch (sendError) {
    // Nic nie dotarło do klienta — zdejmij blokadę, żeby dało się spróbować ponownie bez
    // zmuszania do regeneracji linku z powodu przejściowego błędu wysyłki.
    await releaseContractSendLock(withToken.id).catch(() => undefined);
    throw sendError;
  }

  if (result.skipped) {
    // Brak konfiguracji RESEND_API_KEY — mail nie wyszedł, więc blokada nie powinna obowiązywać.
    await releaseContractSendLock(withToken.id).catch(() => undefined);
  }

  const actuallySent = !result.skipped;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("contracts")
    .update({
      // Status "sent" (Wysłana) dopiero po faktycznej wysyłce maila — nie przy samym
      // wygenerowaniu linku ani gdy wysyłka została pominięta (brak RESEND_API_KEY).
      ...(actuallySent ? { status: "sent" } : {}),
      history: appendContractHistory(withToken.history, {
        type: "sent",
        message: actuallySent
          ? "Wysłano umowę e-mailem do klienta."
          : "Próba wysyłki pominięta — brak konfiguracji e-mail (RESEND_API_KEY).",
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contractId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { contract: rowToContract(data), emailSkipped: result.skipped };
}
