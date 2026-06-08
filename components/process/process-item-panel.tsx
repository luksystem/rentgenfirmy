"use client";

import { CheckCircle2, FileCheck2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PROCESS_ITEM_KIND_LABELS,
  type ProcessItem,
  type ProcessItemCompletion,
} from "@/lib/process/types";
import { cn, formatDate } from "@/lib/utils";

const kindIcon = {
  checklist: CheckCircle2,
  protocol: FileCheck2,
  settlement: Receipt,
} as const;

type ProcessItemPanelProps = {
  item: ProcessItem | null;
  completion?: ProcessItemCompletion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interactive?: boolean;
  onToggleComplete?: (completed: boolean) => void;
};

export function ProcessItemPanel({
  item,
  completion,
  open,
  onOpenChange,
  interactive = false,
  onToggleComplete,
}: ProcessItemPanelProps) {
  if (!item) {
    return null;
  }

  const completed = Boolean(completion);
  const Icon = kindIcon[item.kind];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 shrink-0 text-accent" />
            {item.title}
          </DialogTitle>
          <DialogDescription>{PROCESS_ITEM_KIND_LABELS[item.kind]}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {item.kind === "checklist" ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Checklista</p>
              <p className="mt-2 text-sm text-muted">
                Tutaj uzupełnisz punkty do odhaczenia. Pełna edycja listy kontrolnej będzie dostępna
                w kolejnej wersji.
              </p>
              <ul className="mt-3 grid gap-2 text-sm text-muted">
                <li className="rounded-lg border border-dashed border-border/80 px-3 py-2">
                  + Dodaj punkt checklisty
                </li>
              </ul>
            </div>
          ) : null}

          {item.kind === "protocol" ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Protokół odbioru</p>
              <p className="mt-2 text-sm text-muted">
                Formularz protokołu z podpisem klienta będzie dostępny tutaj. Na razie możesz oznaczyć
                protokół jako ukończony po jego wypełnieniu poza systemem.
              </p>
              <div className="mt-4 rounded-lg border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted">
                Pole podpisu — wkrótce
              </div>
            </div>
          ) : null}

          {item.kind === "settlement" ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Rozliczenie</p>
              <p className="mt-2 text-sm text-muted">
                Powiązanie z ofertą serwisową i rozliczeniem kosztów będzie dostępne tutaj. Na razie
                oznacz element jako ukończony po rozliczeniu.
              </p>
            </div>
          ) : null}

          {completed ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
              <p className="font-medium text-emerald-200">Ukończono</p>
              <p className="mt-1 text-muted">
                {formatDate(completion?.completedAt)}
                {completion?.completedBy ? ` · ${completion.completedBy}` : ""}
              </p>
            </div>
          ) : null}

          {interactive ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={completed ? "secondary" : "default"}
                onClick={() => onToggleComplete?.(!completed)}
              >
                {completed ? "Cofnij ukończenie" : "Oznacz jako ukończone"}
              </Button>
            </div>
          ) : (
            <p
              className={cn(
                "text-sm",
                completed ? "text-emerald-300" : "text-muted",
              )}
            >
              {completed ? "Element ukończony" : "Element oczekuje na realizację"}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
