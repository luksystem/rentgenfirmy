"use client";

import { useState } from "react";
import { WorkOrderForm } from "@/components/work-order/work-order-form";
import { PageHeader } from "@/components/page-header";
import { useWorkOrderStore } from "@/store/work-order-store";

export default function NewWorkOrderPage() {
  const createEmptyOrder = useWorkOrderStore((s) => s.createEmptyOrder);
  const [order] = useState(() => createEmptyOrder());

  return (
    <>
      <PageHeader
        eyebrow="Zlecenia"
        title="Nowe zlecenie"
        description="Utwórz zlecenie ręcznie i przypisz je do klienta oraz projektu."
      />
      <WorkOrderForm initialOrder={order} />
    </>
  );
}
