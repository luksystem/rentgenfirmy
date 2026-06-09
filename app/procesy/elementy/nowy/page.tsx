"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProcessElementEditor } from "@/components/process/process-element-editor";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { templatePayloadFromTitle } from "@/lib/process/item-payload";
import type { ProcessElement } from "@/lib/process/types";
import { useProcessStore } from "@/store/process-store";

export default function NewProcessElementPage() {
  const router = useRouter();
  const createElement = useProcessStore((state) => state.createElement);
  const [draft] = useState<ProcessElement>(() => ({
    id: "",
    kind: "checklist",
    title: "",
    description: "",
    defaultPayload: templatePayloadFromTitle("", "checklist"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  async function handleSave(element: ProcessElement) {
    const created = await createElement({
      kind: element.kind,
      title: element.title,
      description: element.description,
      defaultPayload: element.defaultPayload,
    });
    router.push(`/procesy/elementy/${created.id}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Element procesu"
        title="Nowy element"
        description="Zdefiniuj checklistę, protokół lub rozliczenie do użycia w szablonach procesów."
        action={
          <Button variant="secondary" asChild>
            <Link href="/procesy/elementy">Katalog elementów</Link>
          </Button>
        }
      />
      <ProcessElementEditor initialElement={draft} onSave={handleSave} />
    </>
  );
}
