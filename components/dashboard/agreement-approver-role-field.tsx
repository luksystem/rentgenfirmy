"use client";

import { Field, Input, Select } from "@/components/ui/input";
import type { AgreementApproverRoleInput } from "@/lib/dashboard/agreement-collaboration-types";
import {
  findProjectTradeByRoleLabel,
  formatProjectTradeRoleLabel,
  type ProjectTrade,
} from "@/lib/dashboard/trade-types";

const CUSTOM_SOURCE = "__custom__";

function resolveTradeSource(role: AgreementApproverRoleInput, trades: ProjectTrade[]) {
  if (role.isClientRole) {
    return CUSTOM_SOURCE;
  }
  const matched = findProjectTradeByRoleLabel(trades, role.label);
  return matched?.id ?? CUSTOM_SOURCE;
}

export function AgreementApproverRoleField({
  role,
  trades,
  disabled,
  onChange,
}: {
  role: AgreementApproverRoleInput;
  trades: ProjectTrade[];
  disabled?: boolean;
  onChange: (patch: Partial<AgreementApproverRoleInput>) => void;
}) {
  if (role.isClientRole) {
    return <Input value={role.label} disabled className="min-w-0 flex-1" />;
  }

  const source = resolveTradeSource(role, trades);
  const selectedTrade = trades.find((trade) => trade.id === source);

  return (
    <div className="grid min-w-0 flex-1 gap-2">
      <Select
        value={source}
        disabled={disabled}
        className={source === CUSTOM_SOURCE ? "text-muted" : undefined}
        onChange={(event) => {
          const nextSource = event.target.value;
          if (nextSource === CUSTOM_SOURCE) {
            onChange({ label: "" });
            return;
          }
          const trade = trades.find((entry) => entry.id === nextSource);
          if (trade) {
            onChange({ label: formatProjectTradeRoleLabel(trade) });
          }
        }}
      >
        <option value={CUSTOM_SOURCE}>— Wpisz ręcznie —</option>
        {trades.length === 0 ? (
          <option value="" disabled>
            Brak branż — dodaj w zakładce Branże
          </option>
        ) : null}
        {trades.map((trade) => (
          <option key={trade.id} value={trade.id}>
            {formatProjectTradeRoleLabel(trade)}
          </option>
        ))}
      </Select>

      {source === CUSTOM_SOURCE ? (
        <Field label="Nazwa roli">
          <Input
            value={role.label}
            disabled={disabled}
            placeholder="np. Firma od klimatyzacji"
            className="min-w-0"
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </Field>
      ) : selectedTrade ? (
        <p className="rounded-lg border border-border/60 bg-surface-muted/20 px-3 py-2 text-xs text-muted">
          {[selectedTrade.contactName, selectedTrade.email, selectedTrade.phone]
            .filter(Boolean)
            .join(" · ")}
          {selectedTrade.description ? (
            <span className="mt-1 block text-foreground/80">{selectedTrade.description}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
