"use client";

import Link from "next/link";
import { ContractContentBlockList, NewContentBlockCard } from "@/components/contracts/contract-content-block-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ContractContentBlocksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sprzedaż"
        title="Biblioteka treści"
        description="Gotowe bloki tekstu (klauzule) do wstawiania w umowach i szablonach umów."
        action={
          <Button variant="secondary" asChild>
            <Link href="/umowy">Umowy</Link>
          </Button>
        }
      />
      <div className="grid gap-4">
        <NewContentBlockCard />
        <ContractContentBlockList />
      </div>
    </>
  );
}
