"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { InternalAcceptanceRulePackEditor } from "@/components/process/internal-acceptance-rule-pack-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { INTERNAL_ACCEPTANCE_CATEGORIES } from "@/lib/internal-acceptance/types";
import { getRulePacksBySourceType } from "@/lib/internal-acceptance/rule-pack-meta";
import { packCustomizationItemCount } from "@/lib/internal-acceptance/rule-pack-resolver";
import { getRulePackCustomization,
  withStaticItemPositions,
  type InternalAcceptanceConfigSectionKey,
  type InternalAcceptanceTemplateConfig,
  type InternalAcceptanceTemplateStaticItem,
} from "@/lib/internal-acceptance/template-config";

type RulePackListEntry = ReturnType<typeof getRulePacksBySourceType>[number];

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

function sortRulePacksByEnabledOrder(
  packs: RulePackListEntry[],
  enabledRulePackIds: string[],
) {
  return [...packs].sort((left, right) => {
    const leftIndex = enabledRulePackIds.indexOf(left.id);
    const rightIndex = enabledRulePackIds.indexOf(right.id);
    if (leftIndex === -1 && rightIndex === -1) {
      return 0;
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  });
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

  function moveConfigSection(sectionKey: InternalAcceptanceConfigSectionKey, direction: "up" | "down") {
    setConfig((current) => {
      const order = [...current.sectionOrder];
      const index = order.indexOf(sectionKey);
      if (index < 0) return current;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return current;
      [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
      return { ...current, sectionOrder: order };
    });
  }

  function updateSectionLabel(sectionKey: InternalAcceptanceConfigSectionKey, label: string) {
    setConfig((current) => ({
      ...current,
      sectionLabels: { ...current.sectionLabels, [sectionKey]: label },
    }));
  }

  function updatePackLabel(packId: string, label: string) {
    setConfig((current) => ({
      ...current,
      packLabels: { ...current.packLabels, [packId]: label.trim() },
    }));
  }

  function renderSectionHeader(
    sectionKey: InternalAcceptanceConfigSectionKey,
    description: string,
  ) {
    const orderIndex = config.sectionOrder.indexOf(sectionKey);
    return (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 flex-1 gap-2">
          <Field label="Nazwa listy w konfiguracji">
            <Input
              value={config.sectionLabels[sectionKey]}
              onChange={(event) => updateSectionLabel(sectionKey, event.target.value)}
            />
          </Field>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={orderIndex <= 0}
            onClick={() => moveConfigSection(sectionKey, "up")}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={orderIndex >= config.sectionOrder.length - 1}
            onClick={() => moveConfigSection(sectionKey, "down")}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  function renderRulePackList(
    packs: RulePackListEntry[],
    disabled: boolean,
  ) {
    if (!packs.length) {
      return <p className="text-sm text-muted">Brak pakietów w tej kategorii.</p>;
    }

    const orderedPacks = sortRulePacksByEnabledOrder(packs, config.enabledRulePackIds);

    return (
      <div className="grid gap-2">
        {orderedPacks.map((pack) => {
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
                    <Field label="Nazwa pakietu">
                      <Input
                        value={config.packLabels[pack.id] ?? pack.label}
                        onChange={(event) => updatePackLabel(pack.id, event.target.value)}
                      />
                    </Field>
                    <span className="mt-1 block text-xs text-muted">
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

  function renderConfigSection(sectionKey: InternalAcceptanceConfigSectionKey) {
    if (sectionKey === "static") {
      return (
        <Card key={sectionKey}>
          <CardContent className="grid gap-4 py-5">
            {renderSectionHeader(
              "static",
              "Ręcznie zdefiniowane kategorie i punkty — zawsze trafiają do checklisty w tej kolejności.",
            )}

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

                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={Boolean(item.requireDocumentation)}
                    onChange={(event) =>
                      updateStaticItem(item.id, {
                        requireDocumentation: event.target.checked,
                        documentationHint: event.target.checked ? item.documentationHint : undefined,
                      })
                    }
                  />
                  Wymagaj dokumentacji przy Spełnia
                </label>
                {item.requireDocumentation ? (
                  <Input
                    value={item.documentationHint ?? ""}
                    placeholder="Opis wymaganej dokumentacji (np. zdjęcie szafy rack)"
                    onChange={(event) =>
                      updateStaticItem(item.id, { documentationHint: event.target.value })
                    }
                  />
                ) : null}
              </div>
            ))}

            <Button type="button" variant="secondary" onClick={addStaticItem}>
              <Plus className="mr-1.5 h-4 w-4" />
              Dodaj punkt ręcznie
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (sectionKey === "company") {
      return (
        <Card key={sectionKey}>
          <CardContent className="grid gap-4 py-5">
            {renderSectionHeader(
              "company",
              "Standardowe zestawy QA — edytuj punkty w pakiecie, dodawaj własne lub wyłączaj zbędne.",
            )}
            {renderRulePackList(companyPacks, false)}
          </CardContent>
        </Card>
      );
    }

    if (sectionKey === "specification") {
      return (
        <Card key={sectionKey}>
          <CardContent className="grid gap-4 py-5">
            {renderSectionHeader(
              "specification",
              "Włączane tylko gdy zaznaczono „Reguły specyfikacji po słowach kluczowych (legacy)” powyżej.",
            )}
            {renderRulePackList(specificationPacks, !config.sources.specificationRulePacks)}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={sectionKey}>
        <CardContent className="grid gap-4 py-5">
          {renderSectionHeader(
            "agreement",
            "Opcjonalne pakiety rozbijające ustalenia na szczegółowe punkty — tylko gdy tytuł/treść ustalenia zawiera słowa kluczowe pakietu (np. VPN, tablet).",
          )}
          {renderRulePackList(agreementPacks, !config.sources.agreementRulePacks)}
        </CardContent>
      </Card>
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

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={config.sources.specificationCatalogItems}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  sources: { ...current.sources, specificationCatalogItems: event.target.checked },
                }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Checklisty z katalogu specyfikacji
              </span>
              <span className="mt-1 block text-xs text-muted">
                Dla każdej pozycji specyfikacji projektu powiązanej z katalogiem do odbioru trafiają
                punkty zdefiniowane przy tej pozycji katalogu. Pojawiają się na tablicy odbioru
                wewnętrznego w grupach według kategorii punktu (np. Oświetlenie, Rolety). Wymaga
                powiązania pozycji projektu z katalogiem oraz zdefiniowanych punktów w{" "}
                <Link href="/ustawienia/specyfikacja" className="text-accent hover:underline">
                  katalogu specyfikacji
                </Link>
                . Po zmianach kliknij „Odśwież” na tablicy odbioru w projekcie.
              </span>
            </span>
          </label>

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
                Jeden ogólny punkt na pozycję specyfikacji (legacy)
              </span>
              <span className="mt-1 block text-xs text-muted">
                Każda pozycja specyfikacji projektu staje się pojedynczym punktem kontroli bez rozbicia na
                checklistę katalogu.
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
                Reguły specyfikacji po słowach kluczowych (legacy)
              </span>
              <span className="mt-1 block text-xs text-muted">
                Starszy mechanizm pakietów (oświetlenie, KNX…) — preferuj checklisty z katalogu specyfikacji.
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
              <span className="block text-sm font-medium text-foreground">Ustalenia z projektu</span>
              <span className="mt-1 block text-xs text-muted">
                Każde ustalenie zaakceptowane lub oczekujące na klienta staje się osobnym punktem
                odbioru w grupie „Ustalenia i Akceptacje”. Bez słów kluczowych. Dodatkowe
                pakiety punktów poniżej działają opcjonalnie po dopasowaniu słów kluczowych.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {config.sectionOrder.map((sectionKey) => renderConfigSection(sectionKey))}

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
