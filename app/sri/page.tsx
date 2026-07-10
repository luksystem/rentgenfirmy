import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  Globe2,
  LineChart,
  Lock,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wrench,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Audyt SRI dla budynków — ocena gotowości inteligentnej | Luksystem",
  description:
    "Profesjonalne narzędzie do audytów SRI (Smart Readiness Indicator) zgodnych z metodyką UE i dyrektywą EPBD. Ankieta, obliczenia, rekomendacje, roadmapa i raport z bezpiecznym udostępnianiem — dla właścicieli budynków i firm audytowych.",
  robots: { index: true, follow: true },
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold text-white sm:text-4xl">{value}</p>
      <p className="mt-1 text-sm text-blue-100">{label}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
        {n}
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600">{children}</p>
    </div>
  );
}

export default function SriLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Gauge className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">Luksystem SRI</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#jak-dziala" className="hover:text-slate-900">Jak działa</a>
            <a href="#sri-epbd" className="hover:text-slate-900">SRI i EPBD</a>
            <a href="#dla-kogo" className="hover:text-slate-900">Dla kogo</a>
            <a href="#kontakt" className="hover:text-slate-900">Kontakt</a>
          </nav>
          <Link
            href="/sri/raport-przykladowy"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Przykładowy raport <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
              <Sparkles className="h-3.5 w-3.5" /> Zgodne z metodyką UE i dyrektywą EPBD
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              Audyt gotowości inteligentnej budynku (SRI) — od ankiety do raportu
            </h1>
            <p className="mt-5 max-w-xl text-lg text-blue-100">
              Profesjonalne narzędzie, które prowadzi audytora przez cały proces: ocenę usług
              budynkowych, obliczenie wskaźnika SRI według oficjalnej metodyki, rekomendacje,
              roadmapę modernizacji i gotowy raport, który możesz bezpiecznie udostępnić klientowi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sri/raport-przykladowy"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-blue-800 transition hover:bg-blue-50"
              >
                <FileText className="h-5 w-5" /> Zobacz przykładowy raport
              </Link>
              <a
                href="#kontakt"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Umów prezentację
              </a>
            </div>
          </div>

          {/* Wizualizacja wyniku */}
          <div className="relative">
            <div className="mx-auto max-w-sm rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
              <div className="flex items-center justify-between text-sm text-blue-100">
                <span>Wynik SRI budynku</span>
                <span className="rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Klasa C
                </span>
              </div>
              <p className="mt-3 text-6xl font-bold">72%</p>
              <p className="text-sm text-blue-100">Potencjał po modernizacji: 91%</p>
              <div className="mt-5 space-y-2.5">
                {[
                  ["Efektywność energetyczna", "84%"],
                  ["Komfort", "68%"],
                  ["Elastyczność energetyczna", "55%"],
                  ["Utrzymanie i predykcja awarii", "77%"],
                ].map(([label, v]) => (
                  <div key={label}>
                    <div className="mb-0.5 flex justify-between text-xs text-blue-100">
                      <span>{label}</span>
                      <span>{v}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: v }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-t border-white/10 bg-black/10">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-8 sm:grid-cols-4">
            <Stat value="9" label="domen technicznych SRI" />
            <Stat value="7" label="kryteriów wpływu" />
            <Stat value="A–G" label="klasy gotowości" />
            <Stat value="100%" label="wg oficjalnej metodyki" />
          </div>
        </div>
      </section>

      {/* SRI i EPBD */}
      <section id="sri-epbd" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Kontekst prawny
            </span>
            <h2 className="mt-2 text-3xl font-bold">Czym jest SRI i jak wiąże się z EPBD</h2>
            <div className="mt-6 space-y-4 text-slate-600">
              <p>
                <strong className="text-slate-900">SRI (Smart Readiness Indicator)</strong> to
                wspólny, europejski wskaźnik oceniający zdolność budynku do reagowania na potrzeby
                użytkowników i sieci oraz do efektywnego zarządzania energią. Został wprowadzony
                dyrektywą <strong>EPBD 2018/844</strong>, a jego metodyka doprecyzowana w
                rozporządzeniach UE 2020/2155 (delegowanym) i 2020/2156 (wykonawczym).
              </p>
              <p>
                Ocena obejmuje <strong className="text-slate-900">9 domen technicznych</strong>{" "}
                (m.in. ogrzewanie, chłodzenie, wentylacja, oświetlenie, energia elektryczna,
                ładowanie EV, monitoring i sterowanie) oraz{" "}
                <strong className="text-slate-900">7 kryteriów wpływu</strong> (efektywność
                energetyczna, komfort, wygoda, zdrowie, informacja dla użytkowników, utrzymanie i
                predykcja awarii, elastyczność energetyczna). Wynik prezentowany jest jako procent i
                klasa A–G.
              </p>
              <p>
                Nowelizacja <strong className="text-slate-900">EPBD (dyrektywa 2024/1275)</strong> z
                2024 r. wzmacnia rolę cyfryzacji i inteligentnych instalacji: budynki zeroemisyjne,
                minimalne standardy charakterystyki energetycznej oraz systemy automatyki i
                sterowania (BACS) stają się standardem, a SRI — wspólnym językiem oceny „gotowości
                inteligentnej”.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-2 flex items-center gap-2 text-blue-700">
                <Globe2 className="h-5 w-5" />
                <h3 className="font-semibold text-slate-900">W Unii Europejskiej</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Wspólny schemat SRI dla wszystkich państw członkowskich (obecnie dobrowolny do wdrożenia krajowego).</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Rosnące wymagania wobec automatyki budynkowej (BACS) w budynkach niemieszkalnych.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Nacisk na renowacje, dekarbonizację i cyfrowe zarządzanie energią do 2030 i 2050.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-2 flex items-center gap-2 text-blue-700">
                <Building2 className="h-5 w-5" />
                <h3 className="font-semibold text-slate-900">Przewidywania dla Polski</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Trwająca transpozycja EPBD do prawa krajowego zwiększy znaczenie oceny gotowości inteligentnej.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Spodziewany wzrost popytu na audyty i modernizacje wspierane funduszami (KPO, FEnIKS, programy efektywnościowe).</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> SRI jako przewaga rynkowa: wyższa wartość i atrakcyjność najmu budynków „smart-ready”.</li>
              </ul>
              <p className="mt-3 text-xs text-slate-400">
                Materiał informacyjny — nie stanowi porady prawnej. Zakres i terminy wynikają z
                przepisów UE i krajowych aktów wdrażających.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Jak działa */}
      <section id="jak-dziala" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Jak działa narzędzie</h2>
            <p className="mt-3 text-slate-600">
              Prowadzimy audytora krok po kroku — od zebrania danych na obiekcie po profesjonalny
              raport dla klienta. Obliczenia realizuje silnik zgodny z oficjalną metodyką SRI.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3 lg:grid-cols-5">
            <Step n={1} title="Ankieta na obiekcie">
              Krokowy formularz z podziałem na domeny, autozapisem i trybem offline — wygodny na
              telefonie i tablecie.
            </Step>
            <Step n={2} title="Obliczenie SRI">
              Silnik liczy wynik według oficjalnej metodyki UE: domeny, kryteria wpływu, wynik % i
              klasa A–G.
            </Step>
            <Step n={3} title="Rekomendacje">
              Automatyczne, priorytetyzowane rekomendacje z opisem problemu, wpływem i poziomem
              trudności.
            </Step>
            <Step n={4} title="Roadmapa">
              Etapy modernizacji z przewidywanym wynikiem po każdym kroku oraz zależnościami.
            </Step>
            <Step n={5} title="Raport i udostępnianie">
              Profesjonalny raport z wykresami, tryb druku/PDF i bezpieczny link chroniony hasłem.
            </Step>
          </div>
        </div>
      </section>

      {/* Dla kogo */}
      <section id="dla-kogo" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Dla kogo jest to narzędzie</h2>
          <p className="mt-3 text-slate-600">
            Jedno rozwiązanie łączące potrzeby firm zamawiających audyt i firm, które go
            przeprowadzają.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 p-8">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Właściciele i zarządcy budynków</h3>
            <p className="mt-2 text-sm text-slate-600">
              Inwestorzy, deweloperzy, zarządcy nieruchomości i przedsiębiorstwa.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /> Jasny obraz: gdzie budynek jest dziś i jaki jest potencjał.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /> Konkretny plan modernizacji z przewidywanym efektem.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /> Argument przy najmie, sprzedaży i pozyskiwaniu finansowania.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /> Gotowość na nadchodzące wymagania EPBD.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50 p-8">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Firmy audytowe i energetyczne</h3>
            <p className="mt-2 text-sm text-slate-600">
              Audytorzy energetyczni, integratorzy automatyki, biura projektowe i firmy
              instalacyjne.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Skrócenie czasu audytu — ankieta, obliczenia i raport w jednym miejscu.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Powtarzalna, spójna metodyka i profesjonalny wygląd dokumentów.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Nowa usługa w ofercie i dodatkowe źródło przychodu.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Bezpieczne udostępnianie wyników klientowi online.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Funkcje */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Co dostajesz</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<ClipboardCheck className="h-6 w-6" />} title="Krokowa ankieta">
              Podział na domeny, pasek postępu, autozapis, statusy weryfikacji, notatki i dowody
              (zdjęcia) — także offline.
            </Feature>
            <Feature icon={<Gauge className="h-6 w-6" />} title="Wynik wg metodyki UE">
              Obliczenia zgodne z oficjalną metodyką SRI — bez ręcznych arkuszy i ryzyka pomyłek.
            </Feature>
            <Feature icon={<Target className="h-6 w-6" />} title="Rekomendacje">
              Priorytetyzowane działania z opisem problemu, wpływem na wynik i poziomem trudności.
            </Feature>
            <Feature icon={<Rocket className="h-6 w-6" />} title="Roadmapa modernizacji">
              Etapy z przewidywanym wynikiem po każdym kroku oraz zależnościami i blokerami.
            </Feature>
            <Feature icon={<BarChart3 className="h-6 w-6" />} title="Raport z wykresami">
              Wykres główny, radar domen, słupki kryteriów, „obecnie vs po modernizacji”. Tryb druku
              i eksport PDF.
            </Feature>
            <Feature icon={<Lock className="h-6 w-6" />} title="Bezpieczne udostępnianie">
              Link chroniony hasłem, data wygaśnięcia, limit wyświetleń, kontrola widocznych sekcji i
              historia dostępu.
            </Feature>
          </div>
        </div>
      </section>

      {/* CTA — przykładowy raport */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 to-blue-900 px-8 py-14 text-center text-white">
          <LineChart className="mx-auto h-10 w-10 text-blue-200" />
          <h2 className="mt-4 text-3xl font-bold">Zobacz, jak wygląda gotowy raport</h2>
          <p className="mx-auto mt-3 max-w-xl text-blue-100">
            Otwórz w pełni interaktywny raport demonstracyjny: wynik, domeny, kryteria wpływu,
            rekomendacje i roadmapę. Dokładnie taki dokument otrzyma Twój klient.
          </p>
          <Link
            href="/sri/raport-przykladowy"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-semibold text-blue-800 transition hover:bg-blue-50"
          >
            <FileText className="h-5 w-5" /> Otwórz przykładowy raport
          </Link>
        </div>
      </section>

      {/* Kontakt */}
      <section id="kontakt" className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-blue-400" />
          <h2 className="mt-4 text-3xl font-bold">Wdrożmy audyty SRI w Twojej firmie</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Umów bezpłatną prezentację — pokażemy pełny przepływ na przykładzie Twojego budynku i
            omówimy warunki współpracy dla firm audytowych.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:biuro@luksystem.pl?subject=Prezentacja%20narz%C4%99dzia%20SRI"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              <Users className="h-5 w-5" /> Umów prezentację
            </a>
            <Link
              href="/sri/raport-przykladowy"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              <FileText className="h-5 w-5" /> Przykładowy raport
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-slate-700">Luksystem SRI</span>
          </div>
          <p>Narzędzie do audytów gotowości inteligentnej budynków (SRI) zgodnych z metodyką UE.</p>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Wrench className="h-3.5 w-3.5" />
            <span>Smart Home · BMS · Automatyka budynkowa</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
