"use client";

import Link from "next/link";
import { WorkOrderList } from "@/components/work-order/work-order-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ZleceniaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Moduł operacyjny"
        title="Zlecenia"
        description="Zlecenia z zaakceptowanych ofert lub utworzone ręcznie — przypisane do klientów i projektów."
        action={
          <Button asChild>
            <Link href="/zlecenia/nowe">Nowe zlecenie</Link>
          </Button>
        }
      />
      <WorkOrderList />
    </>
  );
}
