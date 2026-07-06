"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ProtocolTemplateEditor } from "@/components/process/protocol-template-editor";
import { Button } from "@/components/ui/button";
import { emptyProtocolTemplate, type ProtocolTemplate } from "@/lib/process/protocol-types";
import { useProcessStore } from "@/store/process-store";

export default function NewProtocolTemplatePage() {
  const router = useRouter();
  const createProtocolTemplate = useProcessStore((state) => state.createProtocolTemplate);
  const [draft] = useState<ProtocolTemplate>(() => ({
    id: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...emptyProtocolTemplate(),
  }));

  async function handleSave(template: ProtocolTemplate, referenceFile?: File | null) {
    const created = await createProtocolTemplate({
      name: template.name,
      description: template.description,
      source: template.source,
      fields: template.fields,
      referenceFile,
    });
    router.push(`/procesy/protokoly/${created.id}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Wzór protokołu"
        title="Nowy wzór"
        description="Zbuduj formularz protokołu (pola do wypełnienia) albo dołącz referencyjny PDF do podglądu podczas wizyty."
        action={
          <Button variant="secondary" asChild>
            <Link href="/procesy/protokoly">Wzory protokołów</Link>
          </Button>
        }
      />
      <ProtocolTemplateEditor initialTemplate={draft} onSave={handleSave} />
    </>
  );
}
