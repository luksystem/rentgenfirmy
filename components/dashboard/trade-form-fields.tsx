"use client";

import { useMemo } from "react";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { ProjectTradeInput } from "@/lib/dashboard/trade-types";
import type { TradeCatalogItem } from "@/lib/field-options";
import { tradeCatalogItemToProjectTradeInput } from "@/lib/trades/catalog-location";
import {
  companiesForTrade,
  companyItemToCatalogShape,
  formatCatalogCompanyLabel,
  tradeCatalogEntryKey,
  uniqueTradeNames,
} from "@/lib/trades/catalog-utils";
import type { TradeCompanyItem } from "@/lib/trades/company-types";
import { cn } from "@/lib/utils";

export function emptyTradeInput(): ProjectTradeInput {
  return {
    name: "",
    company: "",
    contactName: "",
    email: "",
    phone: "",
    description: "",
  };
}

function applyCatalogItem(form: ProjectTradeInput, item: TradeCatalogItem): ProjectTradeInput {
  const fromCatalog = tradeCatalogItemToProjectTradeInput(item);
  return {
    ...form,
    ...fromCatalog,
    company: form.company?.trim() ? form.company : fromCatalog.company,
    contactName: form.contactName?.trim() ? form.contactName : fromCatalog.contactName,
    email: form.email?.trim() ? form.email : fromCatalog.email,
    phone: form.phone?.trim() ? form.phone : fromCatalog.phone,
    description: form.description?.trim() ? form.description : fromCatalog.description,
  };
}

export function TradeFormFields({
  form,
  onChange,
  categories = [],
  companyPool = [],
}: {
  form: ProjectTradeInput;
  onChange: (next: ProjectTradeInput) => void;
  categories?: TradeCatalogItem[];
  companyPool?: TradeCompanyItem[];
}) {
  const tradeNames = useMemo(() => {
    const names = uniqueTradeNames(categories);
    const current = form.name.trim();
    if (
      current &&
      !names.some((name) => name.toLowerCase() === current.toLowerCase())
    ) {
      return [...names, current].sort((a, b) => a.localeCompare(b, "pl"));
    }
    return names;
  }, [categories, form.name]);
  const isNewTradeCategory =
    Boolean(form.name.trim()) &&
    !categories.some(
      (entry) => entry.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
    );
  const companiesForSelectedTrade = useMemo(
    () => (form.name.trim() ? companiesForTrade(form.name, companyPool) : []),
    [companyPool, form.name],
  );
  const companyQuery = (form.company ?? "").trim().toLowerCase();
  const companySuggestions = useMemo(() => {
    if (!form.name.trim()) {
      return companyPool.map(companyItemToCatalogShape);
    }
    if (!companyQuery) {
      return companiesForSelectedTrade;
    }
    return companiesForSelectedTrade.filter((item) =>
      formatCatalogCompanyLabel(item).toLowerCase().includes(companyQuery),
    );
  }, [companiesForSelectedTrade, companyPool, companyQuery, form.name]);

  return (
    <div className="grid gap-3">
      {tradeNames.length > 0 ? (
        <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Branża z katalogu</p>
          <div className="flex flex-wrap gap-1.5">
            {tradeNames.map((tradeName) => (
              <button
                key={tradeName}
                type="button"
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  form.name.trim().toLowerCase() === tradeName.trim().toLowerCase()
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground",
                )}
                onClick={() => {
                  const category = categories.find(
                    (entry) => entry.name.trim().toLowerCase() === tradeName.trim().toLowerCase(),
                  );
                  onChange({
                    ...form,
                    name: tradeName,
                    company: "",
                    description: category?.description?.trim() || form.description,
                  });
                }}
              >
                {tradeName}
              </button>
            ))}
          </div>
          {isNewTradeCategory ? (
            <p className="text-xs text-muted">
              „{form.name.trim()}” to nowa branża — po zapisaniu wykonawcy trafi do katalogu i będzie
              podpowiadana przy kolejnych dodaniach.
            </p>
          ) : null}
        </div>
      ) : null}

      {companiesForSelectedTrade.length > 0 ? (
        <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Firmy w branży „{form.name}”
          </p>
          <div className="flex flex-wrap gap-1.5">
            {companiesForSelectedTrade.map((item) => (
              <button
                key={tradeCatalogEntryKey(item)}
                type="button"
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  form.company === item.company && form.name === item.name
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground",
                )}
                onClick={() => onChange(applyCatalogItem(form, item))}
              >
                {formatCatalogCompanyLabel(item)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            Wybierz firmę z bazy branży lub wpisz nową — trafi do wspólnej bazy i będzie podpowiadana
            w kolejnych projektach.
          </p>
        </div>
      ) : null}

      <Field label="Branża *">
        <Input
          value={form.name}
          placeholder="np. Klimatyzacja, Elektryka albo nowa nazwa (np. Ogród)"
          list="trade-catalog-suggestions"
          onChange={(event) => {
            const nextName = event.target.value;
            const category = categories.find(
              (entry) => entry.name.trim().toLowerCase() === nextName.trim().toLowerCase(),
            );
            onChange({
              ...form,
              name: nextName,
              company:
                form.name.trim().toLowerCase() === nextName.trim().toLowerCase() ? form.company : "",
              description: category?.description?.trim() || form.description,
            });
          }}
        />
        {tradeNames.length > 0 ? (
          <datalist id="trade-catalog-suggestions">
            {tradeNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        ) : null}
        {isNewTradeCategory ? (
          <p className="mt-1 text-xs text-muted">
            Nowa branża zostanie dodana do katalogu przy zapisaniu wykonawcy.
          </p>
        ) : null}
      </Field>

      <Field label="Firma wykonawcy">
        <Input
          value={form.company ?? ""}
          placeholder="Wybierz z bazy branży lub wpisz nową firmę dla tego klienta"
          list="trade-company-suggestions"
          onChange={(event) => {
            const nextCompany = event.target.value;
            const match = companiesForSelectedTrade.find(
              (item) => (item.company ?? "").toLowerCase() === nextCompany.trim().toLowerCase(),
            );
            if (match) {
              onChange(applyCatalogItem({ ...form, company: nextCompany }, match));
              return;
            }
            onChange({ ...form, company: nextCompany });
          }}
        />
        {companySuggestions.length > 0 ? (
          <datalist id="trade-company-suggestions">
            {companySuggestions.map((item) => (
              <option key={tradeCatalogEntryKey(item)} value={item.company ?? ""} />
            ))}
          </datalist>
        ) : null}
      </Field>

      {companyQuery && companySuggestions.length > 0 && companySuggestions.length <= 8 ? (
        <div className="flex flex-wrap gap-1.5">
          {companySuggestions.map((item) => (
            <button
              key={`company-suggestion-${tradeCatalogEntryKey(item)}`}
              type="button"
              className="rounded-lg border border-border/70 px-2 py-1 text-left text-xs text-muted hover:border-accent/30 hover:text-foreground"
              onClick={() => onChange(applyCatalogItem(form, item))}
            >
              <span className="font-medium text-foreground">{formatCatalogCompanyLabel(item)}</span>
              <span className="text-muted"> · {item.name}</span>
            </button>
          ))}
        </div>
      ) : null}
      <Field label="Osoba kontaktowa">
        <Input
          value={form.contactName ?? ""}
          placeholder="Imię i nazwisko"
          onChange={(event) => onChange({ ...form, contactName: event.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="E-mail">
          <Input
            type="email"
            value={form.email ?? ""}
            onChange={(event) => onChange({ ...form, email: event.target.value })}
          />
        </Field>
        <Field label="Telefon">
          <Input
            type="tel"
            value={form.phone ?? ""}
            onChange={(event) => onChange({ ...form, phone: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Zakres prac / opis">
        <Textarea
          value={form.description ?? ""}
          rows={3}
          placeholder="Krótki opis tego, co ta branża wykona w projekcie…"
          onChange={(event) => onChange({ ...form, description: event.target.value })}
        />
      </Field>
    </div>
  );
}
