# SRI_REPORT_UI_SPEC — raport wynikowy

> Cel: profesjonalny, czytelny raport dla właściciela / zarządcy / inwestora / technika / handlowca.
> **Frontend nie liczy SRI** — pobiera gotowy model raportu z backendu (`report-view`).
> Priorytet: czytelność i zaufanie, subtelne animacje (nie „prezentacja sprzedażowa").

## Sekcje

1. **Strona tytułowa** — nazwa budynku, adres, data audytu, audytor, wersja metodologii,
   wynik końcowy SRI (duży licznik), klasa SRI (A–G, kolor).
2. **Executive Summary** — wynik ogólny, mocne strony, największe braki, 3 kluczowe rekomendacje,
   przewidywany potencjał poprawy (current → potential).
3. **Wykres główny** — licznik SRI: obecny vs możliwy po rekomendacjach; animowane przejście liczb.
4. **Domeny (radar)** — 9 domen SRI: obecny % vs potencjał %. Fallback: poziome słupki na mobile.
5. **7 impact criteria (poziome słupki)** — obecny % vs potencjał %.
6. **Top recommendations** — priorytet, opis problemu, proponowana funkcja, wpływ na wynik,
   objęte domeny, zależności, poziom trudności.
7. **Roadmap** — Etap 1..5, przewidywany wynik po każdym etapie (kumulatywnie), blokery, zależności.
8. **Szczegóły techniczne** — usługi, Functionality Levels (obecny/cel), dowody, status weryfikacji,
   źródła metodologii.
9. **Załączniki** — zdjęcia, dokumenty, notatki, eksport danych.

## Wykresy (recharts)

- responsywne (`ResponsiveContainer`), czytelne na desktop i telefon,
- tooltipy, etykiety dostępne (aria), paleta o wysokim kontraście,
- radar domen, poziome bary kryteriów, licznik główny, „current vs potential" (bar/area).

## Animacje (subtelne)

- wejście sekcji (fade/slide, `prefers-reduced-motion` respektowane),
- animowane liczniki (SRI %, klasa), przejścia wykresów (wbudowane w recharts),
- rozwijanie szczegółów (accordion). Brak ciężkich efektów.

## Tryby

- **Ekranowy** — interaktywny (tooltipy, accordiony).
- **Druk** — `@media print`: rozwinięte sekcje, ukryte kontrolki, podziały stron (`break-inside: avoid`),
  logo i dane audytu w nagłówku.
- **PDF** — generowany po stronie klienta (`html2canvas` + `jspdf`) z widoku druku;
  zachowuje układ, wykresy (raster), nagłówki, podziały stron, logo, dane audytu.

## Model danych (z backendu)

`GET /api/audit/{id}/report` → `ReportViewModel`:
`meta`, `score{current,potential,class,potentialClass}`, `domains[]{current,potential}`,
`criteria[]{current,potential}`, `strengths[]`, `gaps[]`, `topRecommendations[]`,
`recommendations[]`, `roadmap[]{predictedScore,blockers,dependencies}`, `technical{services[]}`,
`attachments{evidence[]}`. Wartości „potential"/„predicted" liczy silnik SRI na hipotetycznych
wejściach (usługi na poziomie docelowym) — bez zmiany metodologii.

## Responsywność

- Grid 1 kolumna (mobile) → 2–3 kolumny (desktop). Wykresy skalowane do kontenera.
- Tabele rekomendacji: karty na mobile, tabela na desktop.
