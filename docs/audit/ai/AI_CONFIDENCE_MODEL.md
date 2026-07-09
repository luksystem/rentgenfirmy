# AI Confidence Model

> Model pewności AI Audit Assistant. Etap projektowy — bez kodu.
> Pewność steruje tym, kiedy AI prefilluje, kiedy dopytuje, a kiedy żąda dowodu.

Powiązane: `AI_AUDIT_ASSISTANT.md`, `AI_DECISION_ENGINE.md`, `AI_CONTEXT_MODEL.md`, `AI_QUESTION_SELECTION.md`.

---

## 1. Po co pewność

Confidence (0..1) mówi, **jak bardzo można zaufać** danej informacji zanim wpłynie na audyt.
Steruje zachowaniem asystenta i chroni jakość wyniku:

- wysoka pewność → można prefill/autofill,
- średnia → zaproponuj, ale poproś o potwierdzenie,
- niska → dopytaj lub zażądaj dowodu (`needs_verification`).

Pewność jest **sygnałem doradczym** — nie zmienia oficjalnego wyniku, ale decyduje o
tym, ile dowodów zbieramy i co trafia do walidacji.

---

## 2. Poziomy pewności (na czym liczona)

```
Confidence
├─ per_answer     pewność pojedynczej odpowiedzi
├─ per_section    agregat po pytaniach sekcji (np. domena SRI)
└─ overall        agregat całej sesji
```

---

## 3. Źródła pewności (per answer)

Pewność odpowiedzi zależy od źródła i jego wiarygodności:

| Źródło (`source`) | Bazowa pewność | Uwagi |
|---|---|---|
| `manual` (audytor wprost) | 0.95 | człowiek deklaruje wprost |
| `device` (odczyt urządzenia/BMS) | 0.90 | zależnie od jakości eksportu |
| `document` (fakt z DTR/protokołu) | 0.85 | zależnie od trafności cytatu |
| `vision` (analiza zdjęcia) | 0.70 | zależnie od jakości/jednoznaczności |
| `ai_suggested` (wnioskowanie LLM) | 0.55 | zawsze do potwierdzenia |
| `inferred` (Device Profile) | 0.75 | „Loxone → harmonogram” |

Modyfikatory (dodają/odejmują):

| Czynnik | Wpływ |
|---|---|
| potwierdzenie dowodem (evidence) | +0.15 |
| zgodność z innymi odpowiedziami | +0.05 |
| niespójność z innym polem | −0.30 |
| wartość spoza typowego zakresu | −0.20 |
| brak wymaganego dowodu | −0.15 |
| potwierdzenie przez audytora | ustaw 0.98 |

```
confidence(answer) = clamp( base(source) + Σ modifiers , 0, 1 )
```

---

## 4. Agregacja

```
per_section  = weighted_avg( per_answer for questions in section,
                             weight = question.importance )
             − penalty(missing_required) − penalty(open_inconsistencies)

overall      = weighted_avg( per_section, weight = section.contribution_to_result )
             − penalty(global_inconsistencies)
```

`importance` / `contribution_to_result` pochodzą z Dependency Engine i wag metodologii
(pytania rozstrzygające o wyniku ważą więcej). Braki i niespójności obniżają agregaty
silniej niż pojedyncza słaba odpowiedź.

---

## 5. Progi i akcje

| Zakres | Etykieta | Zachowanie AI |
|---|---|---|
| ≥ 0.85 | High | może `prefill`/autofill (wg trybu); dowód tylko jeśli wymagany metodologią |
| 0.60 – 0.85 | Medium | `prefill` jako propozycja + prośba o potwierdzenie |
| 0.40 – 0.60 | Low | `add_question` doprecyzowujące lub `request_evidence` |
| < 0.40 | Very low | `mark_needs_verification`; blokuje autofill; wymaga człowieka/dowodu |

Progi konfigurowalne per rodzina szablonu (audyty formalne — wyższe progi).

---

## 6. Powiązanie z lifecycle i evidence

- Odpowiedzi `needs_verification` (niska pewność) liczą się jako **niekompletne** przy
  bramce `completed → validated`, dopóki nie zostaną potwierdzone/udowodnione.
- Sekcje o niskiej pewności są sygnalizowane audytorowi przed walidacją (tryb Review).
- `request_photo` / `request_measurement` z Decision Engine są wyzwalane, gdy pewność
  poniżej progu, a informacja jest istotna dla wyniku (`blocks_result` / `unlocks_services`).
- Pewność wpływa na `information_gain` w Question Selection — najpierw rozstrzygamy to,
  co niepewne i ważne.

---

## 7. Kalibracja i uczciwość sygnału

- **Kalibracja** — bazowe pewności źródeł walidowane empirycznie (czy „0.70 wizji” realnie
  trafia w ~70%). Do korekty po zebraniu danych z realnych audytów.
- **Bez fałszywej pewności** — AI nie zawyża pewności, by „domknąć” audyt; brak podstawy →
  niska pewność, nie zgadywanie.
- **Rozróżnienie niewiedzy od zaprzeczenia** — „nie wiem” (niska pewność, `uncertain`) ≠
  „nie ma” (odpowiedź `no`, wysoka pewność). Traktowane inaczej w scoringu i rekomendacjach.

---

## 8. Zapis i audytowalność

Każda wartość pewności i jej zmiana zapisywana z uzasadnieniem:
```
{ question_code, confidence, source, modifiers_applied: [...],
  changed_by: rule|evidence|auditor, ts }
```
Trafia do `audit_event`, więc da się odtworzyć, dlaczego dana informacja miała taką pewność
i co ją podniosło/obniżyło. To warunek zaufania do asystenta w audytach formalnych.

---

## 9. Podsumowanie przepływu

```
odpowiedź/dowód → base confidence(source) → modyfikatory → per_answer
   → agregacja → per_section / overall
   → progi → akcje (prefill / dopytaj / żądaj dowodu / needs_verification)
   → wpływ na Question Selection (information_gain) i lifecycle (bramka walidacji)
```

Model pewności spina Decision Engine, Question Selection i Lifecycle w jeden spójny mechanizm
sterowania jakością audytu — bez ingerencji w deterministyczny wynik metodologii.
