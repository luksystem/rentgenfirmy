"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { PageHeader } from "@/components/page-header";
import { createEmptyCalculatorOffer } from "@/lib/calculator/factory";
import { clientToCalculatorClient, contactToCalculatorClient } from "@/lib/calculator/types";
import { useAppStore } from "@/store/app-store";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

function NewCalculatorOfferContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const contactId = searchParams.get("contactId");
  const clients = useAppStore((state) => state.clients);
  const contacts = useAppStore((state) => state.contacts);

  const initialOffer = useMemo(() => {
    const base = createEmptyCalculatorOffer();

    if (contactId) {
      const contact = contacts.find((entry) => entry.id === contactId);
      if (contact) {
        return { ...base, clientId: null, contactId, client: contactToCalculatorClient(contact) };
      }
    }
    if (clientId) {
      const client = clients.find((entry) => entry.id === clientId);
      if (client) {
        return { ...base, clientId, contactId: null, client: clientToCalculatorClient(client) };
      }
    }
    return base;
  }, [clientId, contactId, clients, contacts]);

  const [offer] = useState(initialOffer);

  return (
    <>
      <PageHeader
        eyebrow={COMMERCIAL_MODULES.salesCalculations.eyebrow}
        title="Nowa kalkulacja"
        description="Wypełnij ankietę parametrów domu — cena przelicza się na żywo."
      />
      <CalculatorForm initialOffer={offer} />
    </>
  );
}

export default function NewCalculatorOfferPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Ładowanie formularza…</p>}>
      <NewCalculatorOfferContent />
    </Suspense>
  );
}
