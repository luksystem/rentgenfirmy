# PUBLIC_REPORT_DATA_VISIBILITY — widoczność sekcji w raporcie publicznym

> Konfiguracja per link (`audit_report_shares.visible_sections` jsonb). Filtr stosowany
> **po stronie serwera** przy budowie publicznego modelu raportu.

## Sekcje konfigurowalne

| Klucz | Sekcja | Domyślnie |
|---|---|---|
| `overall_score` | Wynik ogólny + klasa | ✅ widoczne |
| `domains` | Wyniki domen (radar) | ✅ widoczne |
| `criteria` | 7 impact criteria | ✅ widoczne |
| `recommendations` | Rekomendacje | ✅ widoczne |
| `roadmap` | Roadmapa modernizacji | ✅ widoczne |
| `photos` | Zdjęcia / evidence | ❌ ukryte |
| `technical` | Dane techniczne (usługi, FL) | ❌ ukryte |
| `client_data` | Dane klienta (nazwa/adres) | ❌ ukryte |

## Zawsze ukryte (niezależnie od konfiguracji)

- wewnętrzne notatki audytora (`audit_answers.note`),
- statusy weryfikacji per odpowiedź (metadana wewnętrzna),
- dane wrażliwe i dane użytkowników systemu (owner, profile),
- techniczne identyfikatory (UUID sesji, storage_path evidence, ID rekordów),
- logi systemowe i dostępu.

## Reguły filtrowania (server-side)

1. Zbuduj pełny `ReportViewModel` (jak dla właściciela).
2. Usuń sekcje, których klucz nie jest w `visible_sections` = true.
3. Zawsze usuń pola z listy „zawsze ukryte" (mapowanie oczyszczające `toPublicReport()`).
4. Dla `photos`: zwracaj tylko podpisane, krótkotrwałe URL-e (signed URL), nigdy `storage_path`.
5. Dla `client_data` = false: usuń `meta.buildingName`, `meta.address`, `meta.auditor`
   (pozostaw wynik i wykresy anonimowo).

## Domyślny zestaw przy tworzeniu linku

```json
{
  "overall_score": true,
  "domains": true,
  "criteria": true,
  "recommendations": true,
  "roadmap": true,
  "photos": false,
  "technical": false,
  "client_data": false
}
```

## Kontrakt

- Publiczny endpoint zwraca `PublicReportViewModel` = `ReportViewModel` po `toPublicReport(visibility)`.
- Brak możliwości „doproszenia" ukrytych pól z klienta (serwer nie zwraca ich w ogóle).
