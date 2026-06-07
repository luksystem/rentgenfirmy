"use client";

import { useState } from "react";
import { ServiceForm } from "@/components/service/service-form";
import { PageHeader } from "@/components/page-header";
import { useServiceStore } from "@/store/service-store";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";

export default function NewOfferPage() {
  const createEmptyService = useServiceStore((s) => s.createEmptyService);
  const [service] = useState(() => createEmptyService());

  return (
    <>
      <PageHeader
        eyebrow={COMMERCIAL_MODULES.serviceSettlement.eyebrow}
        title="Nowa oferta"
        description="Uzupełnij dane klienta, stawki, przewidywane koszty i po wykonaniu koszty rzeczywiste."
      />
      <ServiceForm initialService={service} />
    </>
  );
}
