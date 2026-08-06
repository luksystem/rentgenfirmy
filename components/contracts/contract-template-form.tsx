"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ContractPaymentPlansEditor } from "@/components/contracts/contract-payment-plans-editor";
import { ContractSectionsEditor } from "@/components/contracts/contract-sections-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { ContractTemplate } from "@/lib/contracts/types";
import { useContractStore } from "@/store/contract-store";

export function ContractTemplateForm({ initialTemplate }: { initialTemplate: ContractTemplate }) {
  const router = useRouter();
  const contentBlocks = useContractStore((state) => state.contentBlocks);
  const saveTemplate = useContractStore((state) => state.saveTemplate);
  const removeTemplate = useContractStore((state) => state.removeTemplate);
  const isNew = !useContractStore.getState().getTemplateById(initialTemplate.id);

  const [template, setTemplate] = useState(initialTemplate);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!template.name.trim()) {
      window.alert("Podaj nazwę szablonu.");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveTemplate(template);
      setTemplate(saved);
      if (isNew) {
        router.replace(`/umowy/szablony/${saved.id}`);
      }
    } catch {
      window.alert("Nie udało się zapisać szablonu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Usunąć ten szablon?")) {
      return;
    }
    try {
      await removeTemplate(template.id);
      router.push("/umowy/szablony");
    } catch {
      window.alert("Nie udało się usunąć szablonu.");
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Dane szablonu</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nazwa szablonu">
              <Input
                value={template.name}
                onChange={(event) => setTemplate({ ...template, name: event.target.value })}
                placeholder="Np. Umowa — instalacja Smart Home"
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={template.isActive}
                onChange={(event) => setTemplate({ ...template, isActive: event.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Aktywny (widoczny przy tworzeniu nowej umowy)
            </label>
          </div>
          <Field label="Opis (widoczny tylko wewnętrznie)">
            <Textarea
              value={template.description}
              onChange={(event) => setTemplate({ ...template, description: event.target.value })}
              rows={2}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <ContractSectionsEditor
            sections={template.sections}
            onChange={(sections) => setTemplate({ ...template, sections })}
            contentBlocks={contentBlocks}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <ContractPaymentPlansEditor
            plans={template.paymentPlans}
            sections={template.sections}
            onChange={(paymentPlans) => setTemplate({ ...template, paymentPlans })}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="destructive" disabled={isSaving || isNew} onClick={handleDelete}>
          Usuń szablon
        </Button>
        <Button type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Zapisywanie…" : "Zapisz szablon"}
        </Button>
      </div>
    </div>
  );
}
