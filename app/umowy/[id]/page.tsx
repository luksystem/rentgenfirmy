"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ContractForm } from "@/components/contracts/contract-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { COMMERCIAL_MODULES } from "@/lib/modules/commercial-modules";
import { useContractStore } from "@/store/contract-store";

export default function ContractPage() {
  const params = useParams();
  const id = String(params.id);
  const getContractById = useContractStore((state) => state.getContractById);
  const hydrated = useContractStore((state) => state.hydrated);
  const isLoading = useContractStore((state) => state.isLoading);
  const contract = getContractById(id);

  if (!contract) {
    if (!hydrated || isLoading) {
      return <p className="text-sm text-muted">Wczytywanie umowy…</p>;
    }

    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted">Nie znaleziono umowy.</p>
        <Button asChild>
          <Link href="/umowy">Wróć do listy</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={COMMERCIAL_MODULES.contracts.eyebrow}
        title={contract.title || "Umowa"}
        description="Edytuj treść, tabele pozycji, harmonogram spłat i status podpisu."
      />
      <ContractForm key={`${contract.id}:${contract.status}:${contract.updatedAt}`} initialContract={contract} />
    </>
  );
}
