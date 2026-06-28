"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { InternalAcceptanceRulePackEditor } from "@/components/process/internal-acceptance-rule-pack-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { INTERNAL_ACCEPTANCE_CATEGORIES } from "@/lib/internal-acceptance/types";
import { getRulePacksBySourceType } from "@/lib/internal-acceptance/rule-pack-meta";
import { packCustomizationItemCount } from "@/lib/internal-acceptance/rule-pack-resolver";
import {
  getRulePackCustomization,
  withStaticItemPositions,
  type InternalAcceptanceTemplateConfig,
  type InternalAcceptanceTemplateStaticItem,
} from "@/lib/internal-acceptance/template-config";

type InternalAcceptanceTemplateEditorProps = {
  initialConfig: InternalAcceptanceTemplateConfig;
  onSave: (config: InternalAcceptanceTemplateConfig) => Promise<void>;
};

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Krytyczny" },
  { value: "normal", label: "Normalny" },
  { value: "optional", label: "Opcjonalny" },
] as const;

function moveStaticItem(
  items: InternalAcceptanceTemplateStaticItem[],
  index: number,
  direction: "up" | "down",
) {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }
  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return withStaticItemPositions(next);
}

export function InternalAcceptanceTemplateEditor({
  initialConfig,
  onSave,
}: InternalAcceptanceTemplateEditorProps) {
  const [config, setConfig] = useState(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null);

  const companyPacks = useMemo(() => getRulePacksBySourceType("company_standard"), []);
  const specificationPacks = useMemo(() => getRulePacksBySourceType("specification"), []);
  const agreementPacks = useMemo(() => getRulePacksBySourceType("agreement"), []);

  function toggleRulePack(packId: string, enabled: boolean) {
    setConfig((current) => {
      const enabledRulePackIds = enabled
        ? current.enabledRulePackIds.includes(packId)
          ? current.enabledRulePackIds
          : [...current.enabledRulePackIds, packId]
        : current.enabledRulePackIds.filter((entry) => entry !== packId);
      return { ...current, enabledRulePackIds };
    });
  }

  function moveRulePack(packId: string, direction: "up" | "down") {
    setConfig((current) => {
      const ordered = [...current.enabledRulePackIds];
      const index = ordered.indexOf(packId);
      if (index < 0) return current;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= ordered.length) return current;
      [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
      return { ...current, enabledRulePackIds: ordered };
    });
  }

  function updateStaticItem(
    itemId: string,
    patch: Partial<InternalAcceptanceTemplateStaticItem>,
  ) {
    setConfig((current) => ({
      ...current,
      staticItems: current.staticItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addStaticItem() {
    setConfig((current) => ({
      ...current,
      staticItems: withStaticItemPositions([
        ...current.staticItems,
        {
          id: crypto.randomUUID(),
          name: "Nowy punkt kontroli",
          description: "",
          category: "Inne",
          priority: "normal",
          mandatory: true,
          position: current.staticItems.length,
        },
      ]),
    }));
  }

  function removeStaticItem(itemId: string) {
    setConfig((current) => ({
      ...current,
      staticItems: withStaticItemPositions(
        current.staticItems.filter((item) => item.id !== itemId),
      ),
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const normalizedRulePackCustomizations = Object.fromEntries(
        Object.entries(config.rulePackCustomizations).map(([packId, customization]) => [
          packId,
          {
            ...customization,
            extraItems: withStaticItemPositions(customization.extraItems),
          },
        ]),
      );
      const normalized = {
        ...config,
        staticItems: withStaticItemPositions(config.staticItems),
        rulePackCustomizations: normalizedRulePackCustomizations,
      };
      await onSave(normalized);
      setConfig(normalized);
      setMessage("Konfiguracja odbioru zapisana.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu konfiguracji.");
    } finally {
      setIsSaving(false);
    }
  }

  function renderRulePackList(
    packs: ReturnType<typeof getRulePacksBySourceType>,
    disabled: boolean,
  ) {
    if (!packs.length) {
      return <p className="text-sm text-muted">Brak pakietów w tej kategorii.</p>;
    }

    return (
      <div className="grid gap-2">
        {packs.map((pack) => {
          const enabled = config.enabledRulePackIds.includes(pack.id);
          const orderIndex = config.enabledRulePackIds.indexOf(pack.id);
          const customization = getRulePackCustomization(config, pack.id);
          const activeItemCount = packCustomizationItemCount(pack.id, customization);
          const expanded = expandedPackId === pack.id;
          return (
            <div
              key={pack.id}
              className="rounded-xl border border-border/70 bg-surface-muted/20 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={enabled}
                    disabled={disabled}
                    onChange={(event) => toggleRulePack(pack.id, event.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{pack.label}</span>
                    <span className="block text-xs text-muted">
                      {activeItemCount} aktywnych punktów
                      {customization.extraItems.length
                        ? ` · ${customization.extraItems.length} własnych`
                        : ""}
                    </span>
                  </span>
                </label>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setExpandedPackId(expanded ? null : pack.id)}
                  >
                    {expanded ? (
                      <ChevronDown className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="mr-1 h-3.5 w-3.5" />
                    )}
                    Edytuj punkty
                  </Button>
                  {enabled ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={orderIndex <= 0}
                        onClick={() => moveRulePack(pack.id, "up")}
                        aria-label="Przesuń pakiet w górę"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={orderIndex >= config.enabledRulePackIds.length - 1}
                        onClick={() => moveRulePack(pack.id, "down")}
                        aria-label="Przesuń pakiet w dół"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              {expanded ? (
                <InternalAcceptanceRulePackEditor
                  packId={pack.id}
                  config={config}
                  onChange={setConfig}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Źródła z projektu</h2>
            <p className="mt-1 text-sm text-muted">
              Zaznacz, co ma być automatycznie dołączane do checklisty przy generowaniu w projekcie.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={config.sources.specificationItems}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  sources: { ...current.sources, specificationItems: event.target.checked },
                }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Pozycje aktualnej specyfikacji projektu
              </span>
              <span className="mt-1 block text-xs text-muted">
                Każda pozycja z aktywnej specyfikacji projektu stanie się osobnym punktem kontroli.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={config.sources.specificationRulePacks}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  sources: { ...current.sources, specificationRulePacks: event.target.checked },
                }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Reguły dopasowane do specyfikacji
              </span>
              <span className="mt-1 block text-xs text-muted">
                Pakiety punktów włączane, gdy tytuł/kategoria pozycji specyfikacji pasuje (np. oświetlenie, KNX).
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={config.sources.agreementRulePacks}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  sources: { ...current.sources, agreementRulePacks: event.target.checked },
                }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Reguły dopasowane do ustaleń</span>
              <span className="mt-1 block text-xs text-muted">
                Pakiety punktów włączane na podstawie ustaleń z klientem (zaakceptowanych i oczekujących).
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Stałe punkty szablonu</h2>
            <p className="mt-1 text-sm text-muted">
              Ręcznie zdefiniowane kategorie i punkty — zawsze trafiają do checklisty w tej kolejności.
            </p>
          </div>

          {config.staticItems.length === 0 ? (
            <p className="text-sm text-muted">Brak własnych punktów. Dodaj pierwszy poniżej.</p>
          ) : null}

          {config.staticItems.map((item, index) => (
            <div key={item.id} className="grid gap-3 rounded-xl border border-border/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Punkt {index + 1}</p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={index === 0}
                    onClick={() =>
                      setConfig((current) => ({
                        ...current,
                        staticItems: moveStaticItem(current.staticItems, index, "up"),
                      }))
                    }
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={index === config.staticItems.length - 1}
                    onClick={() =>
                      setConfig((current) => ({
                        ...current,
                        staticItems: moveStaticItem(current.staticItems, index, "down"),
                      }))
                    }
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => removeStaticItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nazwa punktu">
                  <Input
                    value={item.name}
                    onChange={(event) => updateStaticItem(item.id, { name: event.target.value })}
                  />
                </Field>
                <Field label="Kategoria">
                  <Input
                    value={item.category}
                    list={`ia-categories-${item.id}`}
                    onChange={(event) => updateStaticItem(item.id, { category: event.target.value })}
                  />
                  <datalist id={`ia-categories-${item.id}`}>
                    {INTERNAL_ACCEPTANCE_CATEGORIES.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </Field>
              </div>

              <Field label="Opis / kryterium">
                <Textarea
                  value={item.description}
                  onChange={(event) => updateStaticItem(item.id, { description: event.target.value })}
                  rows={2}
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Priorytet">
                  <Select
                    value={item.priority}
                    onChange={(event) =>
                      updateStaticItem(item.id, {
                        priority: event.target.value as InternalAcceptanceTemplateStaticItem["priority"],
                      })
                    }
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <label className="flex items-center gap-2 self-end rounded-xl border border-border/70 px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={item.mandatory}
                    onChange={(event) =>
                      updateStaticItem(item.id, { mandatory: event.target.checked })
                    }
                  />
                  Obowiązkowy punkt
                </label>
              </div>
            </div>
          ))}

          <Button type="button" variant="secondary" onClick={addStaticItem}>
            <Plus className="mr-1.5 h-4 w-4" />
            Dodaj punkt ręcznie
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Pakiety reguł firmy</h2>
            <p className="mt-1 text-sm text-muted">
              Standardowe zestawy QA — edytuj punkty w pakiecie, dodawaj własne lub wyłączaj zbędne.
            </p>
          </div>
          {renderRulePackList(companyPacks, false)}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Pakiety specyfikacji</h2>
            <p className="mt-1 text-sm text-muted">
              Włączane tylko gdy zaznaczono „Reguły dopasowane do specyfikacji” powyżej.
            </p>
          </div>
          {renderRulePackList(specificationPacks, !config.sources.specificationRulePacks)}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Pakiety ustaleń</h2>
            <p className="mt-1 text-sm text-muted">
              Włączane tylko gdy zaznaczono „Reguły dopasowane do ustaleń” powyżej.
            </p>
          </div>
          {renderRulePackList(agreementPacks, !config.sources.agreementRulePacks)}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
          {isSaving ? "Zapisywanie…" : "Zapisz konfigurację odbioru"}
        </Button>
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}
