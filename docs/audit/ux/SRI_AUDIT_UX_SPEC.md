# SRI_AUDIT_UX_SPEC — responsywna ankieta audytowa

> Cel: wygodna, krokowa ankieta SRI działająca na desktopie, tablecie i telefonie —
> także dla instalatora na obiekcie. **Nie zmienia logiki SRI ani punktacji.**
> Frontend wyłącznie zapisuje odpowiedzi i pobiera gotowe pytania z backendu.

## Zasady

- Krokowy formularz (jeden krok = jedna domena SRI, 9 domen) zamiast długiej listy.
- Pasek postępu + procent ukończenia (odpowiedzi / wszystkie pytania widoczne).
- Nawigacja: dalej / wstecz, skok do dowolnej domeny, „zapisz i dokończ później".
- Autozapis po każdej odpowiedzi (debounce), wskaźnik stanu zapisu (Zapisywanie… / Zapisano).
- Blokada utraty niezapisanych zmian (`beforeunload`, gdy jest zapis w locie).
- Kontynuacja z innego urządzenia: stan trzymany w DB (sesja audytu), nie w kliencie.

## Pytania

Źródło: `GET /api/audit/{id}` → `questions[]` generowane z metodologii (usługa SRI = pytanie,
poziomy 0..FLmax). Widok pytania:

- prosta treść (nazwa usługi PL),
- „Wyjaśnienie techniczne" — rozwijane (opis poziomów / usługi),
- „Dlaczego to ważne" — znaczenie energetyczne/biznesowe,
- „Jaki dowód dodać" — wskazówka evidence,
- „Podpowiedź dla instalatora" — opcjonalna.

### Typy odpowiedzi (model uniwersalny UAE; SRI używa `single_choice`)

`yes_no`, `single_choice`, `multi_choice`, `number`, `text`, `photo`, `document`, `measurement`.
Dla SRI pytanie to `single_choice` po poziomach FL (0..FLmax) — to jedyny nośnik punktacji.
Pozostałe typy są obsłużone w UI i modelu danych pod przyszłe metodologie (nie wpływają na wynik SRI).

### Oznaczenia pytania

- wymagane / opcjonalne,
- wymaga dowodu (evidence),
- wymaga ręcznej weryfikacji.

Dla SRI MVP: wszystkie pytania „opcjonalne" (brak odpowiedzi = poziom 0 nie jest wymuszany),
flaga „wymaga dowodu" pochodzi z warstwy dependency (informacyjnie).

### Status odpowiedzi (metadana audytora, poza punktacją)

`confirmed` (potwierdzona), `uncertain` (niepewna), `to_verify` (do weryfikacji),
`no_data` (brak danych). Zapisywane w `audit_answers.verification_status`.

### Notatka audytora

Pole `note` per pytanie (`audit_answers.note`).

## Pytania warunkowe / pomijanie

- Filtrowanie warunkowe: usługi z `mutual_exclusion_group` — po wyborze jednej, pozostałe z grupy
  są wyszarzane/pomijane (UI). Nie zmienia to katalogu ani punktacji.
- Pomijanie nieistotnych: możliwość zwinięcia całej domeny („nie dotyczy budynku") — usługi domeny
  nie są wtedy oceniane (brak w `services` → domena pomijana w SR, zgodnie z metodologią).

## Stany UI

- Skeleton loading przy pobieraniu pytań.
- Komunikaty błędów (zapis/sieć) nieblokujące, z retry.
- Offline-friendly: ostatni stan w pamięci; przy braku sieci autozapis kolejkuje i ponawia.
- Autosave: `PUT /api/audit/{id}/answers` (odpowiedzi) + `verification_status`/`note`.

## Dostępność

- Elementy formularza z etykietami (`label`), focus states, obsługa klawiatury,
  kontrast zgodny z WCAG AA, „touch targets" ≥ 40px (obiekt/telefon).

## Poza zakresem (świadomie)

- Pełny CRDT offline sync (kolejka + ponowienie wystarcza dla MVP),
- edycja katalogu metodologii z poziomu ankiety.
