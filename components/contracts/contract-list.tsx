"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calculateContractTotals } from "@/lib/contracts/totals";
import { CONTRACT_STATUS_LABELS, type ContractStatus } from "@/lib/contracts/types";
import { useContractStore } from "@/store/contract-store";
import { cn, formatDate, formatMoney } from "@/lib/utils";

// Ten sam kolor dla statusów dzielących uproszczoną etykietę (Wysłana / Podpisana), żeby
// odznaka koloru nigdy nie kłóciła się z widocznym tekstem.
const STATUS_TONE: Record<ContractStatus, string> = {
  draft: "bg-surface-muted text-muted",
  sent: "bg-sky-500/15 text-sky-300",
  negotiating: "bg-sky-500/15 text-sky-300",
  signed_client: "bg-emerald-500/15 text-emerald-300",
  signed_both: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
  expired: "bg-rose-500/10 text-rose-300",
};

export function ContractList() {
  const contracts = useContractStore((state) => state.contracts);
  const removeContract = useContractStore((state) => state.removeContract);

  const rows = useMemo(
    () =>
      contracts.map((contract) => ({
        contract,
        totals: calculateContractTotals(contract.sections),
      })),
    [contracts],
  );

  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Brak umów. Użyj przycisku „Nowa umowa”, aby utworzyć pierwszą.
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map(({ contract, totals }) => (
        <Card key={contract.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-foreground">{contract.title || "Umowa bez tytułu"}</p>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[contract.status])}>
                {CONTRACT_STATUS_LABELS[contract.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{contract.client.fullName || "Brak klienta"}</p>
            <p className="mt-0.5 text-xs text-muted">
              {formatDate(contract.createdAt)} · Wartość: {formatMoney(totals.totalGross)} brutto
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/umowy/${contract.id}`}>Edytuj</Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (!window.confirm("Usunąć tę umowę?")) {
                  return;
                }
                try {
                  await removeContract(contract.id);
                } catch {
                  window.alert("Nie udało się usunąć umowy.");
                }
              }}
            >
              Usuń
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
