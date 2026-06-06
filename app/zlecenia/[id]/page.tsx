"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkOrderForm } from "@/components/work-order/work-order-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useWorkOrderStore } from "@/store/work-order-store";

export default function EditWorkOrderPage() {
  const params = useParams();
  const id = String(params.id);
  const getOrderById = useWorkOrderStore((s) => s.getOrderById);
  const order = getOrderById(id);

  if (!order) {
    return (
      <div className="grid gap-4">
        <p className="text-muted">Nie znaleziono zlecenia.</p>
        <Button asChild>
          <Link href="/zlecenia">Wróć do listy</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Zlecenia"
        title="Edytuj zlecenie"
        description={order.title}
        action={
          <Button variant="secondary" asChild>
            <Link href="/zlecenia">Lista zleceń</Link>
          </Button>
        }
      />
      <WorkOrderForm key={order.id} initialOrder={order} />
    </>
  );
}
