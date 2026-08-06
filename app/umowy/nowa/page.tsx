"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ContractForm } from "@/components/contracts/contract-form";
import { PageHeader } from "@/components/page-header";
import { buildContractFromTemplate, createEmptyContract } from "@/lib/contracts/factory";
import { clientToContractClient, contactToContractClient } from "@/lib/contracts/types";
import { useAppStore } from "@/store/app-store";
import { useContractStore } from "@/store/contract-store";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

function NewContractPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const contactId = searchParams.get("contactId");
  const templateId = searchParams.get("templateId");
  const clients = useAppStore((state) => state.clients);
  const contacts = useAppStore((state) => state.contacts);
  const templates = useContractStore((state) => state.templates);

  const initialContract = useMemo(() => {
    const base = createEmptyContract();

    const withParty = (() => {
      if (contactId) {
        const contact = contacts.find((entry) => entry.id === contactId);
        if (!contact) {
          return base;
        }
        return { ...base, clientId: null, contactId, client: contactToContractClient(contact) };
      }
      if (clientId) {
        const client = clients.find((entry) => entry.id === clientId);
        if (!client) {
          return base;
        }
        return { ...base, clientId, contactId: null, client: clientToContractClient(client) };
      }
      return base;
    })();

    const template = templateId ? templates.find((entry) => entry.id === templateId) : null;
    if (!template) {
      return withParty;
    }

    return buildContractFromTemplate(template, {
      clientId: withParty.clientId,
      contactId: withParty.contactId,
      client: withParty.client,
    });
  }, [clientId, contactId, clients, contacts, templateId, templates]);

  const [contract] = useState(initialContract);

  return (
    <>
      <PageHeader
        eyebrow={COMMERCIAL_MODULES.contracts.eyebrow}
        title="Nowa umowa"
        description="Wybierz klienta lub kontakt, uzupełnij treść umowy, tabele pozycji i harmonogram spłat."
      />
      <ContractForm initialContract={contract} />
    </>
  );
}

export default function NewContractPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Ładowanie formularza…</p>}>
      <NewContractPageContent />
    </Suspense>
  );
}
