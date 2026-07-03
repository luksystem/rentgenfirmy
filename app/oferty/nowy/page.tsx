"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ServiceForm } from "@/components/service/service-form";
import { PageHeader } from "@/components/page-header";
import { useServiceStore } from "@/store/service-store";
import { useAppStore } from "@/store/app-store";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";
import { contactToServiceClient } from "@/lib/contacts/types";
import { clientToServiceClient } from "@/lib/service/types";

function NewOfferPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const contactId = searchParams.get("contactId");
  const projectId = searchParams.get("projectId");
  const clients = useAppStore((state) => state.clients);
  const contacts = useAppStore((state) => state.contacts);
  const createEmptyService = useServiceStore((state) => state.createEmptyService);

  const initialService = useMemo(() => {
    const base = createEmptyService();
    const resolvedProjectId = projectId && projectId.length > 0 ? projectId : null;

    if (contactId) {
      const contact = contacts.find((entry) => entry.id === contactId);
      if (!contact) {
        return base;
      }

      return {
        ...base,
        clientId: null,
        contactId,
        projectId: resolvedProjectId,
        client: contactToServiceClient(contact),
      };
    }

    if (!clientId) {
      return base;
    }

    const client = clients.find((entry) => entry.id === clientId);
    if (!client) {
      return base;
    }

    return {
      ...base,
      clientId,
      contactId: null,
      projectId: resolvedProjectId,
      client: clientToServiceClient(client),
    };
  }, [clientId, contactId, clients, contacts, createEmptyService, projectId]);

  const [service] = useState(initialService);

  return (
    <>
      <PageHeader
        eyebrow={COMMERCIAL_MODULES.serviceSettlement.eyebrow}
        title="Nowa oferta"
        description="Uzupełnij dane klienta lub kontaktu, stawki, przewidywane koszty i po wykonaniu koszty rzeczywiste."
      />
      <ServiceForm initialService={service} />
    </>
  );
}

export default function NewOfferPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Ładowanie formularza…</p>}>
      <NewOfferPageContent />
    </Suspense>
  );
}
