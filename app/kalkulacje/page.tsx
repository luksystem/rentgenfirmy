"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";
import { useAppStore } from "@/store/app-store";
import { formatPartyName } from "@/lib/party/display-name";
import { contactToServiceClient } from "@/lib/contacts/types";
import { clientToServiceClient } from "@/lib/service/types";

const moduleInfo = COMMERCIAL_MODULES.salesCalculations;

function SalesCalculationsContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const contactId = searchParams.get("contactId");
  const clients = useAppStore((state) => state.clients);
  const contacts = useAppStore((state) => state.contacts);

  const linkedClient = clientId ? clients.find((entry) => entry.id === clientId) : null;
  const linkedContact = contactId ? contacts.find((entry) => entry.id === contactId) : null;
  const linkedParty = linkedClient
    ? { kind: "Klient" as const, name: formatPartyName(linkedClient), snapshot: clientToServiceClient(linkedClient) }
    : linkedContact
      ? {
          kind: "Kontakt" as const,
          name: formatPartyName(linkedContact),
          snapshot: contactToServiceClient(linkedContact),
        }
      : null;

  return (
    <>
      <PageHeader
        eyebrow={moduleInfo.eyebrow}
        title={moduleInfo.label}
        description={moduleInfo.description}
        action={
          <Button variant="secondary" asChild>
            <Link href={COMMERCIAL_MODULES.serviceSettlement.href}>
              Przejdź do rozliczeń serwis
            </Link>
          </Button>
        }
      />

      {linkedParty ? (
        <Card className="mb-4 border-border/80">
          <CardContent className="grid gap-2 py-4 text-sm">
            <p className="font-medium text-foreground">
              Powiązany {linkedParty.kind.toLowerCase()}: {linkedParty.name}
            </p>
            <p className="text-muted">
              {[linkedParty.snapshot.location, linkedParty.snapshot.email, linkedParty.snapshot.phone]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-xs text-muted">
              Parametr URL: {linkedParty.kind === "Klient" ? `clientId=${clientId}` : `contactId=${contactId}`}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-dashed border-border/80">
        <CardContent className="grid gap-3 py-8 text-center sm:py-10">
          <p className="text-sm font-medium text-foreground">Moduł w przygotowaniu</p>
          <p className="mx-auto max-w-xl text-sm text-muted">
            Tutaj powstanie osobny flow do budowania interaktywnych wycen Smart Home dla
            klientów i kontaktów — niezależny od szybkiego rozliczania serwisowego. Możesz już
            otwierać kalkulację z parametrem{" "}
            <code className="rounded bg-surface-muted px-1">?clientId=</code> lub{" "}
            <code className="rounded bg-surface-muted px-1">?contactId=</code>.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

export default function SalesCalculationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Ładowanie…</p>}>
      <SalesCalculationsContent />
    </Suspense>
  );
}
