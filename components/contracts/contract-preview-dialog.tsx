"use client";

import { useEffect, useMemo, useState } from "react";
import { ContractDocumentView } from "@/components/contracts/contract-document-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resolveCompanyProfileDocument, type CompanyProfileDocument } from "@/lib/company/company-profile-document";
import { contractRowSelectionKey } from "@/lib/contracts/totals";
import {
  emptyContractVatDeclaration,
  isContractTableSection,
  type Contract,
  type ContractVatDeclaration,
} from "@/lib/contracts/types";
import { fetchCompanyProfile } from "@/lib/supabase/company-profile-repository";

/**
 * Podgląd umowy dokładnie tak, jak zobaczy ją klient — reużywa `ContractDocumentView` z
 * publicznej strony podpisu. Zaznaczenie opcji/deklaracja VAT tutaj jest tylko lokalnym
 * podglądem (nie zapisuje się do umowy) — domyślnie odzwierciedla to, co jest dziś zapisane w
 * `contract.sections`/`contract.vatDeclaration`.
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
  const initialSelected = useMemo(() => {
    const keys = new Set<string>();
    for (const section of contract.sections) {
      if (!isContractTableSection(section) || section.group !== "option") {
        continue;
      }
      if (section.category === "dodatki") {
        for (const rowId of section.selectedRowIds) {
          keys.add(contractRowSelectionKey(section.id, rowId));
        }
      } else if (section.selected) {
        keys.add(section.id);
      }
    }
    return keys;
  }, [contract.sections]);
  const [selectedKeys, setSelectedKeys] = useState(initialSelected);
  const [company, setCompany] = useState<CompanyProfileDocument | null>(null);
  const initialPlanId = contract.selectedPaymentPlanId ?? contract.paymentPlans[0]?.id ?? null;
  const [selectedPaymentPlanId, setSelectedPaymentPlanId] = useState(initialPlanId);
  const [vatDeclaration, setVatDeclaration] = useState<ContractVatDeclaration>(
    contract.vatDeclaration ?? emptyContractVatDeclaration(),
  );

  useEffect(() => {
    if (!open || company) {
      return;
    }
    void fetchCompanyProfile()
      .then((profile) => setCompany(resolveCompanyProfileDocument(profile)))
      .catch(() => undefined);
  }, [open, company]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setSelectedKeys(initialSelected);
          setSelectedPaymentPlanId(initialPlanId);
          setVatDeclaration(contract.vatDeclaration ?? emptyContractVatDeclaration());
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Podgląd umowy — {contract.title || "bez tytułu"}</DialogTitle>
        </DialogHeader>
        <p className="mb-3 text-xs text-muted">
          Tak zobaczy umowę klient. Zaznaczanie opcji i deklaracja VAT poniżej służą tylko do podglądu — nie
          zapisują wyboru.
        </p>
        <ContractDocumentView
          contract={contract}
          selectedKeys={selectedKeys}
          company={company}
          selectedPaymentPlanId={selectedPaymentPlanId}
          onSelectPaymentPlan={setSelectedPaymentPlanId}
          onToggleSelection={(key, checked) => {
            setSelectedKeys((prev) => {
              const next = new Set(prev);
              if (checked) {
                next.add(key);
              } else {
                next.delete(key);
              }
              return next;
            });
          }}
          vatDeclaration={vatDeclaration}
          onChangeVatDeclaration={setVatDeclaration}
        />
      </DialogContent>
    </Dialog>
  );
}
