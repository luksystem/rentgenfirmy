-- ═══════════════════════════════════════════════════════════════════════════
-- Biblioteka metodologii celów — treść startowa (9 metodologii + field_schema).
-- Patrz: docs/cele/mvp/AI_I_METODOLOGIE.md
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.goal_methodologies (
  code, name, short_description, purpose, when_to_use, when_not_to_use,
  structure_md, example_md, best_practices_md, common_mistakes_md, field_schema, sort_order
) values
(
  'smart',
  'SMART',
  'Cel skonstruowany wg 5 kryteriów: konkretny, mierzalny, osiągalny, istotny, określony w czasie.',
  'Ujednolicenie formułowania celów tak, by były jednoznaczne i weryfikowalne.',
  'Uniwersalna — dobra jako pierwszy krok dla większości celów indywidualnych i zespołowych.',
  'Cele wizjonerskie/transformacyjne (patrz BHAG) lub wymagające rozbicia na wiele mierzalnych wyników (patrz OKR).',
  '**S**pecific — konkretny\n**M**easurable — mierzalny\n**A**chievable — osiągalny\n**R**elevant — istotny\n**T**ime-bound — określony w czasie',
  '„Zwiększyć liczbę podpisanych umów serwisowych z 10 do 15 w Q3 2026, poprzez wdrożenie cotygodniowych follow-upów handlowych.”',
  'Formułuj cel jednym zdaniem zawierającym liczbę i termin. Unikaj ogólników typu „poprawić”, „zwiększyć” bez wartości docelowej.',
  'Cel mierzalny, ale nieistotny biznesowo. Brak jasnego terminu. Zbyt ambitna wartość docelowa bez planu działania.',
  '[
    {"key":"specific","label":"Konkretny — co dokładnie chcemy osiągnąć?","type":"textarea"},
    {"key":"measurable","label":"Mierzalny — jak zmierzymy sukces?","type":"textarea"},
    {"key":"achievable","label":"Osiągalny — dlaczego to realistyczne?","type":"textarea"},
    {"key":"relevant","label":"Istotny — dlaczego to ważne teraz?","type":"textarea"},
    {"key":"timeBound","label":"Termin realizacji","type":"text"}
  ]'::jsonb,
  10
),
(
  'okr',
  'OKR',
  'Objective (cel kierunkowy) + Key Results (mierzalne wyniki), stosowane kaskadowo w organizacji.',
  'Łączenie ambitnych, inspirujących celów z konkretnymi metrykami sukcesu na poziomie firmy/zespołu.',
  'Cele strategiczne firmy/zespołu na kwartał/rok, wymagające rozbicia na kilka mierzalnych wyników.',
  'Proste, pojedyncze zadania operacyjne — nadmiarowa struktura dla drobnych celów (lepiej SMART).',
  '**Objective** — inspirujący, kierunkowy cel (bez liczby)\n**Key Results** — 2-5 mierzalnych wyników liczbowych potwierdzających realizację celu',
  'Objective: „Stać się liderem jakości obsługi serwisowej w regionie.”\nKey Results: NPS ≥ 60, czas reakcji na zgłoszenie ≤ 4h, liczba reklamacji ≤ 2/mies.',
  'Objective ma inspirować, Key Results mają być bezdyskusyjnie mierzalne. 3-5 KR na jeden Objective — nie więcej.',
  'Key Results będące zadaniami, nie miarami. Zbyt duża liczba OKR naraz. Brak przeglądu w połowie okresu.',
  '[
    {"key":"objective","label":"Objective — cel kierunkowy","type":"textarea"},
    {"key":"keyResults","label":"Key Results (miara, wartość docelowa, jednostka)","type":"list"}
  ]'::jsonb,
  20
),
(
  'woop',
  'WOOP',
  'Wish – Outcome – Obstacle – Plan: technika mentalnego kontrastowania z psychologii motywacji.',
  'Zwiększenie prawdopodobieństwa realizacji celu poprzez wcześniejsze zaplanowanie reakcji na przeszkody.',
  'Cele indywidualne wymagające zmiany nawyku/zachowania, gdzie głównym ryzykiem jest motywacja, nie zasoby.',
  'Cele zespołowe/organizacyjne wymagające koordynacji wielu osób — lepiej OKR/EOS Rocks.',
  '**Wish** — czego chcę?\n**Outcome** — najlepszy możliwy efekt\n**Obstacle** — najważniejsza wewnętrzna przeszkoda\n**Plan** — reakcja typu „jeśli [przeszkoda], to zrobię [akcja]”',
  'Wish: „Chcę codziennie kończyć raportowanie czasu pracy.” Obstacle: „Zapominam pod koniec dnia.” Plan: „Jeśli jest 16:30, to ustawiam przypomnienie i wypełniam raport przed innymi zadaniami.”',
  'Obstacle musi być szczery i wewnętrzny (nie „brak czasu”, ale konkretny mechanizm odkładania). Plan w formule „jeśli-to”.',
  'Obstacle sformułowany jako przeszkoda zewnętrzna, na którą nie mamy wpływu. Brak konkretnego planu „jeśli-to”.',
  '[
    {"key":"wish","label":"Wish — czego chcemy?","type":"textarea"},
    {"key":"outcome","label":"Outcome — najlepszy możliwy efekt","type":"textarea"},
    {"key":"obstacle","label":"Obstacle — główna wewnętrzna przeszkoda","type":"textarea"},
    {"key":"plan","label":"Plan — jeśli [przeszkoda], to [akcja]","type":"textarea"}
  ]'::jsonb,
  30
),
(
  'bhag',
  'BHAG',
  'Big Hairy Audacious Goal — ambitny, długoterminowy cel wizjonerski organizacji.',
  'Nadanie kierunku strategicznego firmie na wiele lat, inspirujący i angażujący cały zespół.',
  'Cele firmy w horyzoncie 5-10+ lat, definiujące tożsamość i ambicję organizacji.',
  'Cele operacyjne, kwartalne lub indywidualne — BHAG jest zbyt odległy i ogólny dla tego poziomu.',
  '**Vision statement** — jedno zdanie opisujące ambitny stan docelowy\n**Time horizon** — horyzont czasowy (lata)\n**Success criteria** — jak poznamy, że cel został osiągnięty',
  '„Do 2035 roku być pierwszym wyborem dla 1000 firm w Polsce w zakresie automatyki budynkowej.”',
  'BHAG powinien być zrozumiały bez wyjaśnień, budzić emocje i lekki dyskomfort skali. Rozkładaj na cele roczne (np. OKR).',
  'BHAG bez rozbicia na cele pośrednie — zostaje sloganem bez realizacji. Zbyt techniczny, niezrozumiały dla zespołu.',
  '[
    {"key":"visionStatement","label":"Wizja — ambitny stan docelowy","type":"textarea"},
    {"key":"timeHorizonYears","label":"Horyzont czasowy (lata)","type":"number"},
    {"key":"successCriteria","label":"Kryteria sukcesu","type":"textarea"}
  ]'::jsonb,
  40
),
(
  'eos_rocks',
  'EOS Rocks',
  'Element systemu EOS (Entrepreneurial Operating System) — 3-7 najważniejszych priorytetów kwartału.',
  'Skoncentrowanie firmy/zespołu na kilku najważniejszych priorytetach kwartalnych, z jasną odpowiedzialnością.',
  'Cele kwartalne zespołu zarządzającego lub zespołów operacyjnych, gdy trzeba wybrać to, co NAPRAWDĘ ważne.',
  'Cele długoterminowe (BHAG) lub bardzo szczegółowe zadania jednoosobowe (SMART).',
  '**Rock title** — nazwa priorytetu\n**Who** — jedna osoba odpowiedzialna\n**What done looks like** — jak wygląda „zrobione”\n**Quarter** — kwartał realizacji',
  'Rock: „Wdrożyć nowy proces onboardingu klienta.” Who: Kierownik wdrożeń. Done: „Nowy klient przechodzi pełny onboarding w ≤ 5 dni roboczych.”',
  'Maksymalnie 3-7 Rocks na kwartał na osobę/zespół. Jeden właściciel per Rock — brak współwłasności.',
  'Za dużo Rocks (rozmycie priorytetów). Rock bez jasnej definicji „zrobione”. Brak tygodniowego przeglądu postępu.',
  '[
    {"key":"rockTitle","label":"Nazwa priorytetu (Rock)","type":"text"},
    {"key":"who","label":"Kto jest właścicielem?","type":"text"},
    {"key":"whatDoneLooksLike","label":"Jak wygląda „zrobione”?","type":"textarea"},
    {"key":"quarter","label":"Kwartał realizacji","type":"text"}
  ]'::jsonb,
  50
),
(
  'kpi',
  'KPI',
  'Key Performance Indicator — cel zdefiniowany jako pojedynczy, stale monitorowany wskaźnik.',
  'Ciągłe monitorowanie kluczowego wskaźnika operacyjnego bez potrzeby dodatkowej struktury celu.',
  'Wskaźniki cykliczne (miesięczne/kwartalne) o ustalonej formule liczenia, np. marża, rotacja, czas realizacji.',
  'Cele jednorazowe/projektowe bez powtarzalnego pomiaru — lepiej SMART lub OKR.',
  '**KPI name** — nazwa wskaźnika\n**Formula** — sposób liczenia\n**Target value** — wartość docelowa\n**Frequency** — częstotliwość pomiaru',
  'KPI: „Czas reakcji na zgłoszenie serwisowe.” Formula: „Średni czas od zgłoszenia do pierwszej reakcji.” Target: ≤ 4h. Frequency: tygodniowo.',
  'Jedna, jasna formuła liczenia zaakceptowana przez wszystkich interesariuszy. Regularna częstotliwość pomiaru.',
  'KPI bez jasnej formuły (różne osoby liczą różnie). Zbyt rzadki pomiar, by wychwycić trend w czasie.',
  '[
    {"key":"kpiName","label":"Nazwa wskaźnika","type":"text"},
    {"key":"formula","label":"Formuła / sposób liczenia","type":"textarea"},
    {"key":"targetValue","label":"Wartość docelowa","type":"text"},
    {"key":"frequency","label":"Częstotliwość pomiaru","type":"text"}
  ]'::jsonb,
  60
),
(
  'pdca',
  'PDCA',
  'Plan – Do – Check – Act: cykl ciągłego doskonalenia, podstawa rozwiązywania problemów.',
  'Systematyczne rozwiązywanie problemów i wdrażanie usprawnień z weryfikacją skuteczności.',
  'Cele naprawcze/usprawnieniowe, w tym docelowo cykl życia problemów (Problem → Analiza → Rozwiązanie → Sprawdzenie skuteczności → Aktualizacja standardu).',
  'Cele wizjonerskie/inspirujące bez konkretnego problemu do rozwiązania — lepiej BHAG/OKR.',
  '**Plan** — analiza problemu i plan działania\n**Do** — wdrożenie zmiany (pilotaż)\n**Check** — sprawdzenie skuteczności\n**Act** — utrwalenie jako nowy standard lub kolejna iteracja',
  'Plan: „Zbyt długi czas montażu — analiza przyczyn.” Do: „Pilotaż nowej kolejności prac na 3 projektach.” Check: „Czas montażu spadł o 20%.” Act: „Nowa kolejność staje się standardem firmy.”',
  'Nie przechodź do „Act” bez rzetelnego „Check” z danymi. Dokumentuj wnioski z każdej iteracji.',
  'Zatrzymanie się na „Do” bez sprawdzenia skuteczności. Traktowanie PDCA jako jednorazowego cyklu, a nie ciągłego procesu.',
  '[
    {"key":"plan","label":"Plan — analiza i plan działania","type":"textarea"},
    {"key":"do","label":"Do — wdrożenie / pilotaż","type":"textarea"},
    {"key":"check","label":"Check — sprawdzenie skuteczności","type":"textarea"},
    {"key":"act","label":"Act — nowy standard / kolejna iteracja","type":"textarea"}
  ]'::jsonb,
  70
),
(
  'kaizen',
  'Kaizen',
  'Filozofia małych, ciągłych usprawnień wykonywanych regularnie przez zespół.',
  'Stałe, drobne poprawki procesu, niewymagające dużych inwestycji ani formalnego projektu.',
  'Cele rozwojowe/jakościowe polegające na wielu małych krokach usprawnień w codziennej pracy.',
  'Duże, transformacyjne zmiany wymagające inwestycji i planu projektowego — lepiej PDCA lub cel projektowy.',
  '**Current state** — obecny stan/problem\n**Small improvement** — małe, konkretne usprawnienie do wdrożenia\n**Measurement method** — jak zmierzymy efekt drobnej zmiany',
  'Current state: „Dokumenty montażowe drukowane osobno dla każdego etapu.” Small improvement: „Jeden zbiorczy wydruk na start projektu.” Measurement: „Liczba wydruków/miesiąc.”',
  'Usprawnienie musi być małe i wdrażalne w dniach, nie miesiącach. Zaangażuj osoby wykonujące pracę na co dzień.',
  'Próba wdrożenia dużej zmiany pod szyldem Kaizen. Brak pomiaru efektu drobnej zmiany — nie wiadomo, czy zadziałała.',
  '[
    {"key":"currentState","label":"Obecny stan / problem","type":"textarea"},
    {"key":"problem","label":"Problem do usprawnienia","type":"textarea"},
    {"key":"smallImprovement","label":"Małe usprawnienie do wdrożenia","type":"textarea"},
    {"key":"measurementMethod","label":"Sposób pomiaru efektu","type":"textarea"}
  ]'::jsonb,
  80
),
(
  '12wy',
  '12 Week Year',
  'Traktowanie 12 tygodni jako pełnego „roku” realizacji celu, z tygodniową punktacją (scorecard).',
  'Skrócenie horyzontu planowania, by zwiększyć intensywność i częstotliwość działania wobec celu rocznego.',
  'Cele wymagające dużej dyscypliny wykonawczej w krótkim, intensywnym okresie (np. kwartał sprzedażowy).',
  'Cele bardzo długoterminowe (BHAG) lub jednorazowe zadania bez cyklicznych działań tygodniowych.',
  '**Vision/Outcome** — cel 12-tygodniowy\n**Weekly tactics** — konkretne działania na każdy tydzień\n**Scorecard metric** — wskaźnik śledzony tygodniowo',
  'Vision: „Zwiększyć bazę stałych klientów serwisowych o 20 w 12 tygodni.” Weekly tactic: „5 nowych rozmów handlowych/tydzień.” Scorecard: liczba podpisanych umów/tydzień.',
  'Cotygodniowy przegląd scorecard, nie miesięczny. Traktuj tydzień 13 jako czas na odpoczynek i planowanie kolejnego cyklu.',
  'Zbyt ogólne taktyki tygodniowe, niemożliwe do zmierzenia w tydzień. Brak cotygodniowego rytuału przeglądu.',
  '[
    {"key":"visionOutcome","label":"Cel 12-tygodniowy","type":"textarea"},
    {"key":"weeklyTactics","label":"Taktyki tygodniowe","type":"list"},
    {"key":"scorecardMetric","label":"Wskaźnik tygodniowy (scorecard)","type":"text"}
  ]'::jsonb,
  90
)
on conflict (code) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  purpose = excluded.purpose,
  when_to_use = excluded.when_to_use,
  when_not_to_use = excluded.when_not_to_use,
  structure_md = excluded.structure_md,
  example_md = excluded.example_md,
  best_practices_md = excluded.best_practices_md,
  common_mistakes_md = excluded.common_mistakes_md,
  field_schema = excluded.field_schema,
  sort_order = excluded.sort_order,
  updated_at = now();
