"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BlockerReasonsOptionsEditor,
  FieldOptionsEditor,
  FlowStatusesOptionsEditor,
  InterruptionTypesOptionsEditor,
} from "@/components/field-options-editor";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PROJECT_STRING_FIELD_OPTION_KEYS,
  CATALOG_FIELD_OPTION_KEYS,
  type FieldOptions,
  type StringListFieldOptionKey,
} from "@/lib/field-options";
import {
  DEFAULT_ACTIVATE_WITHIN_DAYS,
  DEFAULT_DEACTIVATE_AFTER_DAYS,
  type ProjectActivitySettings,
} from "@/lib/project-activity/settings";
import { PROJECT_RULES } from "@/lib/project-rules";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

export default function SettingsPage() {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const updateFieldOptions = useAppStore((state) => state.updateFieldOptions);
  const projectActivitySettings = useAppStore((state) => state.projectActivitySettings);
  const setProjectActivitySettings = useAppStore((state) => state.setProjectActivitySettings);
  const isSaving = useAppStore((state) => state.isSaving);
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const [draft, setDraft] = useState<FieldOptions>(fieldOptions);
  const [activityDraft, setActivityDraft] =
    useState<ProjectActivitySettings>(projectActivitySettings);
  const [saved, setSaved] = useState(false);
  const [activitySaving, setActivitySaving] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activitySaved, setActivitySaved] = useState(false);

  useEffect(() => {
    setDraft(fieldOptions);
  }, [fieldOptions]);

  useEffect(() => {
    setActivityDraft(projectActivitySettings);
  }, [projectActivitySettings]);

  function updateList(key: StringListFieldOptionKey, items: string[]) {
    setDraft((current) => ({
      ...current,
      [key]: items.map((item) => item.trim()).filter(Boolean),
    }));
    setSaved(false);
  }

  function updateFlowStatuses(statuses: FieldOptions["flowStatuses"]) {
    setDraft((current) => ({
      ...current,
      flowStatuses: statuses
        .map((status) => ({
          name: status.name.trim(),
          isInProgress: status.isInProgress,
          isClosed: status.isClosed,
          isWaiting: status.isWaiting,
        }))
        .filter((status) => status.name),
    }));
    setSaved(false);
  }

  function updateBlockerReasons(reasons: FieldOptions["blockerReasons"]) {
    setDraft((current) => ({
      ...current,
      blockerReasons: reasons
        .map((item) => ({
          name: item.name.trim(),
          isInternal: item.isInternal,
          isExternal: item.isExternal,
        }))
        .filter((item) => item.name),
    }));
    setSaved(false);
  }

  function updateInterruptionTypes(types: FieldOptions["interruptionTypes"]) {
    setDraft((current) => ({
      ...current,
      interruptionTypes: types
        .map((item) => ({
          name: item.name.trim(),
          suggestion: item.suggestion.trim(),
        }))
        .filter((item) => item.name),
    }));
    setSaved(false);
  }

  async function handleSave() {
    await updateFieldOptions(draft);
    setSaved(true);
  }

  async function handleSaveActivitySettings() {
    setActivitySaving(true);
    setActivityError(null);
    setActivitySaved(false);
    try {
      const response = await fetch("/api/settings/project-activity", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: activityDraft }),
      });
      const payload = (await response.json()) as {
        settings?: ProjectActivitySettings;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać ustawień aktywności.");
      }
      if (payload.settings) {
        setProjectActivitySettings(payload.settings);
        setActivityDraft(payload.settings);
      }
      if (payload.settings?.autoDetectActiveProjects) {
        const { fetchProjects } = await import("@/lib/supabase/repository");
        const projects = await fetchProjects();
        useAppStore.setState({ projects });
      }
      setActivitySaved(true);
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : "Błąd zapisu.");
    } finally {
      setActivitySaving(false);
    }
  }


  return (
    <>
      <PageHeader
        eyebrow="Konfiguracja"
        title="Ustawienia pól"
        description="Edytuj listy rozwijane używane w projektach i przerwaniach. Zmiany zapisują się w Supabase i obowiązują dla całego zespołu."
        action={
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Zapisywanie..." : "Zapisz ustawienia"}
          </Button>
        }
      />

      {saved ? (
        <Card className="panel-success mb-4 border">
          <CardContent className="py-3 text-sm text-emerald-300">
            Ustawienia zostały zapisane.
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Rozliczenia serwisowe — stawki</p>
            <p className="mt-1 text-sm text-muted">
              Stawki robocizny, dojazdu, strefy km oraz dopłata CAFE C/A po gwarancji w wycenie AI
              zgłoszeń klienta.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/oferty/ustawienia">Otwórz ustawienia stawek</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Firma</p>
            <p className="mt-1 text-sm text-muted">
              Nazwa, adres, NIP, telefon i logo w stopkach ofert oraz raportów.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/firma">Otwórz dane firmy</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Powiadomienia push</p>
            <p className="mt-1 text-sm text-muted">
              Włącz powiadomienia systemowe na tym urządzeniu, wyślij test i zarządzaj subskrypcją.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/powiadomienia">Otwórz powiadomienia push</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Ustawienia e-mail</p>
            <p className="mt-1 text-sm text-muted">
              Kiedy wysyłać e-mail / push / SMS, szablony, branding i test wysyłki.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/email">Otwórz ustawienia e-mail</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Wysyłki SMS</p>
            <p className="mt-1 text-sm text-muted">
              Reguły automatycznej wysyłki SMS, treści wiadomości i test ręczny.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/sms">Otwórz wysyłki SMS</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Katalog branż</p>
            <p className="mt-1 text-sm text-muted">
              Standardowe branże z mapą protokołów komunikacyjnych i domyślnym opisem zakresu.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/branze">Otwórz katalog branż</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Katalog specyfikacji i odbiór wewnętrzny</p>
            <p className="mt-1 text-sm text-muted">
              Edytuj pozycje konfiguratora specyfikacji (Oświetlenie, HVAC…) i przypisane checklisty QA.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/specyfikacja">Otwórz katalog</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Moja praca — Dostępność / Urlopy</p>
            <p className="mt-1 text-sm text-muted">
              Typy dostępności (urlop wypoczynkowy, zwolnienie lekarskie...) i wzór karty urlopowej PDF.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/urlopy">Otwórz ustawienia urlopów</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Oceny miesięczne</p>
            <p className="mt-1 text-sm text-muted">
              Widoczność oceny przełożonego dla pracownika po złożeniu obu ocen za dany miesiąc.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/oceny-miesieczne">Otwórz ustawienia ocen</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Czas pracy — kategorie</p>
            <p className="mt-1 text-sm text-muted">
              Kategorie wybierane przy zapisie czasu i powiązywane z deklaracją godzin w budżecie projektu.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/czas-pracy">Otwórz kategorie czasu</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border border-border/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="font-medium text-foreground">Plan Zasobów — słowniki</p>
            <p className="mt-1 text-sm text-muted">
              Role operacyjne, kompetencje, zespoły, obszary, typy pracy, statusy, ryzyka, nieobecności i budżety.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/ustawienia/plan-zasobow">Otwórz słowniki</Link>
          </Button>
        </CardContent>
      </Card>

      {isAdministrator ? (
        <Card className="mb-6 border border-border/80">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium text-foreground">Uprawnienia ról</p>
              <p className="mt-1 text-sm text-muted">
                Macierz dostępu do menu i akcji (podgląd, tworzenie, edycja…) dla wszystkich ról:
                administrator, manager, instalator, office, podwykonawca, klient, gość.
              </p>
            </div>
            <Button variant="secondary" asChild>
              <Link href="/ustawienia/uprawnienia">Otwórz manager uprawnień</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6 border border-border bg-surface-muted">
        <CardContent className="grid gap-3 py-4 text-sm text-muted">
          <p className="font-semibold text-foreground">Zależności flag</p>
          <ul className="grid list-disc gap-2 pl-5">
            <li>
              <strong>Status przepływu</strong> — kategoria: W trakcie / Oczekujące / Zamknięty
              (ustawiana poniżej).
            </li>
            <li>
              <strong>Aktywny</strong> (checkbox w projekcie) — {PROJECT_RULES.activeField}
            </li>
            <li>
              <strong>Do zamknięcia</strong> — {PROJECT_RULES.closingView}
            </li>
            <li>
              <strong>Oczekujące</strong> (widok) — {PROJECT_RULES.waitingView}
            </li>
            <li>
              <strong>Aktywny</strong> — {PROJECT_RULES.activeField}
            </li>
            <li>
              <strong>Bez kontaktu</strong> — {PROJECT_RULES.noContactView}
            </li>
            <li>
              <strong>Powód blokady</strong> — {PROJECT_RULES.blockerFault}
            </li>
          </ul>
        </CardContent>
      </Card>

      <section className="grid gap-6">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Projekty</h2>
          <FieldOptionsEditor
            values={draft}
            keys={PROJECT_STRING_FIELD_OPTION_KEYS}
            onChange={updateList}
          />

          <div className="mt-4 grid gap-4">
            <Card className="border border-border/80">
              <CardContent className="space-y-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      Automatyczne wykrywanie aktywnych projektów
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Gdy włączone, nie ustawiasz ręcznie checkboxa „Aktywny”. Projekt staje się
                      aktywny, gdy w widoku klienta pojawia się aktywność (zmiany, akceptacje /
                      ustalenia, oferty, zapisany czas pracy, dokumenty). Okno: ok.{" "}
                      {DEFAULT_ACTIVATE_WITHIN_DAYS} dni aktywności; spadek do nieaktywnego dopiero
                      po ok. {DEFAULT_DEACTIVATE_AFTER_DAYS} dniach bez ruchu (żeby uniknąć
                      skakania).
                    </p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border bg-surface-muted text-accent focus:ring-accent/30"
                      checked={activityDraft.autoDetectActiveProjects}
                      disabled={!isAdministrator || activitySaving}
                      onChange={(event) => {
                        setActivityDraft((current) => ({
                          ...current,
                          autoDetectActiveProjects: event.target.checked,
                        }));
                        setActivitySaved(false);
                      }}
                    />
                    Włączone
                  </label>
                </div>
                {activityError ? (
                  <p className="text-sm text-red-300">{activityError}</p>
                ) : null}
                {activitySaved ? (
                  <p className="text-sm text-emerald-300">
                    Zapisano.{" "}
                    {activityDraft.autoDetectActiveProjects
                      ? "Przeliczono flagi aktywności projektów."
                      : "Możesz znów ustawiać aktywność ręcznie."}
                  </p>
                ) : null}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!isAdministrator || activitySaving}
                    onClick={() => void handleSaveActivitySettings()}
                  >
                    {activitySaving ? "Zapisywanie…" : "Zapisz wykrywanie aktywności"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <BlockerReasonsOptionsEditor
              items={draft.blockerReasons}
              onChange={updateBlockerReasons}
            />

            <FlowStatusesOptionsEditor
              items={draft.flowStatuses}
              onChange={updateFlowStatuses}
            />

            <Card className="border border-border/80">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium text-foreground">Etapy projektu</p>
                  <p className="mt-1 text-sm text-muted">
                    Etapy pochodzą z szablonu procesu przypisanego do typu projektu. Flaga „Etap
                    zamykający” ustawiasz przy poszczególnych etapach w edytorze szablonu.
                  </p>
                </div>
                <Button variant="secondary" asChild>
                  <Link href="/procesy">Otwórz szablony procesów</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Katalogi (protokoły)</h2>
          <FieldOptionsEditor
            values={draft}
            keys={CATALOG_FIELD_OPTION_KEYS}
            onChange={updateList}
          />
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Przerwania</h2>
          <InterruptionTypesOptionsEditor
            items={draft.interruptionTypes}
            onChange={updateInterruptionTypes}
          />
        </div>
      </section>
    </>
  );
}
