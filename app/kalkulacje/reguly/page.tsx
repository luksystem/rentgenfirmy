"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RuleEditor } from "@/components/calculator/rule-editor";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { buildScope, evaluateRules } from "@/lib/calculator/rules-engine";
import { sampleCalculatorAnswers } from "@/lib/calculator/rules-sample-answers";
import {
  CALCULATOR_RULE_CATEGORIES,
  DEFAULT_CALCULATOR_RULES,
  type CalculatorRule,
  type CalculatorRuleCategory,
} from "@/lib/calculator/rules-types";
import { DEFAULT_CALCULATOR_SETTINGS, type CalculatorSettings } from "@/lib/calculator/settings";
import { fetchCalculatorRules, saveCalculatorRules } from "@/lib/supabase/calculator-rules-repository";
import { fetchCalculatorSettings } from "@/lib/supabase/calculator-settings-repository";
import { formatMoney } from "@/lib/utils";

const CATEGORY_LABELS: Record<CalculatorRuleCategory, string> = {
  baza: "Baza systemu",
  funkcjonalne: "Kategorie funkcjonalne",
  elektryka: "Instalacja elektryczna",
  dodatki: "Dodatki",
  inne_systemy: "Inne systemy",
  rabaty: "Rabaty i współczynniki globalne",
};

function emptyFlatRule(category: CalculatorRuleCategory): CalculatorRule {
  return {
    key: `${category}.nowaPozycja${Date.now()}`,
    category,
    label: "Nowa pozycja",
    gate: null,
    postMultipliers: [],
    notes: null,
    contributesToTotal: true,
    roundingGroup: null,
    kind: "flat",
    amount: 0,
  };
}

export default function CalculatorRulesPage() {
  const [rules, setRules] = useState<CalculatorRule[]>(DEFAULT_CALCULATOR_RULES);
  const [settings, setSettings] = useState<CalculatorSettings>(DEFAULT_CALCULATOR_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CalculatorRuleCategory | "all">("all");

  useEffect(() => {
    void Promise.all([fetchCalculatorRules(), fetchCalculatorSettings()])
      .then(([loadedRules, loadedSettings]) => {
        setRules(loadedRules);
        setSettings(loadedSettings);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać reguł."))
      .finally(() => setLoading(false));
  }, []);

  const preview = useMemo(() => {
    const answers = sampleCalculatorAnswers();
    const scope = buildScope(answers, settings);
    try {
      return evaluateRules(rules, scope);
    } catch {
      return null;
    }
  }, [rules, settings]);

  const knownVariables = useMemo(() => {
    const answers = sampleCalculatorAnswers();
    const scope = buildScope(answers, settings);
    const names = new Set(Object.keys(scope));
    for (const rule of rules) {
      names.add(rule.key.split(".").pop() ?? rule.key);
    }
    return names;
  }, [rules, settings]);

  function updateRule(index: number, next: CalculatorRule) {
    setRules((prev) => prev.map((r, i) => (i === index ? next : r)));
  }
  function deleteRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }
  function addRule(category: CalculatorRuleCategory) {
    setRules((prev) => [...prev, emptyFlatRule(category)]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveCalculatorRules(rules);
      setRules(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać reguł.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = rules.filter((rule) => {
    if (activeCategory !== "all" && rule.category !== activeCategory) return false;
    if (search.trim() === "") return true;
    const q = search.toLowerCase();
    return (
      rule.label.toLowerCase().includes(q) ||
      rule.key.toLowerCase().includes(q) ||
      (rule.notes ?? "").toLowerCase().includes(q)
    );
  });

  const grouped = CALCULATOR_RULE_CATEGORIES.map((category) => ({
    category,
    items: filtered.filter((rule) => rule.category === category),
  })).filter((group) => group.items.length > 0);

  if (loading) {
    return <p className="text-sm text-muted">Wczytywanie reguł…</p>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Sprzedaż"
        title="Reguły cennika kalkulatora"
        description="Logika liczenia oferty jako dane, edytowalne tutaj — bez zmian w kodzie. Podgląd liczy się na przykładowych danych testowych, nie na prawdziwej ofercie."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/kalkulacje/ustawienia">Stawki i cenniki</Link>
            </Button>
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Zapisywanie…" : "Zapisz"}
            </Button>
          </div>
        }
      />

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-surface-elevated/95 px-4 py-3 shadow-soft">
        <p className="text-sm text-muted">Suma oferty na danych testowych (podgląd, nie prawdziwa cena)</p>
        <p className="text-lg font-bold tabular-nums text-accent">
          {preview ? `${formatMoney(preview.total)} netto` : "błąd w jednej z formuł — sprawdź czerwone pozycje"}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Szukaj pozycji, klucza lub notatki…"
          className="max-w-xs"
        />
        <Select
          value={activeCategory}
          onChange={(event) => setActiveCategory(event.target.value as CalculatorRuleCategory | "all")}
          className="w-56"
        >
          <option value="all">Wszystkie kategorie</option>
          {CALCULATOR_RULE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-8">
        {grouped.map((group) => (
          <section key={group.category}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">{CATEGORY_LABELS[group.category]}</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => addRule(group.category)}>
                + Dodaj regułę
              </Button>
            </div>
            <div className="grid gap-2">
              {group.items.map((rule) => {
                const index = rules.indexOf(rule);
                return (
                  <RuleEditor
                    key={rule.key}
                    rule={rule}
                    onChange={(next) => updateRule(index, next)}
                    onDelete={() => deleteRule(index)}
                    previewValue={preview?.valuesByKey[rule.key]}
                    knownVariables={knownVariables}
                  />
                );
              })}
            </div>
          </section>
        ))}
        {grouped.length === 0 ? <p className="text-sm text-muted">Brak pozycji pasujących do wyszukiwania.</p> : null}
      </div>
    </>
  );
}
