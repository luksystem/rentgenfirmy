# Backlog — na później

Lista rzeczy odłożonych na później. Po zrobieniu odhacz punkt (`[x]`) i ewentualnie dopisz datę w komentarzu.

---

## Moduły

### [ ] Interaktywne kalkulacje sprzedażowe

Osobny moduł w grupie **Oferty**, niezależny od szybkiego rozliczania serwisowego (`/oferty`).

- **Nazwa w UI:** Kalkulacje sprzedażowe
- **Trasa (placeholder):** `/kalkulacje`
- **Definicja modułu:** `lib/modules/commercial-modules.ts` → `salesCalculations`
- **Strona placeholder:** `app/kalkulacje/page.tsx`

**Zakres (do doprecyzowania przy starcie):**

- [ ] Model danych — kalkulacje, warianty, pozycje, cenniki Smart Home
- [ ] UI tworzenia i edycji interaktywnej wyceny
- [ ] Publiczny link dla klienta (podobnie jak `/oferta/[token]`, ale pod kalkulacje)
- [ ] Akceptacja / prośba o konsultację / odrzucenie po stronie klienta
- [ ] Integracja z klientami i projektami (jeśli potrzebna)
- [ ] Ustawienie `available: true` w `commercial-modules.ts` po uruchomieniu modułu

---

## Inne

### [ ] Uprawnienia wg ról użytkowników

Na razie **administrator** i **manager** mają pełny dostęp do aplikacji. Role `pracownik`, `klient`, `gość` też mogą korzystać z aplikacji — granularne ograniczenia do wdrożenia później.

- [ ] Macierz uprawnień per moduł (projekty, oferty, zlecenia, raport, admin)
- [ ] Ograniczenie tras i akcji API wg roli
- [ ] Aktualizacja RLS w Supabase (`auth.uid()` zamiast otwartych polityk)

### [ ] Edycja szablonów procesów w UI

Obecnie szablony procesów są seedowane domyślnie (Dom, Sklep, Serwis, Inne). Do wdrożenia później:

- [ ] Edytor etapów, kamieni milowych i elementów w `/procesy/[typ]`
- [ ] Dodawanie/usuwanie checklist, protokołów odbioru, rozliczeń

<!-- Dodawaj kolejne punkty poniżej -->
