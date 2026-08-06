import "server-only";

import { appendContractHistory, isContractExpired, normalizeContractVatDeclaration } from "@/lib/contracts/normalize";
import { contractRowSelectionKey } from "@/lib/contracts/totals";
import { canRespondToContract, isContractTableSection, type Contract } from "@/lib/contracts/types";
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
  params: {
    signerName?: string;
    selectedKeys?: string[];
    selectedPaymentPlanId?: string | null;
    vatDeclaration?: unknown;
    ip?: string | null;
  },
): Promise<Contract> {
  const contract = await fetchContractByPublicToken(token);
  if (!contract) {
    throw new Error("Nie znaleziono umowy.");
  }

  if (!canRespondToContract(contract)) {
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

    const selected = new Set(params.selectedKeys ?? []);
    const sections = contract.sections.map((section) => {
      if (!isContractTableSection(section) || section.group !== "option") {
        return section;
      }
      if (section.category === "dodatki") {
        const selectedRowIds = section.rows
          .filter((row) => selected.has(contractRowSelectionKey(section.id, row.id)))
          .map((row) => row.id);
        return { ...section, selectedRowIds };
      }
      return { ...section, selected: selected.has(section.id) };
    });

    const validPlanIds = new Set(contract.paymentPlans.map((plan) => plan.id));
    const selectedPaymentPlanId =
      params.selectedPaymentPlanId && validPlanIds.has(params.selectedPaymentPlanId)
        ? params.selectedPaymentPlanId
        : (contract.paymentPlans[0]?.id ?? null);

    updated = {
      ...contract,
      status: "signed_client",
      sections,
      selectedPaymentPlanId,
      vatDeclaration: normalizeContractVatDeclaration(params.vatDeclaration),
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
