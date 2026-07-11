/**
 * Zależności flag projektu — źródło prawdy dla widoków i liczników.
 *
 * STATUS PRZEPŁYWU (ustawienia, jedna kategoria na status):
 * - W trakcie — projekt w realizacji
 * - Oczekujące — czeka na budowę, klienta, materiały itd.
 * - Zamknięty — temat domknięty
 *
 * CHECKBOX AKTYWNY (na projekcie, niezależny od statusu przepływu):
 * - Czy zespół TERAZ aktywnie pracuje nad projektem
 * - Liczniki dashboardu: Aktywne / Nieaktywne
 * - Projekt może być np. Oczekujący + Nieaktywny — świadomie odłożony
 * - Przerwania w nieaktywnych projektach warto monitorować osobno
 *
 * ETAP — flaga „Etap zamykający” na etapie szablonu procesu:
 * - Wskazuje fazę finalizacji (wdrożenie, odbiór itd.)
 *
 * WIDOKI I LICZNIKI:
 * | Reguła              | Warunek                                      |
 * |---------------------|----------------------------------------------|
 * | Aktywne             | isActive                                     |
 * | Nieaktywne          | !isActive                                    |
 * | Oczekujące          | status przepływu: Oczekujące                 |
 * | Do zamknięcia       | status: W trakcie lub Oczekujące + etap Do zamknięcia |
 * | Bez kontaktu        | daty kontaktu + status ≠ Zamknięty           |
 * | Krytyczne           | priorytet Krytyczny                          |
 *
 * WALIDACJA BLOKADY (formularz):
 * - Wymagana gdy status przepływu: Oczekujące
 * - Wymagana gdy: !isActive i status ≠ Zamknięty
 *
 * OCZEKIWANIE — checkboxy (formularz, pod powodem blokady):
 * - Czy zależne od nas?
 * - Czy nie wykonanie zwiększy koszty później?
 * - Czy blokuje rozliczenie?
 * Priorytet: 1 zaznaczenie → Wysoki, 2+ → Krytyczny
 */

export const PROJECT_RULES = {
  flowCategories: ["W trakcie", "Oczekujące", "Zamknięty"] as const,
  activeField:
    "Checkbox Aktywny — czy zespół teraz pracuje nad projektem (niezależnie od statusu przepływu).",
  closingView:
    "Do zamknięcia = status W trakcie lub Oczekujące + aktywny etap procesu z flagą Etap zamykający (bez wymogu Aktywny).",
  waitingView: "Oczekujące = status przepływu z flagą Oczekujące.",
  noContactView:
    "Bez kontaktu = przeterminowany kontakt, brak aktywności >14 dni, status ≠ Zamknięty.",
  blockerFault:
    "Oczekujące z naszej / zewnętrznej winy = status Oczekujące + powód blokady z flagą Nasza lub Zewnętrzna w ustawieniach.",
} as const;
