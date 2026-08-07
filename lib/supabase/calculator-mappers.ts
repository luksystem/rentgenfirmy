import type { CalculatorOfferInsert, CalculatorOfferRow } from "@/lib/supabase/database.types";
import { normalizeCalculatorAnswers, normalizeCalculatorClient, normalizeCalculatorOfferStatus } from "@/lib/calculator/normalize";
import type { CalculatorOffer } from "@/lib/calculator/types";

export function rowToCalculatorOffer(row: CalculatorOfferRow): CalculatorOffer {
  return {
    id: row.id,
    status: normalizeCalculatorOfferStatus(row.status),
    clientId: row.client_id,
    contactId: row.contact_id,
    title: row.title,
    client: normalizeCalculatorClient({
      fullName: row.client_full_name,
      location: row.client_location,
      email: row.client_email,
      phone: row.client_phone,
    }),
    answers: normalizeCalculatorAnswers(row.answers),
    contractId: row.contract_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function calculatorOfferToInsert(offer: CalculatorOffer): CalculatorOfferInsert {
  return {
    id: offer.id,
    status: offer.status,
    client_id: offer.clientId,
    contact_id: offer.contactId,
    title: offer.title,
    client_full_name: offer.client.fullName,
    client_location: offer.client.location,
    client_email: offer.client.email,
    client_phone: offer.client.phone,
    answers: offer.answers as unknown,
    contract_id: offer.contractId,
    created_at: offer.createdAt,
    updated_at: offer.updatedAt,
  };
}
