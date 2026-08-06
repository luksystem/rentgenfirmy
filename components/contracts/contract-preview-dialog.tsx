"use client";

import { useMemo, useState } from "react";
import { ContractDocumentView } from "@/components/contracts/contract-document-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isContractTableSection, type Contract } from "@/lib/contracts/types";

/**
 * Podgląd umowy dokładnie tak, jak zobaczy ją klient — reużywa `ContractDocumentView` z
 * publicznej strony podpisu. Zaznaczenie opcji tutaj jest tylko lokalnym podglądem (nie zapisuje
 * się do umowy) — domyślnie odzwierciedla to, co jest dziś zapisane w `contract.sections`.
 */
export function ContractPreviewDialog({
  open,
  onOpenChange,
  contract,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
}) {
  const initialSelected = useMemo(
    () =>
      new Set(
        contract.sections
          .filter((section) => isContractTableSection(section) && section.group === "option" && section.selected)
          .map((section) => section.id),
      ),
    [contract.sections],
  );
  const [selectedOptionIds, setSelectedOptionIds] = useState(initialSelected);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setSelectedOptionIds(initialSelected);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Podgląd umowy — {contract.title || "bez tytułu"}</DialogTitle>
        </DialogHeader>
        <p className="mb-3 text-xs text-muted">
          Tak zobaczy umowę klient. Zaznaczanie opcji poniżej służy tylko do podglądu — nie zapisuje wyboru.
        </p>
        <ContractDocumentView
          contract={contract}
          selectedOptionIds={selectedOptionIds}
          onToggleOption={(sectionId, checked) => {
            setSelectedOptionIds((prev) => {
              const next = new Set(prev);
              if (checked) {
                next.add(sectionId);
              } else {
                next.delete(sectionId);
              }
              return next;
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
