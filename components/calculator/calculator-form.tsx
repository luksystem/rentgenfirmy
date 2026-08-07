"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CommercialPartyPicker, type CommercialPartyKind } from "@/components/commercial-party-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { buildContractFromCalculatorOffer } from "@/lib/calculator/to-contract";
import { calculateCalculatorTotals } from "@/lib/calculator/engine";
import { DEFAULT_CALCULATOR_SETTINGS, type CalculatorSettings } from "@/lib/calculator/settings";
import { fetchCalculatorSettings } from "@/lib/supabase/calculator-settings-repository";
import { fetchCompanyProfile } from "@/lib/supabase/company-profile-repository";
import {
  CALCULATOR_ADDON_KEYS,
  CALCULATOR_ADDON_LABELS,
  CALCULATOR_FUNCTIONAL_CATEGORY_LABELS,
  CALCULATOR_FUNCTIONAL_LEVELS,
  CALCULATOR_FUNCTIONAL_LEVEL_LABELS,
  CALCULATOR_OTHER_SYSTEM_KEYS,
  CALCULATOR_OTHER_SYSTEM_LABELS,
  calculatorClientFromServiceClient,
  type CalculatorAddonKey,
  type CalculatorAnswers,
  type CalculatorFunctionalLevel,
  type CalculatorOffer,
  type CalculatorOtherSystemKey,
} from "@/lib/calculator/types";
import { useAppStore } from "@/store/app-store";
import { useCalculatorStore } from "@/store/calculator-store";
import { useContractStore } from "@/store/contract-store";
import { cn, formatMoney } from "@/lib/utils";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground/90">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      {label}
    </label>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-border/60 pt-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function CalculatorForm({ initialOffer }: { initialOffer: CalculatorOffer }) {
  const router = useRouter();
  const clients = useAppStore((state) => state.clients);
  const contacts = useAppStore((state) => state.contacts);
  const addClient = useAppStore((state) => state.addClient);
  const addContact = useAppStore((state) => state.addContact);
  const saveOffer = useCalculatorStore((state) => state.saveOffer);
  const saveContract = useContractStore((state) => state.saveContract);

  const [offer, setOffer] = useState(initialOffer);
  const [partyKind, setPartyKind] = useState<CommercialPartyKind>(initialOffer.contactId ? "contact" : "client");
  const [settings, setSettings] = useState<CalculatorSettings>(DEFAULT_CALCULATOR_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCalculatorSettings().then(setSettings).catch(() => undefined);
  }, []);

  const totals = useMemo(() => calculateCalculatorTotals(offer.answers, settings), [offer.answers, settings]);

  function setAnswers(patch: Partial<CalculatorAnswers>) {
    setOffer((prev) => ({ ...prev, answers: { ...prev.answers, ...patch } }));
  }

  function toggleAddon(key: CalculatorAddonKey, checked: boolean) {
    setAnswers({ addons: { ...offer.answers.addons, [key]: checked } });
  }

  function toggleOtherSystem(key: CalculatorOtherSystemKey, checked: boolean) {
    setAnswers({ otherSystems: { ...offer.answers.otherSystems, [key]: checked } });
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const saved = await saveOffer(offer);
      setOffer(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać kalkulacji.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateContract() {
    setIsConverting(true);
    setError(null);
    try {
      const saved = await saveOffer(offer);
      const contract = buildContractFromCalculatorOffer(saved, settings);
      const savedContract = await saveContract(contract);
      const withLink = await saveOffer({ ...saved, status: "converted", contractId: savedContract.id });
      setOffer(withLink);
      router.push(`/umowy/${savedContract.id}`);
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "Nie udało się utworzyć umowy.");
    } finally {
      setIsConverting(false);
    }
  }

  async function handleGeneratePdf() {
    setIsGeneratingPdf(true);
    setError(null);
    try {
      const saved = await saveOffer(offer);
      setOffer(saved);
      const [{ generateCalculatorOfferPdf }, company] = await Promise.all([
        import("@/lib/calculator/calculator-pdf"),
        fetchCompanyProfile(),
      ]);
      const pdfBytes = await generateCalculatorOfferPdf({ offer: saved, settings, company });
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${saved.title || "kalkulacja"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "Nie udało się wygenerować PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const a = offer.answers;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-6">
        <Card>
          <CardContent className="grid gap-4 pt-5">
            <Field label="Tytuł kalkulacji">
              <Input
                value={offer.title}
                onChange={(event) => setOffer({ ...offer, title: event.target.value })}
                placeholder="Np. Dom Kowalscy — Kiekrz"
              />
            </Field>
            <CommercialPartyPicker
              mode="offer"
              partyKind={partyKind}
              onPartyKindChange={(kind) => {
                setPartyKind(kind);
                setOffer((prev) => (kind === "client" ? { ...prev, contactId: null } : { ...prev, clientId: null }));
              }}
              clients={clients}
              contacts={contacts}
              clientId={offer.clientId}
              contactId={offer.contactId}
              partySnapshot={offer.client}
              onSelectClient={(clientId, snapshot) =>
                setOffer({ ...offer, clientId, contactId: null, client: calculatorClientFromServiceClient(snapshot) })
              }
              onSelectContact={(contactId, snapshot) =>
                setOffer({ ...offer, contactId, clientId: null, client: calculatorClientFromServiceClient(snapshot) })
              }
              onCreateClient={addClient}
              onCreateContact={addContact}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-6 pt-5">
            <Section title="Parametry podstawowe">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Powierzchnia domu [m²]">
                  <NumericInput value={a.powierzchniaM2} onChange={(v) => setAnswers({ powierzchniaM2: v })} />
                </Field>
                <Field label="Liczba kondygnacji">
                  <NumericInput
                    value={a.liczbaKondygnacji}
                    decimals={false}
                    onChange={(v) => setAnswers({ liczbaKondygnacji: v })}
                  />
                </Field>
                <Field label="Ważność oferty [dni]">
                  <NumericInput
                    value={a.waznoscOfertyDni}
                    decimals={false}
                    onChange={(v) => setAnswers({ waznoscOfertyDni: v })}
                  />
                </Field>
                <Field label="Pomieszczenia z oknami">
                  <NumericInput
                    value={a.liczbaPomieszczenZOknami}
                    decimals={false}
                    onChange={(v) => setAnswers({ liczbaPomieszczenZOknami: v })}
                  />
                </Field>
                <Field label="Okna otwierane — łącznie">
                  <NumericInput
                    value={a.liczbaOkienOtwieranych}
                    decimals={false}
                    onChange={(v) => setAnswers({ liczbaOkienOtwieranych: v })}
                  />
                </Field>
                <Field label="Drzwi wejściowe">
                  <NumericInput
                    value={a.liczbaDrzwiWejsciowych}
                    decimals={false}
                    onChange={(v) => setAnswers({ liczbaDrzwiWejsciowych: v })}
                  />
                </Field>
                <Field label="Wyjścia na taras">
                  <NumericInput
                    value={a.liczbaWyjscNaTaras}
                    decimals={false}
                    onChange={(v) => setAnswers({ liczbaWyjscNaTaras: v })}
                  />
                </Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle label="Brama wjazdowa" checked={a.czyBramaWjazdowa} onChange={(v) => setAnswers({ czyBramaWjazdowa: v })} />
                <Toggle
                  label="Okna fabrycznie z czujnikami otwarcia"
                  checked={a.czyOknaCzujnikiFabryczne}
                  onChange={(v) => setAnswers({ czyOknaCzujnikiFabryczne: v })}
                />
                <Toggle
                  label="Korzysta z architekta wnętrz"
                  checked={a.korzystamZArchitekta}
                  onChange={(v) => setAnswers({ korzystamZArchitekta: v })}
                />
                <Toggle
                  label="Kompleksowa instalacja (elektryka + ID zlecone razem)"
                  checked={a.kompleksowaInstalacja}
                  onChange={(v) => setAnswers({ kompleksowaInstalacja: v })}
                />
                <Toggle
                  label="Oferta po analizie / projekcie (inaczej: wstępna)"
                  checked={a.ofertaPoAnalizie}
                  onChange={(v) => setAnswers({ ofertaPoAnalizie: v })}
                />
              </div>
            </Section>

            <Section title="Pomieszczenia">
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle label="Strefa prywatna (sypialnia, łazienka, garderoba)" checked={a.strefaPrywatna} onChange={(v) => setAnswers({ strefaPrywatna: v })} />
                <Toggle label="Strefa otwarta (salon z kuchnią)" checked={a.strefaOtwarta} onChange={(v) => setAnswers({ strefaOtwarta: v })} />
                <Toggle label="Komunikacja (hol, schody)" checked={a.komunikacja} onChange={(v) => setAnswers({ komunikacja: v })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Sypialnie dodatkowe">
                  <NumericInput value={a.liczbaSypialniDodatkowych} decimals={false} onChange={(v) => setAnswers({ liczbaSypialniDodatkowych: v })} />
                </Field>
                <Field label="Pomieszczenia wilgotne">
                  <NumericInput value={a.liczbaPomieszczenWilgotnych} decimals={false} onChange={(v) => setAnswers({ liczbaPomieszczenWilgotnych: v })} />
                </Field>
                <Field label="Pozostałe pomieszczenia">
                  <NumericInput value={a.liczbaPozostalychPomieszczen} decimals={false} onChange={(v) => setAnswers({ liczbaPozostalychPomieszczen: v })} />
                </Field>
                <Field label="Bramy garażowe">
                  <NumericInput value={a.liczbaBramGarazowych} decimals={false} onChange={(v) => setAnswers({ liczbaBramGarazowych: v })} />
                </Field>
              </div>
            </Section>

            <Section title="Funkcjonalności">
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle label="Kominek" checked={a.jestKominek} onChange={(v) => setAnswers({ jestKominek: v })} />
                <Toggle label="Gaz" checked={a.jestGaz} onChange={(v) => setAnswers({ jestGaz: v })} />
                <Toggle label="Elektryczne rolety / żaluzje / karnisze" checked={a.planujeRolety} onChange={(v) => setAnswers({ planujeRolety: v })} />
                <Toggle label="Sterowanie oświetleniem w ogrodzie" checked={a.sterowanieOgrodem} onChange={(v) => setAnswers({ sterowanieOgrodem: v })} />
                <Toggle label="Sceny oświetleniowe / symulacja obecności" checked={a.scenyOswietleniowe} onChange={(v) => setAnswers({ scenyOswietleniowe: v })} />
                <Toggle label="Sterowanie temperaturą w każdym pomieszczeniu" checked={a.sterowanieTemperatura} onChange={(v) => setAnswers({ sterowanieTemperatura: v })} />
                <Toggle label="System włamaniowy (cały dom)" checked={a.systemWlamaniowy} onChange={(v) => setAnswers({ systemWlamaniowy: v })} />
                <Toggle label="Alarm i kontrola dostępu — dostarczamy" checked={a.alarmIKontrolaDostepu} onChange={(v) => setAnswers({ alarmIKontrolaDostepu: v })} />
              </div>
              {a.planujeRolety ? (
                <Field label="Liczba rolet / żaluzji / karniszy" className="sm:max-w-xs">
                  <NumericInput value={a.liczbaRolet} decimals={false} onChange={(v) => setAnswers({ liczbaRolet: v })} />
                </Field>
              ) : null}
            </Section>

            <Section title="Poziom pakietu OPTIMUM per kategoria" description="Wybór biura — decyduje o cenie budżetu danej kategorii.">
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["oswietlenie", a.poziomOswietlenie, (v: CalculatorFunctionalLevel) => setAnswers({ poziomOswietlenie: v })],
                    ["bezpieczenstwo", a.poziomBezpieczenstwo, (v: CalculatorFunctionalLevel) => setAnswers({ poziomBezpieczenstwo: v })],
                    ["temperatura", a.poziomTemperatura, (v: CalculatorFunctionalLevel) => setAnswers({ poziomTemperatura: v })],
                    ["rolety", a.poziomRolety, (v: CalculatorFunctionalLevel) => setAnswers({ poziomRolety: v })],
                    ["zewnetrzne", a.poziomZewnetrzne, (v: CalculatorFunctionalLevel) => setAnswers({ poziomZewnetrzne: v })],
                  ] as const
                ).map(([category, value, onChange]) => (
                  <Field key={category} label={CALCULATOR_FUNCTIONAL_CATEGORY_LABELS[category]}>
                    <Select value={value} onChange={(event) => onChange(event.target.value as CalculatorFunctionalLevel)}>
                      {CALCULATOR_FUNCTIONAL_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {CALCULATOR_FUNCTIONAL_LEVEL_LABELS[level]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ))}
              </div>
            </Section>

            <Section title="Dodatki">
              <div className="grid gap-2 sm:grid-cols-2">
                {CALCULATOR_ADDON_KEYS.map((key) => (
                  <Toggle key={key} label={CALCULATOR_ADDON_LABELS[key]} checked={a.addons[key]} onChange={(v) => toggleAddon(key, v)} />
                ))}
              </div>
              {a.addons.stacjaDokujacaIpad || a.addons.ipad ? (
                <Field label="Ilość stacji dokujących z iPadem" className="sm:max-w-xs">
                  <NumericInput
                    value={a.iloscStacjiDokujacychZIpadem}
                    decimals={false}
                    onChange={(v) => setAnswers({ iloscStacjiDokujacychZIpadem: v })}
                  />
                </Field>
              ) : null}
            </Section>

            <Section title="Inne systemy">
              <div className="grid gap-2 sm:grid-cols-2">
                {CALCULATOR_OTHER_SYSTEM_KEYS.map((key) => (
                  <Toggle
                    key={key}
                    label={CALCULATOR_OTHER_SYSTEM_LABELS[key]}
                    checked={a.otherSystems[key]}
                    onChange={(v) => toggleOtherSystem(key, v)}
                  />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {a.otherSystems.monitoring ? (
                  <Field label="Liczba kamer">
                    <NumericInput value={a.iloscKamerMonitoringu} decimals={false} onChange={(v) => setAnswers({ iloscKamerMonitoringu: v })} />
                  </Field>
                ) : null}
                {a.otherSystems.multiroom ? (
                  <>
                    <Field label="Liczba stref multiroom">
                      <NumericInput value={a.iloscStrefMultiroom} decimals={false} onChange={(v) => setAnswers({ iloscStrefMultiroom: v })} />
                    </Field>
                    <Field label="Liczba głośników multiroom">
                      <NumericInput value={a.iloscGlosnikowMultiroom} decimals={false} onChange={(v) => setAnswers({ iloscGlosnikowMultiroom: v })} />
                    </Field>
                  </>
                ) : null}
              </div>
            </Section>

            <Section
              title="Instalacja elektryczna"
              description="Domyślnie liczona zryczałtowanym modelem punktowym z parametrów domu. Można nadpisać ręcznie."
            >
              <Field label="Liczba punktów elektrycznych (ręcznie, opcjonalnie)" className="sm:max-w-xs">
                <NumericInput
                  value={a.liczbaPunktowElektrycznychRecznie ?? 0}
                  decimals={false}
                  onChange={(v) => setAnswers({ liczbaPunktowElektrycznychRecznie: v > 0 ? v : null })}
                />
              </Field>
            </Section>

            <Section title="Finanse i wyjątki">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Współczynnik „trudny klient” (1,0–1,3)">
                  <NumericInput
                    value={a.trudnyKlientWspolczynnik}
                    onChange={(v) => setAnswers({ trudnyKlientWspolczynnik: Math.min(1.3, Math.max(1, v || 1)) })}
                  />
                </Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle label="Płatność z góry" checked={a.platnoscZGory} onChange={(v) => setAnswers({ platnoscZGory: v })} />
                <Toggle label="Istnieje już podstawowy system alarmowy" checked={a.istniejePodstawowyAlarm} onChange={(v) => setAnswers({ istniejePodstawowyAlarm: v })} />
                <Toggle label="Tylko rozdzielnia z peryferiami automatyki" checked={a.tylkoRozdzielnia} onChange={(v) => setAnswers({ tylkoRozdzielnia: v })} />
              </div>
            </Section>
          </CardContent>
        </Card>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Zapisywanie…" : "Zapisz"}
          </Button>
          <Button variant="secondary" disabled={isGeneratingPdf} onClick={() => void handleGeneratePdf()}>
            {isGeneratingPdf ? "Generowanie…" : "Generuj PDF oferty"}
          </Button>
          <Button variant="secondary" disabled={isConverting} onClick={() => void handleCreateContract()}>
            {isConverting ? "Tworzenie umowy…" : "Utwórz umowę z tej kalkulacji"}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie (netto)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 text-sm">
            <div className="grid gap-1">
              <p className="font-medium text-foreground">Baza systemu ({totals.baseSystem.tier === "do_80" ? "do 80 m²" : totals.baseSystem.tier === "od_80_do_150" ? "80–150 m²" : "150 m²+"})</p>
              <Row label="Rozdzielnica — sprzęt" value={totals.baseSystem.rozdzielnicaSprzetNet} />
              <Row label="Automatyka — baza" value={totals.baseSystem.automatykaBazaNet} />
              <Row label="Projekt" value={totals.baseSystem.projektNet} />
              <Row label="Wykonanie rozdzielni" value={totals.baseSystem.wykonanieRozdzielniNet} />
              <Row label="Konfiguracja" value={totals.baseSystem.konfiguracjaNet} />
            </div>

            <div className="grid gap-1 border-t border-border/50 pt-3">
              <p className="font-medium text-foreground">Kategorie funkcjonalne</p>
              {totals.functional.map((item) => (
                <Row key={item.category} label={`${CALCULATOR_FUNCTIONAL_CATEGORY_LABELS[item.category]} (${CALCULATOR_FUNCTIONAL_LEVEL_LABELS[item.level]})`} value={item.net} />
              ))}
            </div>

            {totals.addonsNet > 0 ? (
              <div className="grid gap-1 border-t border-border/50 pt-3">
                <Row label="Dodatki (wybrane)" value={totals.addonsNet} bold />
              </div>
            ) : null}

            <div className="grid gap-1 border-t border-border/50 pt-3">
              <p className="font-medium text-foreground">Instalacja elektryczna</p>
              <p className="text-xs text-muted">{totals.electrical.points} pkt</p>
              <Row label="Wartość" value={totals.electrical.net} />
              {totals.electrical.discountNet > 0 ? <Row label="Rabat kompleksowości" value={-totals.electrical.discountNet} muted /> : null}
            </div>

            {totals.otherSystems.selectedNet > 0 ? (
              <div className="grid gap-1 border-t border-border/50 pt-3">
                <p className="font-medium text-foreground">Inne systemy</p>
                <Row label="Wartość" value={totals.otherSystems.selectedNet} />
                {totals.otherSystems.discountNet > 0 ? (
                  <Row label={`Rabat (${totals.otherSystems.discountPercent}%)`} value={-totals.otherSystems.discountNet} muted />
                ) : null}
              </div>
            ) : null}

            {totals.trudnyKlientWspolczynnik > 1 ? (
              <p className="text-xs text-muted">
                Doliczony współczynnik „trudny klient”: ×{totals.trudnyKlientWspolczynnik.toFixed(2)}
              </p>
            ) : null}

            {totals.platnoscZGoryDiscountNet > 0 ? (
              <Row label="Rabat za płatność z góry" value={-totals.platnoscZGoryDiscountNet} muted />
            ) : null}

            <div className="border-t border-accent/30 pt-3">
              <p className="text-lg font-bold text-accent">{formatMoney(totals.totalNet)} netto</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", bold && "font-semibold text-foreground")}>
      <span className={cn(muted ? "text-muted" : "text-foreground/90")}>{label}</span>
      <span className={cn("tabular-nums", muted ? "text-muted" : "text-foreground")}>{formatMoney(value)}</span>
    </div>
  );
}
