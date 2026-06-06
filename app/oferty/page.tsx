"use client";

import Link from "next/link";
import { ServiceList } from "@/components/service/service-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function OfertyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Moduł operacyjny"
        title="Oferty"
        description="Wycena przed wyjazdem, koszty rzeczywiste po realizacji, porównanie i raport do rozliczenia."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/oferty/ustawienia">Ustawienia stawek</Link>
            </Button>
            <Button asChild>
              <Link href="/oferty/nowy">Nowa oferta</Link>
            </Button>
          </div>
        }
      />
      <ServiceList />
    </>
  );
}
