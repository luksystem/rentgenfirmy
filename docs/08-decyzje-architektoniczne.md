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
| ~~co umie?~~ → **jaką funkcję wykonuje na zadaniu?** | `user_operational_roles` | **zostaje bez zmian — SKORYGOWANE, patrz D22.** Trzeci, osobny wymiar (nie umiejętność), migracja do `user_competency` odwołana. |

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

## D20. Widoczność ról w UI — zapis zagregowany, odczyt nieagregowany

**Status: zatwierdzone przez właściciela.**

**Zasada:** zapis może zostać zagregowany, odczyt nie może.

### 1. Zrobione teraz (ta tura)

Trzy checkboxy (`ProjectUsersPanel`, "Osoby z dostępem do projektu") zostają jako sposób ZAPISU —
odzwierciedlają rzeczywistą obsadę firmy, gdzie jedna osoba trzyma parę slotów jednocześnie
(lider operacyjny = `opiekun_projektu` + `koordynator_operacyjny`, lider techniczny =
`koordynator_techniczny` + `projektant`). Powód pozostawienia: fallback już dziś obsadza sloty
pojedynczo, więc trzy zagregowane checkboxy mogłyby milcząco pokazywać stan niezgodny z bazą,
gdyby nie było obok nich odczytu źródła prawdy.

Pod checkboxami dodana lista faktycznych slotów w trybie WYŁĄCZNIE ODCZYTU: rola | osoba | źródło
(obsada/fallback/zastępstwo/przejęcie), dla wszystkich siedmiu kodów z `role.uses_project_slot =
true` — w tym `wlasciciel` i `asystent_procesu`, które wcześniej nie miały żadnej reprezentacji w
UI.

Implementacja: `lib/supabase/project-access-server.ts` (`fetchProjectRoleSlotsServer`,
`ProjectRoleSlotEntry`) — czyta `role.uses_project_slot` jako dane (D9), nie hardkoduje listy
siedmiu kodów; kolejność wyświetlania bierze z `PROCESS_ROLE_CODES` (kolejność, nie flaga).
Endpoint `GET /api/projects/[projectId]/accessible-profiles` i `PATCH .../[profileId]/role` zwracają
teraz `{ profiles, slots }` łącznie (jeden request zamiast dwóch). UI:
`components/dashboard/project-users-panel.tsx`, blok `ProjectRoleSlotsList`, wspólny dla
desktopu i mobile (lista, nie tabela — nie wymaga osobnego layoutu per breakpoint).

### 2. Pełny edytor siedmiu slotów — świadomy deliverable, nie efekt uboczny

**Nie zbudowany teraz.** Musi wejść do sekwencji faz jako osobna, nazwana pozycja z własnym
szacunkiem — **przed** fazą komunikacji zawierającą "przejęcie przy czerwonym" (docs/04 §4.4:
`effective_phase = KRYTYCZNA` lub zdrowie etapu czerwone → slot `opiekun_projektu` przepinany na
`wlasciciel`, `source='przejecie_czerwone'`) i **przed** fazą zastępstw urlopowych (docs/04 §6).

Powód: przejęcie przy czerwonym przepina wyłącznie slot `opiekun_projektu`, zostawiając
`koordynator_operacyjny` przy dotychczasowej osobie — to samo dla zastępstwa urlopowego, które
działa per pojedynczy slot, nie per grupa. Zagregowane UI (trzy checkboxy) nie umie ani pokazać
takiego stanu (dwie osoby pod jedną etykietą "Lider operacyjny"), ani go zapisać (przepięcie
jednego slotu z pary wymagałoby zdjęcia i ponownego zaznaczenia całej pary, gubiąc informację,
który slot faktycznie się zmienił). Mechanizmy te są zaplanowane jako jedna operacja — "przepięcie
slotu z podaniem powodu" (docs/04 §4, akapit wprowadzający) — więc edytor musi istnieć zanim
którykolwiek z nich zacznie zapisywać do `project_role_slot`.

**Uwaga o numeracji faz:** docs/04 §8 numeruje to lokalnie jako fazy modułu (3 = fazy komunikacji
z przejęciem, 5 = zastępstwa); globalna, zatwierdzona przez właściciela sekwencja 15 faz z
szacunkami (ustalona w tej samej turze rozmowy co D19, po przeplanowaniu ROT/raport/pilotaż) nie
została jeszcze przepisana do tego pliku — żyje dziś tylko w historii rozmowy. Kimkolwiek
realizującym którąkolwiek z tych dwóch faz: przed startem sprawdzić, czy edytor siedmiu slotów już
istnieje; jeśli nie, dopisać go jako pierwszy krok danej fazy, nie zakładać, że wystarczą trzy
checkboxy.

### 3. Rozdzielenie ról w firmie — świadomie poza zakresem

Nie planujemy "rozdzielenia ról w firmie" (np. rozdzielenie `opiekun_projektu` od
`koordynator_operacyjny` na dwie różne osoby na stałe) jako zadania UI — to decyzja kadrowa
właściciela, nie coś, co system ma sugerować czy przygotowywać proaktywnie. Zakres §1–2 powyżej to
wyłącznie to, żeby interfejs był **gotowy** na taką decyzję w momencie, gdy zapadnie (bo dane i
mechanizm przepięcia slotu już działają per-slot od fazy 2) — nie żeby ją planować czy zachęcać do
niej.

---

## D21. Faza 3 (Kompetencje) — operational_role_competency kluczuje na starym słowniku ról, nie na role.code

**Status: zatwierdzone przez właściciela.**

Inwentaryzacja przed implementacją (PROMPT 4, docs/role/07-prompty.md) wykazała, że `stage_competency`
z modelu w docs/04 §3.1 **już istnieje i działa end-to-end** jako `process_stage_competency_requirements`
— szablon → `template_snapshot` → walidacja ostrzegawcza w Planie Zasobów (`lib/resource-plan/validations.ts`,
zawsze `severity: "warning"`, nigdy nie blokuje) → sugestie kandydatów (`suggestions.ts`) → edytor w
panelu admina szablonu. Punkt 1 (połowa) i punkt 3 promptu były więc już zrobione — nic tam nie
zmieniono.

**Konflikt wykryty i rozstrzygnięty:** system ma dziś dwa niepowiązane pojęcia "rola":
`role.code` (9 kodów D10, `project_role_slot`, fazy 1–2) oraz `resource_dictionary_items` z
`dictionary_key='operational_role'` (starszy słownik Planu Zasobów, używany przez
`user_operational_roles` i `process_stage_role_requirements`; docs/08 D4/D7/D15 już nazwało to
rozjazdem i zaplanowało migrację `user_operational_roles` → `user_competency`, oznaczoną tam jako
"do zrobienia", nieporuszoną w tej fazie — **korekta: ta migracja jest odwołana, patrz D22**).
Docs/04 §3.1 nie precyzuje, na którą oś ma kluczować nowa tabela.

Sprawdzone przy okazji: `process_stage_role_requirements` (wymagana liczba osób danej roli na
etapie, osobny byt od kompetencji) **już kluczuje na `resource_dictionary_items`
(`operational_role`)**, dokładnie tak samo jak decyzja poniżej — żadna równoległa tabela nie jest
tam potrzebna, nic nie zmieniono.

**Decyzja właściciela: nowa tabela `operational_role_competency` (`role_item_id`) kluczuje na
`resource_dictionary_items` (`operational_role`), nie na `role.code`.** Powód: wpina się w
istniejący, działający mechanizm Planu Zasobów (te same dictionary_key co
`competency`/`competency_level`, ten sam wzorzec co `process_stage_role_requirements`) zamiast
otwierać nową, osobną ścieżkę walidacji dla `project_role_slot`. Nazwa (poprawiona migracją 222 —
pierwotnie `role_competency`) świadomie unika kolizji z `role.code`; **rozjazd wobec `role.code`
nie jest już "odłożoną migracją" — patrz D22, korekta D4/D7/D15.**

**Zrealizowane (migracje 221-222):**
- `operational_role_competency` (`role_item_id`, `competency_item_id`, `min_level_item_id`,
  `is_required`) — RLS jak `process_stage_competency_requirements`/`resource_dictionary_items`
  (SELECT dla zalogowanych, zapis `has_full_app_access()`). Edytor:
  `components/settings/operational-role-competency-editor.tsx`, wpięty w zakładkę "Role
  operacyjne" w Ustawienia → Plan Zasobów.
- `user_competencies.confirmed_by`/`confirmed_at` (docs/04 §3.1, punkt 2 promptu) — każda edycja
  poziomu czyści potwierdzenie (dotyczyło konkretnego poziomu, nie kompetencji w ogóle); przycisk
  "Potwierdź" w `components/admin/user-resource-profile-editor.tsx`. RLS bez zmian — to kolejna
  akcja administracyjna, nie nowy poziom uprawnień.
- `report_competency_gap_map()` (punkt 4 promptu, "widok dla właściciela") — role i etapy z
  wymaganiem, dla których <2 osób ma kompetencję na **najwyższym zdefiniowanym poziomie**
  (`resource_dictionary_items` `competency_level`, max `sort_order` — NIE zahardkodowany "poziom 3",
  bo poziomy są danymi admina, nie stałą w kodzie; dziś to "Ekspert", ale mogłoby być cokolwiek).
  Brak wiersza dla pary bez zdefiniowanego wymagania = brak wymagania, nie luka (ten sam standard
  co `report_project_readiness`, 219). UI: `components/resource-plan/competency-gap-map-card.tsx`,
  karta na dashboardzie Planu Zasobów, widoczna tylko dla `hasFullAppAccess` (zgodnie z "widok dla
  właściciela" z promptu — nie ogólnodostępna).
- Zweryfikowane na produkcji w transakcji z rollbackiem (syntetyczne dane, oba warianty: `rola` i
  `etap`, zarówno luka jak i brak luki) — żadne dane testowe nie zostały w bazie.

**Świadomie odłożone:** `is_required` dodany tylko na `operational_role_competency`, nie retrofitowany na
`process_stage_competency_requirements` — jedyny zaplanowany konsument (blokada autonomicznego
zastępstwa, docs/04 §3.1) należy do fazy zastępstw urlopowych, która jeszcze nie istnieje. Retrofit
`is_required` na `stage_competency` zostawiony tej fazie, żeby dodać symetrycznie z realną logiką
blokującą, nie samym polem bez konsumenta.

---

## D22. Korekta D4/D7/D15 — funkcja wykonawcza to trzeci, osobny wymiar, nie umiejętność

**Status: zatwierdzone przez właściciela. Koryguje wiersz 3 tabeli w D4/D7/D15 powyżej.**

**Co było błędne:** D4/D7/D15 sklasyfikowało `user_operational_roles` trafnie (to nie jest rola
projektowa, `role.code`), ale wyciągnęło z tego za daleko idący wniosek — że skoro to nie
odpowiedzialność za projekt, to musi być umiejętność, więc migruje do `user_competency`. Błąd:
"nie X" nie implikuje "więc Y", gdy istnieje trzecia możliwość. Ta migracja nigdy nie została
wykonana (docs/08 sam to odnotowywał jako "do zrobienia") — Faza 3 (D21) o mało nie odtworzyła tego
samego błędu przy `role_competency`/`operational_role_competency`, co ujawniło, że wniosek trzeba
było skorygować, zanim ktoś rzeczywiście wykona migrację i zepsuje Plan Zasobów.

**Poprawny model — trzy niezależne osie, nie dwie:**

| Oś | Pytanie | Byt | Co mierzy |
|---|---|---|---|
| Odpowiedzialność za projekt | za co odpowiada NA TYM PROJEKCIE? | `role.code` / `project_role_slot` (9 kodów D10) | jedna osoba na slot, per projekt — `opiekun_projektu`, `wdrozeniowiec`... |
| Funkcja wykonawcza | jaką funkcję pełni PRZY ZADANIU? | `resource_dictionary_items` (`operational_role`) / `user_operational_roles` | wielu ludzi, niezależnie od projektu — Instalator, Programista, Serwisant... (Plan Zasobów) |
| Kompetencja | jak dobrze coś umie? | `resource_dictionary_items` (`competency`/`competency_level`) / `user_competencies` | poziom (Junior…Ekspert) per konkretna umiejętność (Loxone, CCTV...) |

`user_operational_roles` **zostaje bez zmian, żadna migracja do `user_competency` się nie
odbywa** — nie dlatego, że korekta jest kosztowna, tylko dlatego, że pierwotny wniosek był
merytorycznie błędny, nie tylko niedokończony.

### Reguła rozstrzygająca redundancję (żeby nikt później ich nie scalił)

`user_operational_roles` i `user_competencies` **wyglądają na redundantne, ale pełnią różne
funkcje w tym samym mechanizmie walidacji (`lib/resource-plan/validations.ts`) i nie wolno ich
scalać:**

- **`user_operational_roles` BRAMKUJE** — czy dana osoba w ogóle może pełnić tę funkcję na
  zadaniu. Brak wymaganej roli operacyjnej → `missing_role`, ostrzeżenie. Binarne: ma/nie ma.
- **Kompetencja z poziomem RÓŻNICUJE** — jak dobrze, wśród osób, które już przeszły bramkę (albo
  niezależnie od niej). Używana do **rankingu podpowiedzi** (`suggestions.ts`,
  `scoreUserCompetencyMatch`), nie do blokowania. Stopniowalne: poziom 1–4 (dziś
  Junior/Regular/Senior/Ekspert).

Scalenie w jeden byt zgubiłoby tę różnicę — albo bramka straciłaby ostrość (stałaby się kolejnym
stopniowalnym polem), albo ranking straciłby granularność (spłaszczyłby się do ma/nie ma). Obie
tabele zostają, każda odpowiada na inne pytanie; korekta D4/D7/D15 nie jest optymalizacją do
zrobienia później, tylko stwierdzeniem, że to nie jest duplikat.

### Dług na przyszłość — `project_role_competency` (faza zastępstw, nie teraz)

Ranking kandydatów do zastępstwa (docs/04 §6, "kto może zastąpić wdrożeniowca") będzie
potrzebował wymagań kompetencyjnych **na kodach D10** (`role.code`/`project_role_slot`), nie na
`operational_role`. To jest dokładnie ta oś, na którą `operational_role_competency` (D21)
świadomie NIE kluczuje. Potrzebna będzie osobna tabela, roboczo `project_role_competency`
(`role_code`, `competency_item_id`, `min_level_item_id`, `is_required`) — analogiczna do
`operational_role_competency`, ale keyowana na `role.code` zamiast na
`resource_dictionary_items`. Nie budować teraz — materiał na fazę zastępstw urlopowych (ta sama
faza, przed którą D20 §2 wymaga pełnego edytora siedmiu slotów).

---

## D23. Faza 4 (ROT jako widok) — implementacja

**Status: zrealizowane (migracje 223-225).**

ROT pozostaje wyłącznie widokiem — cztery istniejące tabele (`process_kanban_tasks`,
`project_change_requests`, `services`, `project_client_agreements`) zostają jedynym miejscem
prawdy, zgodnie z D2/D9/D12/D13/D14 i zasadą nadrzędną "jedna informacja ma jedno miejsce".

**D12 zrealizowane przez trigger, nie przez app-code.** Spec mówiła "zapis przy każdym
`moveKanbanTask()`" — zamiast dopisywać zapis historii do trzech niezależnych ścieżek wywołania
tej funkcji (`process-kanban-board.tsx`, `aggregated-kanban-board.tsx`, publiczny
`app/api/kanban/[token]/route.ts`), `process_kanban_task_column_history` zapisuje się triggerem
`AFTER INSERT OR UPDATE OF column_id` na `process_kanban_tasks` — ta sama gwarancja kompletności,
odporna na czwartą ścieżkę wywołania w przyszłości, bez dotykania trzech miejsc w kodzie. Backfill
zweryfikowany asercją (123=123 wierszy), trigger zweryfikowany na produkcji w transakcji z
rollbackiem.

**Doprecyzowanie nieujęte wprost w D14: karta kanbana liczy się do ROT tylko gdy `closed_at is
null`.** `closed_at` to już istniejący, niezależny sygnał "zrobione" (`closeKanbanTask()`, używany
dziś w `countOpenKanbanTasks`/`countOverdueKanbanTasks`) — ROT go respektuje zamiast liczyć status
wyłącznie z kolumny, żeby zamknięta karta siedząca w zmapowanej kolumnie nie pokazywała się jako
otwarty temat.

**`report_rot_items()` zwraca wszystkie statusy, w tym `ZAMKNIETE`** — to rejestr, nie tylko lista
otwartych. UI (`/rot`) domyślnie eksponuje `CZEKA_NA_ZEWNETRZNE`/`W_TOKU`, `ZAMKNIETE` jest zwinięte
za jednym kliknięciem. `days_open` liczone od `submitted_at`/`created_at`/odpowiedzi na ofertę —
używane do wizualnego ostrzeżenia >5 dni bez ruchu (checklista opiekuna, D13).

**Czwarte źródło (`project_client_agreements`, wyłącznie `pending_client`) i Macierz Interfejsów**
— uzgodnione w rozmowie roboczej wcześniej niż ta tura, nigdy nie zapisane jako D-decyzja; zapisane
tu retroaktywnie razem z realizacją.

**Zrealizowane w Macierzy Interfejsów:** `project_trades.hired_by` ("kto zatrudnia", wolny tekst —
ten sam styl co pozostałe pola tabeli, bez nowego słownika) + pole w formularzu + wyświetlanie w
`project-trades-panel.tsx`.

**NIE zrealizowane, świadomie odłożone: grupowanie pozycji ROT po podmiocie (branży/wykonawcy).**
Żadne z czterech źródeł ROT (kanban/zmiany/oferty/ustalenia) nie ma dziś odniesienia do
`project_trades` — dodanie go wymagałoby wyboru, na którym źródle (jednym? wszystkich czterech?) i
czy ręcznie tagowane czy wywnioskowane, co jest realną decyzją projektową, nie szczegółem
implementacyjnym, i nie było nigdzie jednoznacznie rozstrzygnięte (tylko wspomniane jako "naturalne
rozwinięcie" w rozmowie roboczej). Zgodnie z CLAUDE.md ("bądź krytyczny wobec specyfikacji, zgłoś
zamiast zgadywać") — niezaimplementowane, do rozstrzygnięcia jako osobny punkt, jeśli okaże się
faktycznie potrzebne w praktyce.

**Nawigacja:** nowy moduł `rot` (`lib/navigation/nav-modules.ts`, grupa "Projekty", `/rot`),
uprawnienia `VIEW_ONLY` (`lib/permissions/module-actions.ts`) — ROT to widok/raport, nie zasób CRUD.

**Odkryte przy weryfikacji fazy 5, dotyczy też tego modułu:** `app_settings` ma zapisaną,
nadpisującą konfigurację `role_nav_permissions` (wersja 2) sprzed istnienia modułu `rot` — role
inne niż `administrator` (który ma twardy bypass w `canAccessNavModule`) NIE widzą linku ROT w menu
i strona `/rot` przekierowuje ich na `/`, dopóki ktoś z pełnym dostępem ręcznie nie doda `rot` do
listy modułów danej roli w ekranie uprawnień. To zamierzone działanie systemu uprawnień (biała
lista per rola, nadpisania nie dziedziczą nowych domyślnych modułów automatycznie), nie błąd — ale
oznacza, że **każdy nowy moduł nawigacji dodany w kolejnych fazach będzie wymagał tego samego
ręcznego kroku** po stronie właściciela, zanim ktokolwiek poza administratorem go zobaczy.

---

## D24. Faza 5 (Generator raportu etapowego) — implementacja

**Status: zrealizowane (migracja 226).**

Szablon (docs/role/03 §3, 8 sekcji + klauzula) zamknięty i niezmieniony. Zrealizowano wyłącznie
mechanikę generowania, wg sześciu punktów właściciela:

1. **Zamrożenie:** `project_stage_reports.content` (jsonb) i `coordinator_comment` są niezmienne od
   momentu, gdy `status <> 'wygenerowany'` — wymuszone triggerem `project_stage_reports_freeze`
   (nie tylko app-code), zweryfikowane na produkcji w transakcji z rollbackiem (próba zmiany treści
   po zatwierdzeniu poprawnie się nie udała).
2. **Stany `wygenerowany → zatwierdzony → wyslany`** — trigger `project_stage_reports_transitions`
   wymusza: zatwierdzenie wymaga niepustego `coordinator_comment` + `approved_at`/`approved_by`;
   wysłanie wymaga `sent_at`/`sent_by`. Regeneracja (przycisk "Odśwież treść") działa tylko, dopóki
   status pozostaje `wygenerowany` — upsert po `(project_id, milestone_id)`.
3. **`sent_at` obowiązkowe** — wymuszone triggerem, nie tylko walidacją formularza. Nazwane i
   skomentowane pod kątem przyszłej migracji do `communication_event` (faza 9): `sent_at`/`sent_by`
   → `event_at`/`actor`.
4. **Puste sekcje jawne** — `carriedOverItems`/`clientNeeds` to zawsze tablice (mogą być puste), UI
   (`renderStageReportText`) drukuje "brak pozycji otwartych"/"nic w tej chwili", nigdy nie ukrywa
   sekcji.
5. **Bez blokady zamknięcia etapu** — `project_stage_reports` nie ma żadnego FK ani triggera
   wpływającego na `project_processes`/`project_stage_history`. Świadomie odłożone do fazy 11c.
6. **UI:** panel "Raporty etapowe" w dashboardzie projektu (`components/dashboard/stage-reports-panel.tsx`,
   zakładka `stage-reports` w `client-dashboard-view.tsx`, tylko po stronie zespołu — nie w
   `PUBLIC_CLIENT_TAB_CONFIG`) — pokazuje kamienie milowe gotowe do wygenerowania (wszystkie
   elementy mają `completedAt`) oraz listę dotychczasowych raportów z przyciskiem "Kopiuj treść".
   Osobny top-level widok `/rot`-owego typu ("widok etapu") **nie powstał** — generowanie i lista
   są w jednym, wspólnym panelu projektu zamiast w dwóch miejscach (uproszczenie względem
   dosłownego brzmienia punktu 6, opisane niżej).

**Mapowanie sekcji na dane (nieoczywiste, warte zapisania):**
- "PRZENIESIONE DO NASTĘPNEGO ETAPU" i "CZEGO POTRZEBUJEMY OD PAŃSTWA" czerpią z `report_rot_items()`
  (faza 4) dla danego projektu — pierwsza sekcja to wszystkie pozycje ROT ≠ `ZAMKNIETE`, druga to
  podzbiór z `category='OCZEKIWANIE_DECYZJA_INWESTORA'` — dokładnie zgodnie z D13 ("kategoria
  OCZEKIWANIE_DECYZJA_INWESTORA zasila sekcję czego potrzebujemy od Państwa"). To bezpośrednie
  potwierdzenie, że kolejność faz (ROT przed raportem) była słuszna.
- "Kamień milowy osiągnięty" — brak w kodzie mechanizmu "reached" (sprawdzone przy inwentaryzacji:
  `milestoneDates` to tylko planowana data, `project_stage_history.milestone_reached` to martwa
  kolumna, nigdzie niezapisywana). Zdefiniowane na potrzeby tej fazy jako: wszystkie elementy
  kamienia milowego mają wpis w `project_processes.completions` — obliczane, nie przechowywane.
- "ZMIANY W TYM ETAPIE" — `project_change_requests` nie ma odniesienia do etapu; zakres wyznaczony
  przez okno `[project_stage_history.entered_at, exited_at lub teraz)` dla danego wejścia w etap.
- "DOKUMENTY DO PAŃSTWA WGLĄDU" — tylko elementy z już włączonym publicznym linkiem
  (`project_process_item_public_access.public_enabled=true`). Generowanie raportu **nie włącza
  linków automatycznie** — to byłby efekt uboczny zmieniający cudze ustawienia widoczności; opiekun
  włącza ręcznie przed generowaniem, jeśli chce dany dokument w raporcie. Świadome zawężenie zakresu
  względem `ChecklistLineAttachment` (zdjęcia) — te mają tylko czasowe, podpisane URL-e (TTL), które
  zepsułyby się w zamrożonym dokumencie; nie próbowano ich obejść.
- Pola z dosłownego szablonu, których dziś nic nie śledzi ("numer"/"właściciel"/"termin" per pozycja
  ROT, "potrzebne do"/"skutek zwłoki" per decyzja odroczona) drukują się jako jawny placeholder
  ("nie śledzone dziś"), nie są zmyślane — dokładnie ta sama zasada uczciwości co dla pustych sekcji.

**Pilotaż bez rozgałęzienia kodu:** `projects.stage_reports_pilot_enabled boolean default false` —
gdy `false`, panel pokazuje wyłącznie komunikat i przełącznik (widoczny dla `hasFullAppAccess`) do
włączenia; żadna ścieżka kodu generowania/zatwierdzania/wysyłki nie jest warunkowana per-rola ani
zduplikowana. Właściciel włącza flagę ręcznie dla 3 wybranych projektów po starcie — dobór
konkretnych projektów pilotażowych to decyzja biznesowa, celowo nie podjęta tutaj automatycznie.

---

## D25. Faza 6 (Cykl życia projektu) — status jako funkcja, z "grandfather" dla danych historycznych

**Status: zrealizowane (migracje 227-230, backend; UI opisane niżej).**

### Dwa realne konflikty znalezione przy inwentaryzacji, oba rozstrzygnięte przez właściciela

**1. Brak etapu zamykającego w 2 z 8 szablonów (16 projektów, w tym 10 dziś "Zamknięty").**
`process_stages.for_closing` to dowolny checkbox administracyjny per etap, per szablon — 0 lub
wiele etapów może go mieć. Szablony "Proces — BMS" (15 projektów) i "Proces — Przemysłowe"
(1 projekt) mają go **zero** — formuła D19 nigdy by dla nich nie wykryła "Etap 10 osiągnięty".
**Decyzja: fallback w kodzie, nie poprawka danych** — gdy szablon nie ma żadnego etapu
`for_closing`, "osiągnięty" = dotarcie do etapu o najwyższej pozycji w tym szablonie. Odporne też
na przyszłe szablony bez ręcznego oznaczania.

**2. `active_stage_id`/`project_stage_history` nie odzwierciedla realnego postępu dla większości
projektów.** Sucha próbka (SELECT bez zapisu) na produkcji: z formułą D19 zastosowaną dosłownie,
**62 z 76 dzisiejszych "Zamkniętych" projektów** zostałyby cofnięte na "W trakcie", bo ich
`active_stage_id` wciąż wskazuje "Etap 1 — Uruchomienie projektu" (nigdy nieaktualizowany od
backfillu w migracji 211/fazie 1). `project_stage_history` ma ten sam problem (74 projekty,
każdy z dokładnie jednym, wciąż "otwartym" wierszem od backfillu). To nie luka konfiguracji —
to fakt: zespół w praktyce nie aktualizował tego pola.

**Decyzja właściciela: "grandfather", automat działa tylko naprzód.** Mechanizm liczy
`flow_status` **tylko** dla projektów z co najmniej jednym PRAWDZIWYM przejściem etapu
(`project_stage_history.backfilled = false`) — odróżnione od jednorazowego backfillu przez
istniejącą kolumnę `backfilled` (zero nowych pól potrzebnych). Reszta (dziś 120 ze 122
projektów) zostaje nietknięta, dopóki ktoś naprawdę nie przesunie etapu przez istniejący
mechanizm (`set_project_active_stage`) — co automatycznie wstawia wiersz `backfilled=false` i
od tej chwili automat przejmuje status tego projektu. Właściciel: będzie mógł przejrzeć projekty
i ustawić w nich właściwe etapy, żeby "odblokować" automat per projekt.
**Zweryfikowane na produkcji przed włączeniem: dziś 2/122 projekty są "zweryfikowane", oba bez
zmiany wyniku formuły — start w 100% bezpieczny, zero projektów zmienia status w chwili wdrożenia.**

### Mechanizm (migracje 227-230)

- `project_coverage_periods` (append-only, RLS bez polityki UPDATE/DELETE) — seedowana jednym
  wierszem `gwarancja_pierwotna` z `system_handover_at`/`warranty_duration_months` (formuła zgodna
  z `lib/project/warranty.ts::resolveProjectWarrantyEndsAt`).
- `projects.manual_close_reason`/`manual_close_at`/`manual_close_by` — jedyna dozwolona ręczna
  zmiana (D19 §1: "rezygnacja klienta"), nadpisuje formułę bezwarunkowo, niezależnie od
  "grandfather" (działa na każdym projekcie, zweryfikowanym czy nie).
- `recompute_project_flow_status(p_project_id uuid default null)` — pojedyncza funkcja SQL, jedno
  zapytanie UPDATE z CTE, bez rozjazdu między cronem a wywołaniem natychmiastowym (w
  przeciwieństwie do istniejącego cronu `is_active`, który robi to w TS z osobnymi update'ami per
  wiersz — tu cała logika jest w SQL, bo formuła nie wymaga stanu w pamięci jak histereza
  `is_active`).
- Natychmiastowe przeliczenie: trigger na `project_processes` (zmiana `active_stage_id`),
  `project_coverage_periods` (nowy wiersz), `projects` (zmiana `manual_close_reason`).
- Cron dobowy `0 3 * * *` (15 min PRZED cronem `is_active` o 3:15 — `is_active` czyta
  `isClosedFlowStatus` jako wejście, więc musi widzieć świeży status) — łapie przejścia zależne
  wyłącznie od daty (koniec pokrycia mija dziś) bez żadnego triggera na wejściu.
- **Błąd znaleziony i naprawiony przy weryfikacji (migracja 229):** Postgres wykonuje triggery
  `AFTER` na tym samym zdarzeniu w kolejności alfabetycznej nazwy. Pierwsza nazwa triggera
  (`project_processes_recompute_flow_status`) sortowała się PRZED istniejącym
  `project_stage_change_history`, więc przeliczenie działo się zanim wiersz `backfilled=false` w
  ogóle powstał — projekt wyglądał jak wciąż niezweryfikowany. Naprawione zmianą nazwy
  (`project_stage_history_then_recompute_flow_status`), zweryfikowane ponownie na produkcji w
  transakcji z rollbackiem.
- **Błąd bezpieczeństwa znaleziony i naprawiony (migracja 230):** `get_advisors` wykrył, że
  `recompute_project_flow_status`/`trigger_recompute_project_flow_status_cron` miały domyślny
  `GRANT EXECUTE TO PUBLIC` (standardowe zachowanie `CREATE FUNCTION`) — wywoływalne przez
  `anon`/`authenticated` przez `/rest/v1/rpc/...` bez autoryzacji. Cofnięte — te funkcje są
  wyłącznie do wywołania przez triggery i cron.

### UI — zrealizowane w kolejnej turze

- **Pole statusu w `components/project-form.tsx` zablokowane (tylko odczyt).** Zastąpione
  komponentem `ProjectLifecycleStatusPanel` — pokazuje bieżący `flowStatus` jako tekst + krótkie
  wyjaśnienie ("liczony automatycznie z etapu procesu i pokrycia serwisowego"). Dla
  administratorów/managerów (`hasFullAppAccess`) dochodzi akcja **"Oznacz jako Wygaszony —
  rezygnacja klienta"** (dialog z wymaganym powodem → `setProjectManualClose`, zapisuje
  `manual_close_reason`/`at`/`by`, trigger w bazie od razu ustawia `flow_status='Wygaszony'`) oraz,
  gdy `manual_close_reason` jest już ustawiony, **"Wznów projekt"** (`clearProjectManualClose` —
  czyści `manual_close_reason` i jawnie ustawia `flow_status='W trakcie'` w tym samym zapytaniu,
  zgodnie z D19 §2b: "wraca tylko ręcznie i na w trakcie", nie do gwarancji/zamkniętego).
- **Panel `project_coverage_periods`** (`ProjectCoveragePeriodsPanel`, w sekcji "Gwarancja"
  formularza projektu, tylko `variant="full"`) — lista dotychczasowych wpisów (append-only,
  wyłącznie odczyt) + dialog dodawania nowego faktu pokrycia (przedłużenie/umowa serwisowa;
  pierwotna gwarancja nie jest tu dodawalna ręcznie — to wyłącznie seed z migracji 227). Insert
  triggeruje natychmiastowe przeliczenie statusu (migracja 228).
- **Komunikat do klienta przy wznowieniu pokrycia** (D19 §2c) — zależny od silnika komunikatów
  (faza 9), świadomie nie teraz, zgodnie z oryginalną decyzją.

---

## Finalna sekwencja faz

Zatwierdzona przez właściciela (razem z D19), z dwiema poprawkami: ROT+raport przesunięte przed
cykl życia i warstwę sygnałów (uzasadnienie właściciela: ROT nie zależy od żadnej z tych dwóch faz,
a sygnały odwrotnie — czerpią z ROT, więc muszą stać po nim), plus pilotaż jako osobny krok
pośredni. **Bezpieczeństwo przestawienia zweryfikowane przed wdrożeniem — żadnej blokującej
zależności nie znaleziono** (poprzednia kolejność miałaby warstwę sygnałów przed ROT, co
zmusiłoby ją do dublowania logiki zbierania z surowych źródeł zamiast czytania z ROT; nowa
kolejność to naprawia przy okazji). Ten zapis był wcześniej wyłącznie w historii rozmowy — patrz
notka o tym pod D20 §2, teraz nieaktualna.

| # | Faza | Szacunek | Status |
|---|---|---|---|
| 1 | Fundament: szablon i historia etapów | — | **zrealizowane** |
| 2 | Sloty ról i fallback | — | **zrealizowane** |
| 3 | Kompetencje | M | **zrealizowane** (D21/D22, migracje 221-222) |
| 4 | ROT jako widok (4 źródła + Macierz Interfejsów) | L | **zrealizowane** (D23, migracje 223-225) — grupowanie po podmiocie odłożone, patrz D23 |
| 5 | Generator raportu etapowego (wysyłka ręczna) | M | **zrealizowane** (D24, migracja 226) — pilotaż flagą, wybór 3 projektów czeka na właściciela |
| — | Pilotaż: 3 projekty, 2-3 raporty, zbiórka reakcji klienta/opiekuna → poprawki treści przed 11c | proces, nie kod | **następna** — czeka na realny pilotaż (nie kod), potem wraca jako poprawki treści |
| 6 | Cykl życia projektu | L | **zrealizowane** (D25, migracje 227-230, "grandfather" dla danych historycznych; UI: blokada pola, rezygnacja klienta, panel pokrycia) |
| 7 | Warstwa sygnałów + zdrowie etapu (czyta z ROT, D3) | M | do realizacji |
| 8 | Czas pracy | M | do realizacji |
| 9 | Rejestr zdarzeń komunikacyjnych | L | do realizacji |
| 10 | `is_active`: persist + rozbicie osi | M | do realizacji |
| 11a | Fazy komunikacji — bramy | S-M | do realizacji |
| 11b | Fazy komunikacji — silnik (modyfikatory, bezpiecznik, przejęcie czerwone) | L | do realizacji |
| 11c | Wymagane komunikaty + blokada zamknięcia + wysyłka automatyczna | M-L | do realizacji |
| 12 | Tryb serwisowy | M | do realizacji |
| 13 | Zastępstwa urlopowe (+ `project_role_competency`, D22 dług) | M-L | do realizacji |
| 14 | Obciążenie (+ checklista cykliczna KO) | L | do realizacji |
| 15 | Planowanie | M | do realizacji |

**S3 doprecyzowane:** obsługa inwestora (modyfikator do KRYTYCZNEJ, cotygodniowy status,
bezpiecznik 25/30 dni) kompletuje się po **11b** — tam scenariusz jest obsłużony klientowsko w
całości. Faza 14 dorzuca wyłącznie wewnętrzną checklistę koordynatora ("wejścia bez potwierdzonej
gotowości frontu") — higienę pracy KO, nie coś, czego dotyczy inwestor.

**Uwaga do D20 §2:** pełny edytor siedmiu slotów (przed fazą przejęcia przy czerwonym = 11b, i
przed fazą zastępstw = 13) ma teraz konkretne miejsce w tej sekwencji — dopisać go jako pierwszy
krok fazy 11b albo 13, cokolwiek ruszy pierwsze.

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
| D20 §1 | — | zatwierdzone, zrealizowane (lista odczytu 7 slotów w `ProjectUsersPanel`) |
| D20 §2 | faza komunikacji z przejęciem przy czerwonym (docs/04 §4.4) + faza zastępstw urlopowych (docs/04 §6) | zatwierdzone, do realizacji jako osobna, nazwana pozycja w sekwencji, przed obiema tymi fazami |
| D21 | faza 3 (Kompetencje) | zatwierdzone, zrealizowane (migracje 221-222: `operational_role_competency`, potwierdzenie `user_competency`, mapa luk) |
| D22 | faza zastępstw urlopowych (`project_role_competency`, dług na przyszłość) | zatwierdzone; korekta D4/D7/D15 zrealizowana od razu, `project_role_competency` materiał na fazę zastępstw |
| D23 | faza 4 (ROT) | zatwierdzone, zrealizowane (migracje 223-225: historia kanbana triggerem, `report_rot_items()`, `project_trades.hired_by`) — grupowanie ROT po podmiocie świadomie odłożone |
| D24 | faza 5 (Generator raportu etapowego) | zatwierdzone, zrealizowane (migracja 226: `project_stage_reports`, zamrożenie triggerem, pilotaż flagą) — wybór 3 pilotowych projektów czeka na właściciela |
| D25 | faza 6 (Cykl życia projektu) | zatwierdzone, zrealizowane (migracje 227-230, "grandfather" dla 120/122 projektów; UI: blokada pola statusu, akcja rezygnacji, panel pokrycia) |

---

## Poprawki do wcześniejszych dokumentów

| Plik | Co poprawić | Status |
|---|---|---|
| `CLAUDE.md` | wiersz o zdrowiu — patrz D3 | zrobione |
| `04` §0.2 | usunąć „edytowalne per projekt"; podział na standard firmy i dane własne projektu wg D1 | do zrobienia |
| `04` §2 | dodać mapowanie migracji z `profile_project_access` wg D4 (BEZ `user_operational_roles` — ta migracja odwołana, D22); dopisać wyłączenie `lider_montazu`/`instalator` ze slotów | do zrobienia |
| `04` §3.1 | dopisać trzecią oś "funkcja wykonawcza" (`operational_role`) obok roli i kompetencji wg D22; sprostować, że `user_operational_roles` nie migruje do kompetencji | do zrobienia |
| `04` §2.3 | dopisać zastrzeżenie z D16 — mechanizm gotowy, niewpięty | do zrobienia |
| `04` §4 | modyfikator ręczny z terminem wygaśnięcia jako mechanizm odstępstwa per projekt (D6, zawężony zakres) | do zrobienia |
| `05` §8.5 | ROT z trzech źródeł wg D14; zadanie weryfikacyjne domknięte | do zrobienia |
| `05` | dodać warstwę agregacji sygnałów jako wspólną zależność zdrowia i modyfikatorów | do zrobienia |
