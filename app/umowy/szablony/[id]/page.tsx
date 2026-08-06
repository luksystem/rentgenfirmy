"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ContractTemplateForm } from "@/components/contracts/contract-template-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useContractStore } from "@/store/contract-store";

export default function ContractTemplatePage() {
  const params = useParams();
  const id = String(params.id);
  const getTemplateById = useContractStore((state) => state.getTemplateById);
  const hydrated = useContractStore((state) => state.hydrated);
  const isLoading = useContractStore((state) => state.isLoading);
  const template = getTemplateById(id);

  if (!template) {
    if (!hydrated || isLoading) {
      return <p className="text-sm text-muted">Wczytywanie szablonu…</p>;
    }

    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted">Nie znaleziono szablonu.</p>
        <Button asChild>
          <Link href="/umowy/szablony">Wróć do listy</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Sprzedaż" title={template.name || "Szablon umowy"} description="Treść i harmonogram spłat tego szablonu." />
      <ContractTemplateForm key={`${template.id}:${template.updatedAt}`} initialTemplate={template} />
    </>
  );
}
