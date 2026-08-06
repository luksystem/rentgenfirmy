"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useContractStore } from "@/store/contract-store";
import { cn, formatDate } from "@/lib/utils";

export function ContractTemplateList() {
  const templates = useContractStore((state) => state.templates);

  if (templates.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Brak szablonów umów. Użyj przycisku „Nowy szablon”, aby dodać pierwszy.
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {templates.map((template) => (
        <Card key={template.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-foreground">{template.name || "Bez nazwy"}</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  template.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-surface-muted text-muted",
                )}
              >
                {template.isActive ? "Aktywny" : "Nieaktywny"}
              </span>
            </div>
            {template.description ? <p className="mt-1 text-sm text-muted">{template.description}</p> : null}
            <p className="mt-0.5 text-xs text-muted">
              {template.sections.length} bloków treści · {template.paymentSchedule.length} rat ·{" "}
              {formatDate(template.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/umowy/nowa?templateId=${template.id}`}>Utwórz umowę</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/umowy/szablony/${template.id}`}>Edytuj</Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
