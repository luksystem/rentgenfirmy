import type { Contract } from "@/lib/contracts/types";

/**
 * Podstawia znane placeholdery `{{token}}` danymi klienta w treści bloku tekstowego — np.
 * paragraf "Strony umowy" ma wpisane `{{client_full_name}}` zamiast kropkowanej linii do
 * ręcznego wypełnienia. Prosty, jawny słownik tokenów — nie pełny silnik szablonów, żeby nie
 * komplikować edytora treści dla przypadku, który dziś dotyczy tylko danych stron umowy.
 */
export function renderContractText(content: string, contract: Pick<Contract, "client">): string {
  const tokens: Record<string, string> = {
    client_full_name: contract.client.fullName || "................",
    client_location: contract.client.location || "................",
    client_nip: contract.client.nip || "................",
    client_company_name: contract.client.companyName || "",
    client_email: contract.client.email || "",
    client_phone: contract.client.phone || "",
  };

  return content.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => {
    const value = tokens[key];
    return value !== undefined ? value : match;
  });
}
