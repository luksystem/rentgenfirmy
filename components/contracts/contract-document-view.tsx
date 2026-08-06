"use client";

import { Card, CardContent } from "@/components/ui/card";
import { computeFixedPriceRowNetValue } from "@/lib/service/fixed-price";
import {
  calculateContractTotals,
  calculatePaymentScheduleAmounts,
  calculateTableGrossTotal,
  calculateTableNetTotal,
} from "@/lib/contracts/totals";
import { isContractTableSection, isContractTextSection, type Contract } from "@/lib/contracts/types";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

/**
 * Treść dokumentu umowy — dane stron, sekcje (tekst/tabele), suma, harmonogram spłat i podpisy.
 * Współdzielone przez publiczną stronę podpisu (`ClientContractPage`) i podgląd w panelu admina
 * (`ContractPreviewDialog`), żeby klient i biuro zawsze widzieli dokładnie to samo.
 */
export function ContractDocumentView({
  contract,
  selectedOptionIds,
  onToggleOption,
}: {
  contract: Contract;
  selectedOptionIds: Set<string>;
  /** Gdy pominięte, checkboxy opcji są tylko do odczytu (podgląd bez interakcji). */
  onToggleOption?: (sectionId: string, checked: boolean) => void;
}) {
  const totals = calculateContractTotals(contract.sections, {
    optionOverrides: Object.fromEntries(Array.from(selectedOptionIds).map((id) => [id, true])),
  });
  const scheduleAmounts = calculatePaymentScheduleAmounts(contract.paymentSchedule, totals);

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-1 pt-5 text-sm text-muted">
          <p className="font-medium text-foreground">{contract.client.fullName || "—"}</p>
          {contract.client.companyName ? <p>{contract.client.companyName}</p> : null}
          {contract.client.nip ? <p>NIP: {contract.client.nip}</p> : null}
          {contract.client.location ? <p>{contract.client.location}</p> : null}
          {[contract.client.email, contract.client.phone].filter(Boolean).join(" · ")}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {contract.sections.map((section) => {
          if (isContractTextSection(section)) {
            return (
              <Card key={section.id}>
                <CardContent className="pt-5">
                  {section.title ? (
                    <p className={cn("font-semibold text-foreground", section.struck && "line-through text-muted")}>
                      {section.title}
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      "mt-1 whitespace-pre-line text-sm text-foreground/90",
                      section.struck && "line-through text-muted",
                    )}
                  >
                    {section.content}
                  </p>
                </CardContent>
              </Card>
            );
          }

          if (!isContractTableSection(section)) {
            return null;
          }

          const isOption = section.group === "option";
          const selected = isOption ? selectedOptionIds.has(section.id) : true;

          return (
            <Card key={section.id} className={cn(isOption && !selected && "opacity-70")}>
              <CardContent className="grid gap-3 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{section.title || "Tabela pozycji"}</p>
                    {section.description ? <p className="mt-1 text-sm text-muted">{section.description}</p> : null}
                  </div>
                  {isOption ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!onToggleOption}
                        onChange={(event) => onToggleOption?.(section.id, event.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      Opcja dodatkowa — dołącz do umowy
                    </label>
                  ) : null}
                </div>

                <div className="grid gap-2 text-sm">
                  {section.rows
                    .filter((row) => row.active)
                    .map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
                      >
                        <span className="text-foreground/90">
                          {row.name} <span className="text-muted">— {row.quantity} {row.unit}</span>
                        </span>
                        <span className="tabular-nums text-foreground">
                          {formatMoney(computeFixedPriceRowNetValue(row))} netto
                        </span>
                      </div>
                    ))}
                </div>

                <p className="text-sm text-muted">
                  Suma: <span className="font-semibold text-foreground">{formatMoney(calculateTableNetTotal(section))} netto</span>
                  {" · "}
                  <span className="font-semibold text-foreground">{formatMoney(calculateTableGrossTotal(section))} brutto</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-5">
          <p className="text-base font-semibold text-foreground">Wartość umowy: {formatMoney(totals.totalGross)} brutto</p>
          <p className="text-sm text-muted">(netto: {formatMoney(totals.totalNet)})</p>
        </CardContent>
      </Card>

      {contract.paymentSchedule.length > 0 ? (
        <Card>
          <CardContent className="grid gap-2 pt-5">
            <p className="font-semibold text-foreground">Harmonogram spłat</p>
            {scheduleAmounts.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground/90">
                  {item.label || "Rata"} <span className="text-muted">({item.percent}%)</span>
                  {item.note ? <span className="text-muted"> — {item.note}</span> : null}
                </span>
                <span className="tabular-nums font-medium text-foreground">{formatMoney(item.amountGross)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {contract.clientSignature || contract.companySignature ? (
        <Card>
          <CardContent className="grid gap-1 pt-5 text-sm text-muted">
            {contract.clientSignature ? (
              <p>
                Podpis klienta: {contract.clientSignature.signerName} — {formatDateTime(contract.clientSignature.signedAt)}
              </p>
            ) : null}
            {contract.companySignature ? (
              <p>
                Podpis firmy: {contract.companySignature.signerName} — {formatDateTime(contract.companySignature.signedAt)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
