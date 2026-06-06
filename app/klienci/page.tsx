"use client";

import { PageHeader } from "@/components/page-header";
import { ClientsTable } from "@/components/clients-table";

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Baza kontaktów"
        title="Klienci"
        description="Zarządzaj klientami powiązanymi z projektami, ofertami i zleceniami. Integracja API: POST /api/clients z nagłówkiem Authorization: Bearer CLIENTS_API_SECRET."
      />
      <ClientsTable />
    </>
  );
}
