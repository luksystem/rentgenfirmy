"use client";

import { useState } from "react";
import { ServiceForm } from "@/components/service/service-form";
import { PageHeader } from "@/components/page-header";
import { useServiceStore } from "@/store/service-store";

export default function NewOfferPage() {
  const createEmptyService = useServiceStore((s) => s.createEmptyService);
  const [service] = useState(() => createEmptyService());

  return (
    <>
      <PageHeader
        eyebrow="Oferty"
        title="Nowa oferta"
        description="Uzupełnij dane klienta, stawki, przewidywane koszty i po wykonaniu koszty rzeczywiste."
      />
      <ServiceForm initialService={service} />
    </>
  );
}
