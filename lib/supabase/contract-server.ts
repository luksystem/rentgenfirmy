import "server-only";

import { appendContractHistory, isContractExpired } from "@/lib/contracts/normalize";
import { isContractTableSection, type Contract } from "@/lib/contracts/types";
import { getSupabaseServer } from "@/lib/supabase/server";
import { contractToInsert, rowToContract } from "@/lib/supabase/contract-mappers";

/**
 * Odpowiedź klienta na umowę (podpis / odrzucenie) — server-only, wywoływane wyłącznie z
 * `app/api/podpisz-umowe/[token]/route.ts`. Nigdy nie importuj z komponentu klienckiego.
 * Podpis firmy (drugiej strony) żyje w `lib/supabase/contract-repository.ts` — to działanie
 * wykonuje zalogowany pracownik z panelu admina, więc może iść bezpośrednio przez
 * klienta Supabase w przeglądarce (ten sam wzorzec co `acceptProtocol` dla protokołów procesu).
 */

export async function fetchContractByPublicToken(token: string): Promise<Contract | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToContract(data) : null;
}

export type RespondToContractAction = "sign" | "reject";

export async function respondToContract(
  token: string,
  action: RespondToContractAction,
  params: { signerName?: string; selectedOptionSectionIds?: string[]; ip?: string | null },
): Promise<Contract> {
  const contract = await fetchContractByPublicToken(token);
  if (!contract) {
    throw new Error("Nie znaleziono umowy.");
  }

  if (contract.status !== "sent" && contract.status !== "negotiating") {
    throw new Error("Ta umowa nie oczekuje już na decyzję klienta.");
  }

  if (isContractExpired(contract)) {
    throw new Error("Link do podpisania umowy wygasł.");
  }

  let updated: Contract;

  if (action === "reject") {
    updated = {
      ...contract,
      status: "rejected",
      history: appendContractHistory(contract.history, {
        type: "rejected",
        message: "Klient odrzucił umowę.",
      }),
    };
  } else {
    const signerName = params.signerName?.trim();
    if (!signerName) {
      throw new Error("Podaj imię i nazwisko do podpisu.");
    }

    const selected = new Set(params.selectedOptionSectionIds ?? []);
    const sections = contract.sections.map((section) => {
      if (!isContractTableSection(section) || section.group !== "option") {
        return section;
      }
      return { ...section, selected: selected.has(section.id) };
    });

    updated = {
      ...contract,
      status: "signed_client",
      sections,
      clientSignature: {
        signerName,
        signedAt: new Date().toISOString(),
        ip: params.ip ?? null,
      },
      history: appendContractHistory(contract.history, {
        type: "signed_client",
        message: `Klient podpisał umowę (${signerName}).`,
      }),
    };
  }

  const supabase = getSupabaseServer();
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
