# 08 — DECYZJE ARCHITEKTONICZNE

Rozstrzygnięcia konfliktów wykrytych przy inwentaryzacji kodu przed wdrożeniem modułu
role/kompetencje/zastępstwa/fazy komunikacji/obciążenie (`/docs/04`, `/docs/05`).

**Te decyzje mają pierwszeństwo przed treścią plików 04 i 05 tam, gdzie się różnią.**

Status: zatwierdzone przez właściciela, trzy rundy uzupełnień (D1–D5, D6–D9, D10–D11), plus
uzupełnienie przy starcie fazy 2 (D12–D15, tu przenumerowane z wcześniejszej korespondencji) i D16
dodane przy realizacji fazy 2.

---

## D1. Konfiguracja szablonu — rozdzielić kopię od danych własnych projektu

**Konflikt:** `syncProjectProcessFromTemplate()` nadpisuje cały `template_snapshot`. Założenie
z 04 §0.2, że atrybuty są „edytowalne per projekt", jest niewykonalne bez przebudowy silnika
sync — ręczne korekty znikałyby przy najbliższej synchronizacji, tak jak dziś znikają doraźnie
dodane elementy.

**Decyzja: specyfikacja 04 §0.2 była błędna. Nie robimy nadpisań w snapshocie.**

| Klasa | Gdzie żyje | Edytowalne per projekt? | Zawartość |
|---|---|---|---|
| **Standard firmy** | `template_snapshot` | **nie** | faza komunikacji bazowa, wagi, SLA, macierz odpowiedzialności rola×etap, wymagane kompetencje, wymagane komunikaty, `requires_stage_lead` |
| **Dane własne projektu** | osobne pola instancji, **poza snapshotem** | tak, z natury | lider etapu, daty kamieni milowych, profil klienta, obsada slotów |

Sync nadpisuje wyłącznie snapshot i nie dotyka danych własnych. Silnik sync zostaje bez zmian.

**Odstępstwo na jednym projekcie** → ręczny modyfikator fazy komunikacji z terminem wygaśnięcia.
Zakres zawężony w D6.

**Odstępstwo dla całej kategorii projektów** → wariant szablonu, nie wyjątek na projekcie.

---

## D2 / D9. ROT ma trzy źródła, ze szybkimi ofertami jako trzecim

**Konflikt zgłoszony (D2):** „oferty dodatkowe" nie istnieją jako odrębny byt; `services` to
wyceny serwisowe niepowiązane z projektem.

**Rozstrzygnięcie właściciela:** to nieporozumienie co do bytu. W systemie działają **szybkie
oferty**, które dodają się do klienta w trakcie realizacji projektu — to są te oferty dodatkowe,
i ich status „Oczekuje na klienta" **jest** statusem oczekiwania na decyzję inwestora (D9) —
szybkie oferty niosą dokładnie ten stan, którego ROT potrzebuje, nie są doklejane sztucznie.

**Weryfikacja w kodzie (potwierdzona):**
- Szybkie oferty = encja `services` ([supabase/migrations/005_services.sql](../supabase/migrations/005_services.sql)), typ `service_type='Prace dodatkowe'`, z `project_id` realnie ustawianym w formularzu ([components/service/service-form.tsx](../components/service/service-form.tsx)) — powiązanie z projektem w realizacji już istnieje, nie trzeba go dobudowywać.
- Status precyzyjny to `clientOffer.status`/`settlementOffer.status` (`ClientOfferStatus`: pending/accepted/rejected/negotiation, [lib/service/client-offer.ts](../lib/service/client-offer.ts)) — **dwa niezależne okna oczekiwania** na jednej ofercie (akceptacja wyceny i akceptacja rozliczenia po pracach), nie jedno.
- Historia: `client_offer_history`/`settlement_offer_history` (jsonb, `{at, type, offerStatus}`) — obsługuje wiele cykli, lepsze niż para znaczników czasu.
- `project_change_requests`: enum uboższy niż zakładano (`draft/pending_client/accepted/rejected/cancelled`) — brak stanu „zaakceptowana, niezrealizowana" osobno od „wykonana"; para `submitted_at`/`client_responded_at` wystarcza, bo cykl jest liniowy i jednorazowy (potwierdzone w `submitProjectChangeRequestForClient`).
- Kanban: mapowanie kolumna→status ROT musi żyć na **rzeczywistej kolumnie** (`process_kanban_columns`), nie w szablonie — `ensureKanbanBoard()` kopiuje kolumny raz, potem tablica żyje własnym życiem.
- Kanban **nie ma historii przejść między kolumnami** — `moveKanbanTask()` nadpisuje tylko `column_id`/`position`/`updated_at`, bez logu. Brak backfillu możliwego.

**D12 — historię przejść kanbana budujemy od razu, w fazie 5, nie później.** Koszt budowy jest
ten sam dziś i za pół roku, backfillu nie ma — każdy tydzień odłożenia to tydzień historii
utraconej bezpowrotnie. Tabela `process_kanban_task_column_history(task_id, column_id,
entered_at)`, zapis przy każdym `moveKanbanTask()`. Seed przy migracji: karty stojące obecnie
w kolumnach dostają wiersz z `entered_at` = data migracji i flagą `backfilled` — w UI dla takich
kart pokazywać „co najmniej od [data]", nie liczbę od zera.

**D13 — `negotiation` na szybkiej ofercie to `W_TOKU`, właściciel = zespół, nie
`OCZEKIWANIE_DECYZJA_INWESTORA`.** Kategoria `OCZEKIWANIE_DECYZJA_INWESTORA` zasila sekcję
„czego potrzebujemy od Państwa" w raporcie etapowym — oferta w negocjacji trafiając tam
mówiłaby klientowi, że czekamy na jego decyzję, podczas gdy to my jesteśmy mu winni odpowiedź.
Konsekwencja porządkująca: `kategoria_rozgraniczenia` ma sens wyłącznie dla statusu
`CZEKA_NA_ZEWNETRZNE`. Dołożyć do checklisty opiekuna (06 §1): „oferty w negocjacji bez ruchu
> 5 dni".

**D14 — finalne mapowanie źródeł ROT** (koryguje propozycję z pierwszej rundy):

| Źródło | Status źródłowy | Status ROT | Kategoria |
|---|---|---|---|
| `process_kanban_tasks` | mapowanie kolumna→status **konfigurowalne na `process_kanban_columns`** | — | z pola pozycji |
| `project_change_requests` | `pending_client` | `CZEKA_NA_ZEWNETRZNE` | `OCZEKIWANIE_DECYZJA_INWESTORA` |
| | `accepted` | `W_TOKU` | — (rozdzielenie „czeka na wykonanie"/„wykonana" poza zakresem — wymaga nowego pola) |
| | `rejected` | `ZAMKNIETE` | `POZA_ZAKRESEM` |
| | `cancelled` | `ZAMKNIETE` | — (wycofane przez zespół, inna semantyka niż `rejected`) |
| **szybkie oferty** (`clientOffer`/`settlementOffer`.status) | `pending` | `CZEKA_NA_ZEWNETRZNE` | `OCZEKIWANIE_DECYZJA_INWESTORA` |
| | `negotiation` | `W_TOKU` (D13) | — |
| | `accepted` | `W_TOKU` | — |
| | `rejected` | `ZAMKNIETE` | `POZA_ZAKRESEM` |

---

## D3. Jedna warstwa agregacji sygnałów, dwóch konsumentów

**Konflikt:** `CLAUDE.md` twierdził, że wdrożone jest zdrowie **etapu**. To był błąd w
dokumencie — w kodzie jest zdrowie **projektu**, liczone z innych sygnałów (cele, notatki ze
spotkań, zadania kanban, zmiany projektowe) niż te, które napędzają modyfikatory fazy
komunikacji.

**Decyzja:** przyjmujemy rekomendację z inwentaryzacji w całości — jedna wspólna warstwa
agregacji sygnałów (otwarte blokady, pozycje po dacie kontroli, akceptacje oczekujące > N dni,
zadania przeterminowane...), z dwoma konsumentami: zdrowie (projektu i etapu, progi z
szablonu) i modyfikatory fazy komunikacji (progi z szablonu). Zdrowie etapu budujemy od zera
jako drugiego konsumenta tej warstwy, nie jako rozbudowę zdrowia projektu.

`CLAUDE.md` poprawiony (patrz plik, wiersz o zdrowiu).

---

## D4 / D7 / D15. Kolizja pojęcia „rola" — potwierdzona ścieżka migracji

**Konflikt:** w kodzie trzy nienakładające się koncepcje roli, a specyfikacja dokłada czwartą.

**Rozstrzygnięcie właściciela:** booleany w `profile_project_access` to faktycznie
`project_role_slot`, tylko zaznaczane jako checkboxy. Po migracji zostają trzy wymiary, każdy
odpowiadający na inne pytanie:

| Pytanie | Byt | Los |
|---|---|---|
| co wolno? | `profiles.role` | zostaje bez zmian — uprawnienia to inny wymiar niż odpowiedzialność (04 §9: nie budujemy uprawnień na rolach procesowych) |
| za co odpowiada na tym projekcie? | `profile_project_access` (booleany) → `project_role_slot` | migracja |
| co umie? | `user_operational_roles` → `user_competency` | przeniesienie do modelu kompetencji (nazwa myląca — to umiejętność, nie rola) |

**Mapowanie migracji:** `is_technical_lead` → sloty `koordynator_techniczny` + `projektant` ·
`is_operational_lead` → sloty `opiekun_projektu` + `koordynator_operacyjny` · `is_developer` →
slot `wdrozeniowiec`.

**D7 — `profile_project_access` zostaje jako tabela, nie zamienia się w widok.** Nazwa mówi
wprost, jaka jest jej główna funkcja: dostęp do projektu. Migrują wyłącznie trzy kolumny
boolean. Weryfikacja ścieżek zapisu (wykonana): dokładnie dwie funkcje w
`lib/supabase/project-access-server.ts` — `saveProfileProjectAccessServer` (dostęp,
DELETE+INSERT) i `setProjectRoleFlagServer` (booleany, jeden call site) — już rozdzielone,
konsolidacja niepotrzebna.

**Defekt znaleziony przy weryfikacji:** `saveProfileProjectAccessServer` robił pełny
DELETE+INSERT listy dostępu profilu bez odtwarzania kolumn boolean — każda edycja globalnej
listy dostępu cicho zerowała flagi lidera tej osoby na wszystkich projektach. Migracja (D4)
naprawia to jako efekt uboczny (booleany przestają mieć znaczenie), pod warunkiem zachowania
kolejności: najpierw przepięcie zapisu na `project_role_slot`, potem booleany „bez znaczenia".

**D15 — dane booleanów mogą być już nieprawdziwe, nie tylko nieaktualne.** `true` znaczy „ktoś
to kiedyś ustawił", nie „to jest aktualne" — flaga ustawiona rok temu i nigdy nieaktualizowana
jest tak samo podejrzana jak flaga wyzerowana przez ww. bug. Backfill (faza 2):

1. Flaga `true` na jakimkolwiek wierszu → `source='obsada'`, `source_ref='d4_migration_backfill'`.
2. Projekt bez żadnej flagi `true` dla danej roli → fallback (łańcuch `role_fallback`),
   `source='fallback'`, `source_ref='d15_migration'` — widoczne jako luka, nie jako obsada.
3. Raport `report_project_role_slot_migration()` obejmuje **wszystkie** zmigrowane wiersze
   (obsada + fallback), nie tylko podejrzane — ok. 50 pozycji (18 projektów × kilka ról),
   dziesięć minut przeglądu, pewność zamiast domniemania.
4. `wlasciciel` nie ma żadnego źródła w starych booleanach (jedna, znana osoba w całej firmie) —
   wymaga jednego ręcznego wpisu przez właściciela, poza automatycznym backfillem.
5. `asystent_procesu` celowo pominięty w backfillu — CLAUDE.md: „domyślnie nieobsadzony";
   materializowanie fallbacku na każdym projekcie zaprzeczałoby temu domyślnemu stanowi.

**Odkrycie przy realizacji fazy 2:** `lider_montazu` figuruje w tabeli ról 04 §2.1, ale
realizowany jest przez `project_stage_leads` (faza 1, docs/04 §5) — osobny `project_role_slot`
dla tej roli dublowałby „kto jest liderem montażu" w dwóch miejscach. `lider_montazu` i
`instalator` zostają w słowniku `role` (macierz z 02§10 używa LM w etapach 7-8; `role_fallback`
ma `lider_montazu → koordynator_techniczny` do routingu) i w `role_fallback`, ale **nie** w
`project_role_slot` — wykluczenie zapisane jako dane (`role.uses_project_slot=false`), nie jako
`CHECK` na kodach, żeby dodanie kolejnej roli nieslotowej było update'em, nie migracją.

---

## D5 / D8. Jedna warstwa oceny kandydata, druga harmonogramowania

**Konflikt (D5):** `planning-assistant.ts` (prosty, bulk) i `suggestions.ts` (bogaty, per-item)
już się rozjeżdżają.

**D8 — D5 było źle sformułowane.** To nie są dwie implementacje tego samego, tylko dwie
warstwy: `suggestions.ts` = ocena kandydata (kompetencje, dostępność, znajomość projektu,
ciągłość, parowanie rozwojowe); `planning-assistant.ts` = harmonogramowanie (N sztuk pracy →
rozdział w czasie, round-robin, wolne bloki dni, deadline, limity tygodniowe). Nie scalamy.

**Zakres zmiany (faza 10):**
1. `planning-assistant.ts` przestaje mieć własną ocenę kandydata, woła `suggestions.ts`.
   Zachowuje pętlę harmonogramowania.
2. `suggestions.ts` dostaje API oceny wsadowej (N kandydatów × M elementów jednym wywołaniem).
3. Nowa logika oceny (ciągłość, parowanie rozwojowe, dopełnianie kompetencji lidera) idzie
   wyłącznie do `suggestions.ts`.

**D11 — test regresji panelu bocznego jako pozycja w zakresie, nie założenie.**
`suggestions.ts` jest używane w działającym panelu bocznym (`resource-plan-side-panel.tsx`).
Zasada ogólna: każda zmiana w module z żywym konsumentem ma osobną pozycję na regresję tego
konsumenta w szacunku, nie założenie „przecież nie ruszamy jego ścieżki".

---

## D6. Ręczny modyfikator dotyczy wyłącznie fazy komunikacji

**Konflikt:** D1 mówił „ten sam mechanizm co modyfikatory automatyczne", ale silnik z 04 §4
liczy `effective_phase = min(4, base + liczba_modyfikatorów)` — kształt „+1 do liczby".
Nadpisywanie dowolnego pola standardu ma inny kształt („zastąp wartość pola X do daty Y").

**Decyzja: nie budujemy ogólnego mechanizmu nadpisań.** Sprawdzone, że żadne inne pole
(wagi, SLA, wymagane kompetencje, macierz odpowiedzialności) nie potrzebuje odstępstwa per
projekt w runtime — korekta idzie przez kalibrację, wariant szablonu albo sloty ról. Ogólny
mechanizm „nadpisz dowolne pole" przywróciłby dokładnie to, czemu D1 miało zapobiec.

Ręczny modyfikator to modyfikator fazy z wyzwalaczem „człowiek" — rozszerzenie istniejącego
modelu o `source` (`auto`/`manual`), `created_by`, `reason` (wymagane dla manual), `expires_at`
(wymagane dla manual). Zero wpływu na fazę 1. Warunek rewizji: drugi realny przypadek użycia
nadpisania pola standardu → wracamy do ogólnego mechanizmu, z dowodem, nie przewidywaniem.

---

## D10. Słownik kodów ról — finalny w fazie 1, nie prowizoryczny

Dziewięć kodów, finalne: `wlasciciel`, `opiekun_projektu`, `koordynator_operacyjny`,
`koordynator_techniczny`, `projektant`, `wdrozeniowiec`, `lider_montazu`, `instalator`,
`asystent_procesu`. Macierz odpowiedzialności w szablonie używa siedmiu — `instalator` i
`asystent_procesu` nie niosą odpowiedzialności etapowej.

Powód: kody są kluczami w danych szablonu (macierz rola×etap, faza 1). Dodanie nowego kodu
później jest tanie; zmiana istniejącego to migracja danych w trzech miejscach naraz.

---

## D16. Reguła autor ≠ zatwierdzający — mechanizm gotowy, niewpięty

**Zgłoszone przy realizacji fazy 2:** dokumenty 02 i 04 mówią o tej regule jako o blokadzie w
kodzie. Nie jest wpięta — `process_items.kind` (checklist/protocol/settlement/kanban/note) nie
rozróżniał podtypów artefaktu, więc nie było czego przekazać do walidatora, ani z czym złączyć
tabelę `artifact_second_signature_requirement`.

**Rozstrzygnięcie:** dodać `process_items.artifact_type text` (nullable, bez logiki) już teraz —
jedna kolumna, żeby tabela przestała wisieć w próżni i żeby trzy artefakty dało się otagować
przy definiowaniu ich szablonów przyrostowo, bez czekania na osobną fazę.

**Stan po fazie 2:** tabela `artifact_second_signature_requirement` istnieje i jest zaseedowana
(trzy artefakty z 04 §2.3), reużywalny rezolwer istnieje w kodzie, kolumna `artifact_type`
istnieje na `process_items`. **Mechanizm nie jest wpięty w żaden konkretny przepływ zatwierdzania**
— `signProjectProcessItem()` (generyczny podpis checklisty/protokołu) wymusza dziś coś
przeciwnego (podpisać może tylko przypisana osoba), nie „autor nie może zatwierdzić własnego
artefaktu". Wpięcie wymaga: (a) otagowania konkretnych elementów szablonu jednym z trzech
`artifact_type`, (b) rozszerzenia konkretnego przepływu zatwierdzania o wywołanie walidatora —
żadne z tych dwóch nie jest zrobione. Ktokolwiek przeczyta 02/04 bez tego zastrzeżenia, założy,
że reguła działa. Nie działa.

---

> **D19 sprawdzone względem D17: brak kolizji.** D17 dotyczy migracji `project_role_slot`
> (kto trzyma jaką rolę), D19 dotyczy cyklu życia projektu (status, pokrycie, komunikacja).
> Różne obszary, żadna decyzja nie zmienia drugiej.

## D17. Dwie osoby z tą samą flagą — konflikt do tabeli, nie arbitralny wybór

**Zgłoszone przy przeglądzie fazy 2:** pierwsza wersja backfillu (213), gdy więcej niż jedna
osoba miała tę samą flagę (`is_technical_lead`/`is_operational_lead`/`is_developer`) na tym
samym projekcie, wybierała jedną `order by profile_id limit 1` i cicho pomijała resztę — ślad
zostawał wyłącznie jako `RAISE WARNING`, łatwy do przeoczenia w konsoli SQL Editora.

**Decyzja: żadnego arbitralnego wyboru.** Nowa tabela `project_role_slot_migration_conflict`
(`project_id`, `source_field`, `target_role_codes`, `conflicting_user_ids`, `resolved`,
`resolved_role_code`, `resolved_user_id`, `resolved_note`). Gdy backfill trafi na więcej niż
jedną osobę pod tą samą flagą: zapisuje wszystkich konfliktujących do tej tabeli, **nie
wstawia żadnego `project_role_slot`** dla spornej pary ról, i **pomija tę parę też w rundzie
fallbacku** — fallback podstawiłby zupełnie inną osobę (np. `opiekun_projektu` zamiast
spornego `koordynator_operacyjny`), co nie rozstrzyga pytania „który z dwóch", tylko je
maskuje pod inną nazwą.

Rozwiązanie konfliktu jest ręczne: wstawić właściwy `project_role_slot` dla wybranej osoby,
potem oznaczyć wiersz konfliktu `resolved=true` z `resolved_role_code`/`resolved_user_id`/
`resolved_note`. Raport `report_project_role_slot_conflicts()` do przeglądu razem z
`report_project_role_slot_migration()`.

---

> **D19 ma pierwszeństwo przed D18 w trzech miejscach — patrz D19 §6 zamiast punktu
> "Decyzja właściciela" niżej (D19 dzieli "Zamknięty" na dwa różne reżimy komunikacji zamiast
> traktować go jako jednolitą ciszę), oraz konsekwencje 1 i 2 poniżej są w D19 rozstrzygnięte
> (odpowiednio: zrobione w tej samej turze, i D19 §4 „Wstrzymanie").** Reszta D18 (odkrycia
> o kodzie, tabela czterech kombinacji) zostaje aktualna i jest cytowana wprost w D19 §5.

## D18. Nieaktywność projektu NIE wyłącza komunikacji

**Kontekst:** weryfikacja mechanizmu `projects.is_active` przed projektowaniem warstwy
komunikacyjnej. Ustalone w kodzie (nie założenia):

- Przelicznik `recomputeActiveProjectsServer()` ([lib/supabase/project-activity-recompute-server.ts](../lib/supabase/project-activity-recompute-server.ts))
  działa **codziennie** (`pg_cron`, `15 3 * * *`), nie miesięcznie — histereza 30/45 dni daje
  efekt w skali miesiąca, ale sam przelicznik odpala się codziennie.
- Sygnał aktywności (`lastActivityAt`, MAX z sześciu tabel: `project_change_requests`,
  `project_client_agreements`, `project_documents`, `time_entries`, `services`,
  `project_meeting_notes`) **nie jest nigdzie przechowywany** — liczony w pamięci na czas
  jednego przebiegu, potem odrzucany. Przetrwa wyłącznie wyliczona flaga `is_active`.
  Bezpiecznik ciszy 30-dniowy (04 §4.3) potrzebuje surowej daty, nie flagi — luka do
  zamknięcia w fazie 7/8 (rejestr zdarzeń komunikacyjnych), nie coś, co `is_active` może
  zastąpić.
- `projects.last_contact_date` **nie jest osią kontaktu z klientem** — mimo że tak wygląda
  (napędza istniejącą stronę `app/bez-kontaktu`). Ustawiane raz przy tworzeniu projektu
  (kopia z `next_contact_date`, `withAudit()` w [lib/supabase/repository.ts:15-28](../lib/supabase/repository.ts)),
  potem nigdy nieaktualizowane — brak w aplikacji jakiegokolwiek formularza, który by je
  edytował. Dane martwe, nie sygnał.
- Rozdzielenie NASZA AKTYWNOŚĆ / KONTAKT KLIENTA jest możliwe z istniejących danych, ale dziś
  scalane w jeden `MAX()` (`mergeActivity()`) — informacja, kto wywołał aktywność, ginie przy
  agregacji, nie brakuje jej u źródła. Prawdziwie klienckie pola: `client_responded_at`
  (`project_change_requests`, `project_client_agreements`), `client_offer_responded_at` i
  `settlement_offer_responded_at` (`services`). Reszta to nasza strona, z zastrzeżeniem że
  `project_change_requests.created_by_side` bywa `'client'`.

**Decyzja właściciela:** `is_active=false` **nie jest powodem do ciszy komunikacyjnej.** Przy
`flow_status='W trakcie'` i braku wstrzymania, nieaktywność jest **alertem** — „projekt
porzucony administracyjnie" — nie sygnałem do wygaszenia rytmu kontaktu. Komunikację wyłączają
wyłącznie: `flow_status='Zamknięty'`, `flow_status='Wygaszony'`, oraz wstrzymanie z jawną datą
powrotu.

**Cztery kombinacje po rozdzieleniu osi (do wykorzystania w fazie 7/8):**

| Nasza aktywność | Kontakt klienta | Znaczenie |
|---|---|---|
| tak | tak | zdrowo |
| tak | nie | klient milczy — cisza po jego stronie |
| nie | tak | **my nie reagujemy** — najgorsze wizerunkowo |
| nie | nie | dzisiejsze `is_active=false`, ale nieodróżnialne od powyższego bez rozbicia osi |

**Konsekwencje, którym trzeba zaradzić przed wdrożeniem silnika faz komunikacji:**

1. ~~`flow_status='Wygaszony'` ma dziś w konfiguracji `isClosed=false`~~ — **ZROBIONE**, patrz D19 §7
   (`isClosed=true` ustawione w `app_settings.field_options`, migracja 217).
2. ~~„Wstrzymanie z datą powrotu" nie istnieje jako pojęcie w schemacie~~ — **ZAPROJEKTOWANE I ZBUDOWANE**,
   patrz D19 §4 (`project_holds`, migracja 218). Nie jako status `flow_status` (D19 mówi wprost: to
   modyfikator, nie status), tylko osobna tabela z trzema wymaganymi polami.
3. Trwałe przechowywanie `lastActivityAt` (rozdzielone na `last_internal_activity_at`/
   `last_client_activity_at`) to warunek konieczny bezpiecznika 30-dniowego — **wciąż nie istnieje**,
   szczegóły i pełna lista pól w D19 §5 i w tabeli brakujących danych pod D19.

---

## D19. Cykl życia projektu i bramy komunikacji

**Status: zatwierdzone przez właściciela. Ma pierwszeństwo przed D17/D18 tam, gdzie się różnią —
patrz notki przy D17 i D18 powyżej.** Zrealizowane w tej samej turze co zapis: p. „Zrobione teraz"
na końcu. Reszta to materiał na fazy 4+ (przeplanowanie osobno, poniżej tej decyzji).

### 1. Cykl życia

Statusy przepływu tracą możliwość ręcznej zmiany w projekcie, poza jednym wyjątkiem:

| Przejście | Wyzwalacz |
|---|---|
| założenie → w trakcie | automat |
| Etap 10 osiągnięty → zamknięty | automat |
| koniec pokrycia → wygaszony | automat |
| rezygnacja klienta → wygaszony | **ręcznie, z powodem — jedyna dozwolona ręczna zmiana** |

Powód wyjątku: projekt przerwany w połowie nigdy nie dojdzie do Etapu 10, a żaden sygnał w danych
nie odróżni go od projektu, który po prostu stoi.

### 2. Status jako funkcja, nie maszyna stanów

```
status =
   wygaszenie ręczne        -> wygaszony
   Etap 10 nieosiągnięty    -> w trakcie
   aktywne pokrycie dziś    -> zamknięty
   w przeciwnym razie       -> wygaszony

pokrycie = pierwotna gwarancja LUB umowa serwisowa obejmująca dziś
```

Powrót z wygaszonego dzieje się sam: klient podpisuje przedłużenie, pokrycie obejmuje dziś,
projekt następnego ranka jest zamknięty i ma tryb serwisowy. Przerwy w pokryciu też obsługują
się same i są stanem prawdziwym, nie luką w danych.

**a) Przedłużenie/umowa serwisowa = nowy rekord z datami od-do, nigdy edycja pierwotnej gwarancji.**
Pierwotna biegnie od protokołu przekazania rozdzielni (Etap 7) i zostaje nietknięta jako fakt
historyczny — inaczej poprawka literówki w dacie przypadkowo wskrzesza projekt.

**Weryfikacja w kodzie (zrobiona w tej turze):** taki byt **nie istnieje ogólnie**. Jest
`viz_service_contracts` (`valid_from`/`valid_until`/`sla_response_hours`/`is_active`) — dokładnie
ten kształt — ale keyowany przez `dashboard_id → viz_dashboards → viz_dashboard_projects`, czyli
scope'owany do klientów z monitoringiem BMS (2 powiązania projekt-dashboard w całej bazie, nie
122). Nie nadaje się do przepisania na ogólne pokrycie bez pomieszania dwóch różnych produktów.
**Gdzie powinien powstać:** nowa tabela, roboczo `project_coverage_periods`
(`project_id, kind ['gwarancja_pierwotna'|'przedluzenie'|'umowa_serwisowa'], starts_at, ends_at,
source_ref/note, created_by, created_at`) — append-only. Pierwotna gwarancja dostaje jeden
wiersz seedowany z istniejących `projects.system_handover_at` + `warranty_duration_months`;
każde kolejne przedłużenie to kolejny INSERT. Nie zbudowane teraz — materiał na fazę cyklu życia
(patrz przeplanowanie niżej).

**b) `wygaszenie_zrodlo = 'auto_pokrycie' | 'reczne'`.** Wygaszenie ręczne ma pierwszeństwo przed
wszystkim — taki projekt NIE wraca na "zamknięty" przez wpisanie pokrycia. Wraca tylko ręcznie i
na "w trakcie" (tam wraca się do pracy, nie do gwarancji). Pole nie istnieje jeszcze — na liście
brakujących danych niżej.

**c) Wznowienie pokrycia generuje komunikat do klienta** (umowa aktywna od kiedy, kanał zgłoszeń,
SLA) — do zatwierdzenia przez człowieka jak każdy komunikat. Zależne od silnika komunikatów
(faza rejestru zdarzeń), nie buduje się teraz.

### 3. Status "Oczekuje" — zrobione w tej turze

- Wartość **zostaje w konfiguracji** (`app_settings.field_options.flowStatuses`) — nie usunięta.
- Wszystkie projekty przestawione z "Oczekuje" na "W trakcie" (migracja 217, asercja liczby
  wierszy, zweryfikowane: 16 projektów, `39 = 23+16` po zmianie).
- Usunięta z listy wyboru w formularzu projektu (`components/project-form.tsx`), z zachowaniem
  bieżącej wartości, gdyby jakiś projekt jednak ją miał — select się nie zeruje.
- **Nie zrobione, materiał na silnik faz (przyszła faza):** reguła awaryjna "gdyby projekt miał
  status Oczekuje, traktuj jak W trakcie" — nie ma dziś silnika, do którego by to wpiąć.
- Ręczne notatki "na co czekamy" nietknięte — do uporządkowania przez właściciela później,
  prawdopodobnie do ROT jako pozycje z właścicielem i datą kontroli.

### 4. Wstrzymanie — zbudowane w tej turze

Modyfikator, nie status. Tabela `project_holds` (migracja 218): `reason`, `agreed_with` (kto po
stronie klienta), `expected_return_date` — wszystkie trzy `NOT NULL` z `CHECK` na niepustość
tekstu. Bez daty powrotu nie da się zapisać wiersza. Wygasa samo — aktywność liczona z daty
(`expected_return_date >= current_date`), nie ze stanu; widok `project_active_holds` zwraca jeden
wiersz per projekt z dziś aktywnym wstrzymaniem, zweryfikowany na żywo w obie strony (data
przeszła → widok pusty, data przyszła → widok pokazuje wiersz).

Nie zbudowane teraz: wpięcie w silnik faz komunikacji (brama #4, §6 niżej) i w alert "porzucony
administracyjnie" (§5.4) — czekają na te fazy, `project_active_holds` jest gotowym punktem
zaczepienia.

### 5. `is_active`

Flaga zostaje, histereza 30/45 i cron codzienny bez zmian. Cztery uzupełnienia (nie zbudowane
teraz — pełna lista w tabeli brakujących danych):

1. `last_activity_at` jako trwała kolumna na projekcie, uzupełniana tym samym cronem — dziś
   znika po każdym przebiegu (D18).
2. Rozbicie na `last_internal_activity_at` / `last_client_activity_at` — dane źródłowe już są
   (D18: `client_responded_at` itd.), giną przy `MAX()`. Przy `project_change_requests`
   rozstrzygać po `created_by_side`.
3. Dodatkowe źródła: zadania kanban, przydziały w Planie Zasobów, `communication_event` (faza
   rejestru zdarzeń). **Kanban krytyczny** — tam będzie żył ROT, więc bez tego źródła projekt
   prowadzony wzorowo na rejestrze wygląda jak porzucony.
4. `is_active` **nie bramkuje komunikacji** (potwierdzenie D18). Nieaktywny + w trakcie + brak
   wstrzymania = alert do właściciela "projekt porzucony administracyjnie". Nie podnosi fazy —
   podniesienie fazy żądałoby cotygodniowego statusu dla czegoś, przy czym nikt nie pracuje.

Nowe mechanizmy czytają rozdzielone daty, nie flagę — flaga z `MAX()` obu osi maskuje najgorszy
z czterech przypadków (klient pisze, my nie odpowiadamy) pod tym samym "aktywny", co zdrowy stan.
Tabela czterech kombinacji — patrz D18, cytowana tam wprost, nieduplikowana tutaj.

**Pomiar zrobiony w poprzedniej turze:** dodanie kanbana + Planu Zasobów jako źródeł zmieniłoby
flagę dla **2 ze 122 projektów, oba w stronę aktywny**. Bezpieczne, nie wymaga rewizji histerezy.

### 6. Fazy komunikacji — bramy

Pierwsza pasująca wygrywa:

| # | Warunek | Wynik |
|---|---|---|
| 1 | wygaszony | brak komunikacji |
| 2 | zamknięty + po pokryciu | brak |
| 3 | zamknięty + pokrycie aktywne | **tryb serwisowy**, bez bezpiecznika ciszy |
| 4 | w trakcie + wstrzymanie | CZUWANIE, bezpiecznik 90 dni, modyfikatory wyłączone |
| 5 | w trakcie | faza z etapu + modyfikatory, bezpiecznik 30 dni |

`is_active` nie występuje w tej tabeli — działa równolegle jako źródło alertu wewnętrznego (§5.4),
nie jako brama komunikacji.

**Tryb serwisowy nie jest szóstą fazą komunikacji**, tylko osobnym reżimem: SLA na zgłoszenie
(już istnieje — `service_intake_requests`, moduł "Przyjmij/Rozlicz/Utknięte", zweryfikowany jako
działający), przeglądy po 3 i 12 miesiącach jako zdarzenia z datą (**reużyć istniejący moduł
`inspections`** — ma `project_id`, `preliminary_date`/`confirmed_date`, protokół z podpisem;
nie budować nowej tabeli), jedno powiadomienie przed końcem pokrycia. Cisza na gwarancji jest
stanem zdrowym, nie ostrzegawczym — stąd brak bezpiecznika w bramie #3.

### 7. Korekty konfiguracji — zrobione w tej turze

- `flow_status 'Wygaszony' → isClosed=true` — migracja 217.
- `/bez-kontaktu` oznaczone jako nieaktualne (baner w UI) do czasu przejęcia przez
  `communication_event` — strona zostaje, nic nie usunięte.
- **Odnotowane jako dług, nie ruszone:** konfigurowalność `isClosed`/`isWaiting`/`isInProgress`
  w `app_settings` traci sens, gdy statusy stają się automatyczne (§1-2). Nie zmieniać teraz.

### 8. Priorytet projektu

Prawdopodobnie zostanie usunięty — nie budować na nim twardych zależności. Tam, gdzie służy do
rozstrzygania remisów, ma mieć rozsądne zachowanie domyślne przy braku pola. Jedyny z czterech
wymiarów (status, zdrowie, faza komunikacji, priorytet), który jest decyzją, nie pomiarem —
automatyczne podbijanie do "krytyczny" mierzy konsekwencję opóźnienia, czyli należy do wspólnej
warstwy agregacji sygnałów z D3, nie do priorytetu jako osobnego pola.

### Zrobione teraz (ta tura)

Migracje 217 (`Wygaszony→isClosed`, przestawienie Oczekuje→W trakcie, oba z asercją liczby
wierszy) i 218 (`project_holds` + `project_active_holds`), filtr "Oczekuje" w UI, baner na
`/bez-kontaktu`, weryfikacja bytu pokrycia (nie istnieje ogólnie — patrz §2a) i modułu Serwis
(istnieje — `service_intake_requests`, patrz §6).

---

## Kolejność decyzji względem faz

| Decyzja | Blokuje | Status |
|---|---|---|
| D1 + D6 | faza 1 | zatwierdzone, zrealizowane |
| D4 + D7 + D15 | faza 2 | zatwierdzone, zrealizowane (backfill + raport) |
| D3 | faza 4 (warstwa sygnałów) | zatwierdzone, do realizacji |
| D2 + D9 + D12 + D13 + D14 | faza 5 (ROT) | zatwierdzone, do realizacji |
| D5 → D8 + D11 | faza 10/11 (planowanie) | zatwierdzone, do realizacji |
| D16 | — | świadomo pozostawiona granica zakresu, nie blokuje żadnej konkretnej fazy — wpięcie czeka na fazę, która realnie tworzy te trzy artefakty jako osobne, taggowalne elementy |
| D17 | faza 2 | zatwierdzone, zrealizowane (tabela konfliktów, zero przypadków w danych produkcyjnych) |
| D18 | faza 7/8 (rejestr zdarzeń komunikacyjnych, silnik faz) | częściowo nadpisane przez D19 — patrz notka przy D18 |
| D19 | nowa faza „Cykl życia projektu" + rozszerzenia faz sygnałów/ROT/is_active/komunikacji — patrz przeplanowanie poniżej | zatwierdzone; część zrealizowana od razu (§3, §4, §7 — migracje 217-218), reszta materiał na fazy 4+ |

---

## Poprawki do wcześniejszych dokumentów

| Plik | Co poprawić | Status |
|---|---|---|
| `CLAUDE.md` | wiersz o zdrowiu — patrz D3 | zrobione |
| `04` §0.2 | usunąć „edytowalne per projekt"; podział na standard firmy i dane własne projektu wg D1 | do zrobienia |
| `04` §2 | dodać mapowanie migracji z `profile_project_access` i `user_operational_roles` wg D4; dopisać wyłączenie `lider_montazu`/`instalator` ze slotów | do zrobienia |
| `04` §2.3 | dopisać zastrzeżenie z D16 — mechanizm gotowy, niewpięty | do zrobienia |
| `04` §4 | modyfikator ręczny z terminem wygaśnięcia jako mechanizm odstępstwa per projekt (D6, zawężony zakres) | do zrobienia |
| `05` §8.5 | ROT z trzech źródeł wg D14; zadanie weryfikacyjne domknięte | do zrobienia |
| `05` | dodać warstwę agregacji sygnałów jako wspólną zależność zdrowia i modyfikatorów | do zrobienia |
