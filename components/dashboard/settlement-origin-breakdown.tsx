"use client";

import type {
  SettlementOriginBreakdown,
  SettlementOriginGroup,
  SettlementOriginLine,
} from "@/lib/settlements/origin-breakdown";
import { cn, formatMoney } from "@/lib/utils";

function formatOriginAmount(line: SettlementOriginLine) {
  if (line.amountGross != null && Number.isFinite(line.amountGross)) {
    const net =
      line.amountNet != null && Number.isFinite(line.amountNet)
        ? ` · netto ${formatMoney(line.amountNet)}`
        : "";
    return `${formatMoney(line.amountGross)} brutto${net}`;
  }
  if (line.amountNet != null && Number.isFinite(line.amountNet)) {
    return `${formatMoney(line.amountNet)} netto`;
  }
  return "bez kwoty";
}

function toneClass(tone: SettlementOriginLine["tone"]) {
  if (tone === "accepted") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (tone === "pending") return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-border/70 bg-surface-muted/30 text-muted";
}

function OriginLineRow({ line }: { line: SettlementOriginLine }) {
  return (
    <li className="flex min-w-0 flex-col gap-1 rounded-lg border border-border/60 bg-surface/40 px-3 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{line.title}</p>
        <p className="mt-0.5 text-xs text-muted">
          {line.statusLabel}
          {line.inLedger ? " · w należnościach" : " · poza saldem rozliczeń"}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", toneClass(line.tone))}>
          {line.tone === "accepted" ? "Zaakceptowane" : line.tone === "pending" ? "Oczekuje" : "Baza"}
        </span>
        <p className="text-sm font-semibold tabular-nums text-foreground">{formatOriginAmount(line)}</p>
      </div>
    </li>
  );
}

function OriginGroupBlock({
  title,
  hint,
  group,
  emptyLabel,
}: {
  title: string;
  hint: string;
  group: SettlementOriginGroup;
  emptyLabel: string;
}) {
  const hasRows = group.accepted.length > 0 || group.pending.length > 0;
  if (!hasRows) {
    return (
      <div className="rounded-xl border border-border/60 bg-surface-muted/10 p-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border/60 bg-surface-muted/10 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
      </div>

      {group.accepted.length ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/90">
              Zaakceptowane
            </p>
            <p className="text-xs text-muted">
              łącznie {formatMoney(group.acceptedGrossTotal)} brutto
              {group.acceptedNetTotal > 0 ? ` · ${formatMoney(group.acceptedNetTotal)} netto` : ""}
            </p>
          </div>
          <ul className="grid gap-2">
            {group.accepted.map((line) => (
              <OriginLineRow key={line.id} line={line} />
            ))}
          </ul>
        </div>
      ) : null}

      {group.pending.length ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
              Oczekują na akceptację
            </p>
            <p className="text-xs text-muted">
              łącznie {formatMoney(group.pendingGrossTotal)} brutto
              {group.pendingNetTotal > 0 ? ` · ${formatMoney(group.pendingNetTotal)} netto` : ""}
            </p>
          </div>
          <ul className="grid gap-2">
            {group.pending.map((line) => (
              <OriginLineRow key={line.id} line={line} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function SettlementOriginBreakdownCard({
  breakdown,
}: {
  breakdown: SettlementOriginBreakdown;
}) {
  if (!breakdown.hasAnyExtra) {
    return null;
  }

  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-border/70 bg-surface-muted/15 p-3 sm:p-4">
      <div>
        <h3 className="page-section-subtitle text-sm">Skąd się biorą kwoty</h3>
        <p className="mt-1 text-xs text-muted">
          Umowa główna, zaakceptowane i oczekujące zmiany w projekcie oraz szybkie oferty. Pozycje
          „w należnościach” wchodzą do salda; oczekujące na akceptację są widoczne, ale jeszcze nie
          w bilansie.
        </p>
      </div>

      {breakdown.contract ? (
        <div className="rounded-xl border border-border/60 bg-surface/50 p-3">
          <OriginLineRow line={breakdown.contract} />
        </div>
      ) : null}

      <OriginGroupBlock
        title="Zmiany w projekcie"
        hint="Dodatkowe koszty po akceptacji klienta trafiają do należności."
        group={breakdown.changeRequests}
        emptyLabel="Brak zmian z kwotą w tym projekcie."
      />

      <OriginGroupBlock
        title="Szybkie oferty"
        hint="Zaakceptowane oferty serwisowe doliczane do rozliczenia projektu."
        group={breakdown.offers}
        emptyLabel="Brak ofert powiązanych z tym projektem."
      />
    </section>
  );
}
