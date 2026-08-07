import { createEmptyContract } from "@/lib/contracts/factory";
import type { Contract } from "@/lib/contracts/types";
import { buildContractSectionsFromCalculatorOffer } from "@/lib/calculator/to-contract-sections";
import type { CalculatorSettings } from "@/lib/calculator/settings";
import type { CalculatorOffer } from "@/lib/calculator/types";

/** Nowa umowa wypełniona pozycjami wyliczonymi z kalkulatora — dalej edytowalna jak każda inna. */
export function buildContractFromCalculatorOffer(offer: CalculatorOffer, settings: CalculatorSettings): Contract {
  const base = createEmptyContract();
  return {
    ...base,
    clientId: offer.clientId,
    contactId: offer.contactId,
    title: offer.title.trim() || "Umowa Inteligentny Dom",
    client: {
      ...base.client,
      fullName: offer.client.fullName,
      location: offer.client.location,
      email: offer.client.email,
      phone: offer.client.phone,
    },
    sections: buildContractSectionsFromCalculatorOffer(offer, settings),
  };
}
