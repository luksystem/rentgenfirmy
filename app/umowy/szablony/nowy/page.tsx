"use client";

import { useState } from "react";
import { ContractTemplateForm } from "@/components/contracts/contract-template-form";
import { PageHeader } from "@/components/page-header";
import { createEmptyContractTemplate } from "@/lib/contracts/factory";

export default function NewContractTemplatePage() {
  const [template] = useState(createEmptyContractTemplate);

  return (
    <>
      <PageHeader eyebrow="Sprzedaż" title="Nowy szablon umowy" description="Zdefiniuj treść i harmonogram spłat do wielokrotnego wykorzystania." />
      <ContractTemplateForm initialTemplate={template} />
    </>
  );
}
