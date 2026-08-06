"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
  const title = searchParams.get("title");
  const note = searchParams.get("note");
  const clients = useAppStore((state) => state.clients);
  const contacts = useAppStore((state) => state.contacts);
  const hydrated = useServiceStore((state) => state.hydrated);
  const createEmptyService = useServiceStore((state) => state.createEmptyService);

  // createEmptyService() czyta settings.rates z magazynu W MOMENCIE WYWOŁANIA — dopoki
  // ServiceHydrator (app/oferty/layout.tsx) nie skonczy asynchronicznego hydrate(), stawki w
  // magazynie to jeszcze DEFAULT_SERVICE_SETTINGS (twarde wartosci zastepcze), nie te zapisane w
  // Ustawieniach stawek. Licznik nizej (useState) zamraza tamten wynik na stale, wiec bez tego
  // warunku nowa oferta dostawala domyslne stawki nawet po tym, jak realne juz sie doladowaly.
  const initialService = useMemo(() => {
    if (!hydrated) {
      return null;
    }
    const base = createEmptyService();
    const resolvedProjectId = projectId && projectId.length > 0 ? projectId : null;
    const resolvedTitle = title?.trim() ? title.trim() : base.title;

    if (contactId) {
      const contact = contacts.find((entry) => entry.id === contactId);
      if (!contact) {
        return { ...base, title: resolvedTitle };
      }

      return {
        ...base,
        clientId: null,
        contactId,
        projectId: resolvedProjectId,
        client: contactToServiceClient(contact),
        title: resolvedTitle,
      };
    }

    if (!clientId) {
      return { ...base, title: resolvedTitle };
    }

    const client = clients.find((entry) => entry.id === clientId);
    if (!client) {
      return { ...base, title: resolvedTitle };
    }

    return {
      ...base,
      clientId,
      contactId: null,
      projectId: resolvedProjectId,
      client: clientToServiceClient(client),
      title: resolvedTitle,
    };
  }, [hydrated, clientId, contactId, clients, contacts, createEmptyService, projectId, title]);

  const [service, setService] = useState(initialService);

  useEffect(() => {
    if (!service && initialService) {
      setService(initialService);
    }
  }, [initialService, service]);

  if (!service) {
    return <p className="text-sm text-muted">Ładowanie ustawień…</p>;
  }

  return (
    <>
      <PageHeader
        eyebrow={COMMERCIAL_MODULES.serviceSettlement.eyebrow}
        title="Nowa oferta"
        description="Uzupełnij dane klienta lub kontaktu, stawki, przewidywane koszty i po wykonaniu koszty rzeczywiste."
      />
      <ServiceForm initialService={service} initialAiNote={note?.trim() || undefined} />
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
