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
import { PROJECT_RULES } from "@/lib/project-rules";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

export default function SettingsPage() {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const updateFieldOptions = useAppStore((state) => state.updateFieldOptions);
  const isSaving = useAppStore((state) => state.isSaving);
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const [draft, setDraft] = useState<FieldOptions>(fieldOptions);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(fieldOptions);
  }, [fieldOptions]);

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
                administrator, manager, pracownik, podwykonawca, klient, gość.
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
