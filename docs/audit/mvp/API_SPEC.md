# API Spec — MVP audytu SRI

> Bazowy prefix: `/api/audit`. Wszystkie endpointy wymagają zalogowania
> (`requireAuthenticatedProfile`). Runtime: `nodejs`. Błędy: `{ error: string }` + status HTTP.
> Sesja należy do użytkownika (`owner_id`); dostęp tylko właściciela.

## POST /api/audit — utworzenie audytu
Request:
```json
{ "name": "Audyt biura Kraków" }
```
Response 201:
```json
{ "session": { "id": "uuid", "name": "...", "status": "draft", "createdAt": "..." } }
```

## GET /api/audit — lista audytów użytkownika
Response 200:
```json
{ "items": [ { "id": "uuid", "name": "...", "status": "draft", "createdAt": "..." } ] }
```

## GET /api/audit/{id} — szczegóły + pytania + odpowiedzi
Response 200:
```json
{
  "session": { "id":"uuid","name":"...","status":"methodology_selected",
               "methodologyVersionId":"eu-sri-v4.5","buildingType":"non_residential",
               "climateZone":"north_europe" },
  "methodologies": [ { "id":"eu-sri-v4.5","label":"SRI (EU 2020/2155) v4.5" } ],
  "buildingTypes": ["residential","non_residential"],
  "climateZones": ["north_europe","south_europe","west_europe","north_east_europe","south_east_europe"],
  "questions": [
    { "code":"H-1a","domain":"heating","domainNamePl":"Ogrzewanie","namePl":"...","flMax":4,
      "levels":[ {"level":0,"descriptionEn":"No automatic control"}, ... ] }
  ],
  "answers": { "H-1a": 2 },
  "hasResults": false
}
```
> `questions` puste, dopóki nie wybrano metodologii (status `draft`).

## POST /api/audit/{id}/methodology — wybór metodologii + kontekst
Request:
```json
{ "methodologyVersionId":"eu-sri-v4.5", "buildingType":"non_residential", "climateZone":"north_europe" }
```
Response 200: `{ "session": { ...zaktualizowana, status:"methodology_selected" } }`
Błędy: 400 (nieznana metodologia / typ / strefa).

## PUT /api/audit/{id}/answers — zapis odpowiedzi
Request (mapa kod→poziom; częściowa aktualizacja dozwolona):
```json
{ "answers": { "H-1a": 2, "C-1a": 0 } }
```
Response 200: `{ "answers": { ...pełny stan }, "status":"in_progress" }`
Błędy: 400 (nieznany kod / poziom poza [0..FLmax]), 409 (brak metodologii).

## POST /api/audit/{id}/evidence — dodanie evidence (multipart/form-data)
Pola: `file` (binarny), `questionCode` (string, opcj.), `caption` (string, opcj.).
Response 201:
```json
{ "evidence": { "id":"uuid","questionCode":"H-1a","caption":"...","storagePath":"...","createdAt":"..." } }
```

## GET /api/audit/{id}/evidence — lista evidence
Response 200: `{ "items": [ { "id","questionCode","caption","storagePath","createdAt" } ] }`

## POST /api/audit/{id}/run — Calc + Rec + Opt + Roadmap
Request: brak ciała (używa zapisanego stanu).
Działanie: buduje `AssessmentInput`, liczy `CalculationResult`, rekomendacje, roadmapę;
zapisuje do `audit_results`; status → `completed`.
Response 200:
```json
{
  "calculation": { "totalScorePercent": 44.29, "class": {"label":"E","number":5}, "perDomain":{}, "perCriterion":{} },
  "recommendationCount": 21,
  "roadmapStages": 5,
  "status": "completed"
}
```
Błędy: 409 (brak metodologii lub odpowiedzi), 400 (walidacja `AssessmentInput`).

## GET /api/audit/{id}/report — złożony raport
Response 200:
```json
{
  "session": { "id","name","methodologyVersionId","buildingType","climateZone" },
  "calculation": { "totalScorePercent","class","perDomain","perCriterion","perService" },
  "recommendations": [ { "code","namePl","domainPl","priority","expectedGainPercent","currentLevel","targetLevel","gapDescription" } ],
  "roadmap": [ { "stageId":1,"name":"...","actions":[ {"code","namePl","priority"} ] } ]
}
```
Błędy: 409 (status != `completed`).

## Kody statusów
- 200 OK, 201 Created, 400 walidacja, 401 brak logowania, 403 nie właściciel,
  404 nie znaleziono, 409 zły stan sesji, 500 błąd serwera.
