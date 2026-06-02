"use client";

import Link from "next/link";
import { ServiceList } from "@/components/service/service-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function SerwisPage() {
  return (
    <>
      <PageHeader
        eyebrow="Moduł operacyjny"
        title="Serwis"
        description="Wycena przed wyjazdem, koszty rzeczywiste po serwisie, porównanie i raport do rozliczenia."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/serwis/ustawienia">Ustawienia stawek</Link>
            </Button>
            <Button asChild>
              <Link href="/serwis/nowy">Wyceń serwis</Link>
            </Button>
          </div>
        }
      />
      <ServiceList />
    </>
  );
}
