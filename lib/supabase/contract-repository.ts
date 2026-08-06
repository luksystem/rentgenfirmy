import { defaultClientOfferExpiry, resolveClientOfferExpiresAt } from "@/lib/service/offer-validity";
import { appendContractHistory, isContractExpired } from "@/lib/contracts/normalize";
import { canCompanySignContract, type Contract } from "@/lib/contracts/types";
import { getSupabase } from "@/lib/supabase/client";
import { contractToInsert, rowToContract } from "@/lib/supabase/contract-mappers";
import { fetchCompanyProfile } from "@/lib/supabase/company-profile-repository";

const CONTRACT_DOCUMENTS_BUCKET = "contract-documents";

/**
 * Funkcje bezpieczne do importu z komponentów klienckich ("use client") — bez zależności
 * server-only. Odpowiedź klienta na umowę i podpis firmy (side-effecty: generowanie PDF,
 * zapis do Storage) żyją w `lib/supabase/contract-server.ts` — importuj je tylko z kodu
 * server-only (route handlery), żeby nie przeciekały do bundla przeglądarki. Wzorem
 * `client-offer-repository.ts`.
 */

export async function fetchContracts(): Promise<Contract[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToContract);
}

export async function upsertContract(contract: Contract): Promise<Contract> {
  const supabase = getSupabase();
  const payload = contractToInsert({ ...contract, updatedAt: new Date().toISOString() });

  const { data, error } = await supabase
    .from("contracts")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContract(data);
}

export async function deleteContract(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("contracts").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export function isContractLinkExpired(contract: Contract) {
  return isContractExpired(contract);
}

/**
 * Generuje/regeneruje link publiczny do podpisania — zeruje ewentualne wcześniejsze podpisy
 * (nowy link = nowa runda podpisywania). Status zostaje "draft" — klient może już użyć linku
 * (ręcznie przekazanego: kopiuj/mailto/udostępnij), ale odznaka "Wysłana" pojawia się dopiero po
 * faktycznej wysyłce mailem przez `sendContractEmailServer`.
 */
export async function generateContractLink(contract: Contract): Promise<Contract> {
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
    history: appendContractHistory(contract.history, {
      type: isRegeneration ? "link_regenerated" : "link_generated",
      message: isRegeneration ? "Wygenerowano ponownie link do podpisania." : "Wygenerowano link do podpisania.",
    }),
  };

  return upsertContract(updated);
}

/**
 * Podpis przedstawiciela firmy — drugi z dwóch podpisów. Wywoływane z panelu admina (zalogowany
 * pracownik), więc bezpiecznie generuje finalny PDF w przeglądarce (dynamiczny import, żeby nie
 * ciągnąć pdf-lib/fontkit do każdego bundla) i zapisuje go w Storage — ten sam wzorzec co
 * `acceptProtocol` w `process-protocol-repository.ts`.
 */
export async function signContractAsCompany(contract: Contract, signerName: string): Promise<Contract> {
  if (!canCompanySignContract(contract)) {
    throw new Error("Umowa nie oczekuje jeszcze na podpis firmy.");
  }
  const trimmedName = signerName.trim();
  if (!trimmedName) {
    throw new Error("Podaj imię i nazwisko przedstawiciela firmy.");
  }

  const signedAt = new Date().toISOString();
  const withSignature: Contract = {
    ...contract,
    status: "signed_both",
    companySignature: { signerName: trimmedName, signedAt, userId: null },
    history: appendContractHistory(contract.history, {
      type: "signed_company",
      message: `Firma podpisała umowę (${trimmedName}).`,
    }),
  };

  const { generateContractPdf } = await import("@/lib/contracts/contract-pdf");
  const company = await fetchCompanyProfile();
  const pdfBytes = await generateContractPdf({ contract: withSignature, company });

  const supabase = getSupabase();
  const storagePath = `${contract.id}/umowa-${Date.now()}.pdf`;
  const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  const { error: uploadError } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return upsertContract({ ...withSignature, signedDocumentStoragePath: storagePath });
}

export async function getContractDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  return data?.signedUrl ?? null;
}
