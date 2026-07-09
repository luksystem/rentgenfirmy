# Audit Lifecycle

> Cykl życia sesji audytu: statusy, przejścia, bramki, role i ścieżka audytowa. Etap projektowy — bez kodu.

Powiązane: `UNIVERSAL_AUDIT_ENGINE.md`, `AUDIT_DATA_MODEL.md`, `AUDIT_EXECUTION_FLOW.md`, `AUDIT_PLUGIN_ARCHITECTURE.md`.

---

## 1. Statusy sesji

| Status | Znaczenie |
|---|---|
| `draft` | Sesja utworzona, konfiguracja/kontekst niekompletne. Brak zbierania odpowiedzi. |
| `started` | Kontekst ustalony (typ budynku, strefa). Rozpoczęto audyt. |
| `in_progress` | Trwa zbieranie odpowiedzi i dowodów. |
| `waiting_for_evidence` | Wszystkie wymagane pytania odpowiedziane, ale brakuje wymaganych dowodów. |
| `completed` | Komplet odpowiedzi + dowodów; brak blokerów. Gotowe do walidacji. |
| `validated` | Rules Engine przeszedł (brak krytycznych/blokerów), wynik policzony. |
| `approved` | Zatwierdzone przez uprawnioną osobę. Wynik i raport oficjalne. |
| `archived` | Zamknięte, tylko do odczytu. Zachowane dla historii/porównań. |

---

## 2. Diagram przejść

```
          create
            │
            ▼
        ┌────────┐  set context   ┌─────────┐  first answer  ┌──────────────┐
        │ draft  │───────────────▶│ started │───────────────▶│ in_progress  │
        └────────┘                └─────────┘                └──────┬───────┘
                                                                    │
                                     evidence missing               │ all required answered
                                 ┌──────────────────────────────────┤
                                 ▼                                   ▼
                       ┌───────────────────────┐  evidence   ┌──────────────┐
                       │ waiting_for_evidence   │────────────▶│  completed   │
                       └───────────┬───────────┘  complete    └──────┬───────┘
                                   │ add answer                       │ run Rules + Calc
                                   ▼ (back)                           ▼
                              in_progress                       ┌──────────────┐
                                                                │  validated   │
                                                                └──────┬───────┘
                                                                       │ approve
                                                                       ▼
                                                                ┌──────────────┐
                                                                │  approved    │
                                                                └──────┬───────┘
                                                                       │ archive
                                                                       ▼
                                                                ┌──────────────┐
                                                                │  archived    │
                                                                └──────────────┘

  Ścieżki dodatkowe:
   in_progress ⇄ waiting_for_evidence   (dowody dochodzą/znikają)
   validated → in_progress              (odrzucenie walidacji / poprawki, tworzy rewizję)
   approved  → (nowa sesja/rewizja)     (approved jest niemutowalne)
```

---

## 3. Bramki (warunki przejść)

| Przejście | Bramka (musi być spełniona) |
|---|---|
| draft → started | kontekst zawiera pola z `plugin.required_context` |
| started → in_progress | co najmniej jedna odpowiedź zapisana |
| in_progress → completed | wszystkie *widoczne + wymagane* pytania odpowiedziane (lub `not_applicable`) |
| in_progress → waiting_for_evidence | jw., ale istnieje `evidence_missing` w wymaganych |
| waiting_for_evidence → completed | wszystkie wymagane dowody dostarczone i (jeśli wymagane) zweryfikowane |
| completed → validated | Rules Engine: **brak** `blocker` i `critical`; obliczenie zakończone bez błędów |
| validated → approved | rola z uprawnieniem `approve`; brak nierozwiązanych `warning` oznaczonych jako blokujące zatwierdzenie |
| approved → archived | rola `admin`/właściciel; zwykle po wygenerowaniu raportu |

Bramki są **twarde** — silnik nie pozwala przejść dalej bez ich spełnienia. Naruszenia
raportowane z listą konkretnych braków (pytania/dowody/reguły).

---

## 4. Severity a lifecycle

| Severity | Wpływ |
|---|---|
| `info` | tylko informacja w raporcie |
| `warning` | nie blokuje, ale widoczne; może wymagać potwierdzenia przy `approve` |
| `error` | blokuje zapis pojedynczej odpowiedzi (walidacja pola) |
| `critical` | blokuje `completed → validated` |
| `blocker` | blokuje `completed → validated`; wymaga korekty i ponownej walidacji |

---

## 5. Role i uprawnienia (RBAC — założenia)

| Rola | draft/edycja | odpowiedzi/evidence | validate | approve | archive | podgląd |
|---|---|---|---|---|---|---|
| Auditor | tak | tak | tak | nie | nie | tak |
| Senior Auditor / Weryfikator | tak | tak | tak | tak | nie | tak |
| Administrator | tak | tak | tak | tak | tak | tak |
| Klient | nie | ograniczone (np. dostarczenie dowodów) | nie | nie | nie | tak (swoje) |
| System (AI/import) | prefill/sugestie | source=ai_suggested/device | nie | nie | nie | — |

Dokładne mapowanie do istniejącego modelu ról aplikacji — do ustalenia na etapie wdrożenia
(zgodnie z `requireAuthenticatedProfile` / `isAdministrator`).

---

## 6. Wersjonowanie sesji vs szablon/metodologia

- Sesja **przypina** `template_id` + `template_checksum` + `methodology_version_id`.
- Publikacja nowej wersji szablonu/metodologii **nie zmienia** istniejących sesji.
- Sesja w toku, gdy pojawia się nowa wersja: audytor dostaje sygnał (na podstawie
  `MethodologyDiff`), czy różnice są `requires_manual_review`. Może:
  1. dokończyć sesję na starej wersji (zalecane dla spójności), albo
  2. utworzyć **rewizję** sesji na nowej wersji (nowa sesja `inherits` odpowiedzi zgodne
     kodem pytania; zmienione/niezgodne oznaczone `needs_verification`).

---

## 7. Niemutowalność i rewizje

- `approved` i `archived` są **niemutowalne**. Poprawka = nowa rewizja sesji
  (`revision_of` → poprzednia sesja), z zachowaniem oryginału.
- Raporty `approved` mają `checksum`; ponowna generacja musi dać ten sam checksum
  z tych samych danych (determinizm).

---

## 8. Ścieżka audytowa (`audit_event`)

Każda istotna akcja tworzy zdarzenie (niemutowalne, tylko append):

| event_type | payload |
|---|---|
| `status_change` | `{from, to, actor, reason}` |
| `answer_set` | `{question, old, new, source}` |
| `answer_skipped` | `{question, rule}` |
| `evidence_added` / `evidence_verified` | `{answer, evidence_type, hash}` |
| `validation_run` | `{issues_count, blockers, criticals}` |
| `calculation_run` | `{strategy, total_score, class, engine_version}` |
| `recommendations_generated` | `{count}` |
| `roadmap_generated` | `{stages}` |
| `report_generated` | `{format, checksum}` |
| `approved` / `archived` | `{actor}` |

Ścieżka pozwala odtworzyć pełną historię: kto, kiedy, co zmienił i jaki był wynik na
każdym etapie — wymóg audytowalności dla metodologii formalnych (SRI/EPBD/LEED/BREEAM).

---

## 9. SLA / stany oczekiwania (opcjonalnie)

- `waiting_for_evidence` może mieć termin (deadline) i przypomnienia (np. do klienta).
- Sesje bezczynne w `draft`/`in_progress` mogą być automatycznie oznaczane jako
  wygasłe (bez usuwania danych) — do konfiguracji per rodzina szablonu.
