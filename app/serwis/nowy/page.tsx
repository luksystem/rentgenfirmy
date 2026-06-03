"use client";

import { useState } from "react";
import { ServiceForm } from "@/components/service/service-form";
import { PageHeader } from "@/components/page-header";
import { useServiceStore } from "@/store/service-store";

export default function NewServicePage() {
  const createEmptyService = useServiceStore((s) => s.createEmptyService);
  const [service] = useState(() => createEmptyService());

  return (
    <>
      <PageHeader
        eyebrow="Serwis"
        title="Wyceń serwis"
        description="Uzupełnij dane klienta, stawki, estymację i po wykonaniu koszty rzeczywiste."
      />
      <ServiceForm initialService={service} />
    </>
  );
}
