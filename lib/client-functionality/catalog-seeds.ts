import type {
  ClientFunctionalityOption,
  ClientFunctionalityTemplateItem,
  FunctionalityTaskPriority,
} from "@/lib/client-functionality/types";

function opt(
  id: string,
  label: string,
  task?: { title: string; description?: string; priority?: FunctionalityTaskPriority },
): ClientFunctionalityOption {
  if (!task) {
    return { id, label };
  }
  return {
    id,
    label,
    generatesTask: true,
    taskTitle: task.title,
    taskDescription: task.description ?? "",
    taskPriority: task.priority ?? "standard",
  };
}

function q(
  id: string,
  title: string,
  options: ClientFunctionalityOption[],
  category: string,
  position: number,
  description?: string,
): Omit<ClientFunctionalityTemplateItem, "priority"> {
  return {
    id,
    title,
    description,
    questionType: "single",
    options,
    category,
    position,
  };
}

/** Domyślne pytania ankiety klienta per pozycja katalogu specyfikacji. */
export const SPECIFICATION_CATALOG_FUNCTIONALITY_SEEDS: Record<
  string,
  Omit<ClientFunctionalityTemplateItem, "position">[]
> = {
  Oświetlenie: [
    {
      ...q(
        "light-entry",
        "Po wejściu do domu oświetlenie:",
        [
          opt("always", "Zapala się zawsze", {
            title: "Automatyczne oświetlenie przy wejściu do domu",
            description: "Scena / automatyzacja wejścia — światło w przedpokoju (i ewentualnie parterze).",
            priority: "must",
          }),
          opt("dark_only", "Zapala się tylko gdy ciemno", {
            title: "Oświetlenie przy wejściu — warunek jasności",
            description: "Automatyzacja z czujnikiem jasności lub harmonogramem zmierzchu.",
            priority: "must",
          }),
          opt("manual", "Steruję ręcznie"),
          opt("never", "Nigdy automatycznie"),
        ],
        "Oświetlenie",
        0,
        "Dotyczy głównego wejścia do domu.",
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "light-night",
        "Poruszając się po domu w nocy (po 22:00):",
        [
          opt("night_light", "Delikatne światło nocne", {
            title: "Scena nocna / światło pośrednie",
            description: "Automatyczne, dyskretne oświetlenie korytarzy i łazienek w nocy.",
            priority: "standard",
          }),
          opt("motion_normal", "Normalne oświetlenie przy ruchu", {
            title: "Oświetlenie nocne na ruch",
            description: "Czujniki ruchu włączają oświetlenie w wybranych strefach.",
            priority: "standard",
          }),
          opt("manual", "Tylko ręcznie"),
          opt("never", "Nie chcę automatycznego oświetlenia w nocy"),
        ],
        "Oświetlenie",
        1,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "light-leave",
        "Gdy wychodzę z domu, światła:",
        [
          opt("all_off", "Gasną automatycznie we wszystkich pomieszczeniach", {
            title: "Scenariusz wyjścia — wyłączenie oświetlenia",
            description: "Automatyzacja „W domu nikogo” lub wyjście — gaszenie świateł.",
            priority: "must",
          }),
          opt("leave_some", "Gasną w większości, zostają wybrane (np. symulacja obecności)", {
            title: "Scenariusz wyjścia — częściowe oświetlenie",
            description: "Wyłączenie większości obwodów, ewentualna symulacja obecności.",
            priority: "standard",
          }),
          opt("manual", "Wyłączam sam"),
        ],
        "Oświetlenie",
        2,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "light-scenes",
        "Sceny oświetlenia (np. wieczór, film, praca):",
        [
          opt("presets", "Chcę gotowe sceny do wyboru", {
            title: "Konfiguracja scen oświetlenia",
            description: "Przygotowanie i przypisanie scen (przyciski, aplikacja, głos).",
            priority: "standard",
          }),
          opt("custom_later", "Ustalimy na miejscu podczas wdrożenia"),
          opt("minimal", "Wystarczy włącz/wyłącz"),
        ],
        "Oświetlenie",
        3,
      ),
      priority: "nice_to_have",
    },
    {
      ...q(
        "light-control",
        "Jak najczęściej chcesz sterować oświetleniem?",
        [
          opt("app", "Aplikacja mobilna"),
          opt("buttons", "Przyciski ścienne"),
          opt("voice", "Głos (Asystent)", {
            title: "Integracja sterowania głosowego oświetlenia",
            description: "Konfiguracja poleceń głosowych dla głównych stref.",
            priority: "optional",
          }),
          opt("mix", "Mix — wszystkie sposoby"),
        ],
        "Oświetlenie",
        4,
      ),
      priority: "nice_to_have",
    },
  ],

  "Rolety / żaluzje": [
    {
      ...q(
        "blind-entry-day",
        "Gdy wchodzę do domu w ciągu dnia, rolety:",
        [
          opt("open_always", "Otwierają się automatycznie", {
            title: "Automatyczne otwieranie rolet przy wejściu",
            priority: "standard",
          }),
          opt("bright_only", "Otwierają się tylko gdy jest jasno na zewnątrz", {
            title: "Rolety przy wejściu — warunek jasności",
            description: "Otwarcie rolet tylko przy odpowiedniej jasności / pórze dnia.",
            priority: "must",
          }),
          opt("stay", "Zostają jak są"),
          opt("manual", "Steruję ręcznie"),
          opt("never", "Nigdy automatycznie"),
        ],
        "Rolety",
        0,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "blind-leave",
        "Gdy wychodzę z domu, rolety:",
        [
          opt("close_all", "Zamykają się automatycznie", {
            title: "Automatyczne zamykanie rolet przy wyjściu",
            priority: "must",
          }),
          opt("close_partial", "Zamykają się częściowo (np. parter)", {
            title: "Częściowe zamykanie rolet przy wyjściu",
            priority: "standard",
          }),
          opt("stay", "Zostają jak są"),
          opt("manual", "Steruję ręcznie"),
        ],
        "Rolety",
        1,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "blind-sun",
        "W słoneczne dni rolety mają chronić przed nagrzewaniem:",
        [
          opt("auto_close", "Zamykają się automatycznie przy silnym słońcu", {
            title: "Automatyka rolet — ochrona przed słońcem",
            description: "Reguła jasności / temperatury pomieszczenia.",
            priority: "standard",
          }),
          opt("notify", "Dostaję powiadomienie, decyduję sam"),
          opt("manual", "Steruję ręcznie"),
          opt("never", "Nie potrzebuję"),
        ],
        "Rolety",
        2,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "blind-evening",
        "Wieczorem rolety:",
        [
          opt("close_sunset", "Zamykają się o zmierzchu", {
            title: "Automatyczne zamykanie rolet o zmierzchu",
            priority: "standard",
          }),
          opt("close_fixed", "Zamykają się o stałej godzinie", {
            title: "Harmonogram zamykania rolet wieczorem",
            priority: "standard",
          }),
          opt("manual", "Steruję ręcznie"),
        ],
        "Rolety",
        3,
      ),
      priority: "nice_to_have",
    },
    {
      ...q(
        "blind-bedroom",
        "Rano w sypialni rolety:",
        [
          opt("open_gradual", "Otwierają się stopniowo (budzenie)", {
            title: "Stopniowe otwieranie rolet w sypialni",
            description: "Scena poranna / harmonogram budzenia.",
            priority: "optional",
          }),
          opt("open_at_once", "Otwierają się naraz o wybranej godzinie", {
            title: "Harmonogram otwarcia rolet w sypialni",
            priority: "optional",
          }),
          opt("manual", "Steruję ręcznie"),
        ],
        "Rolety",
        4,
      ),
      priority: "nice_to_have",
    },
  ],

  "Muzyka multiroom": [
    {
      ...q(
        "audio-entry",
        "Po wejściu do domu muzyka:",
        [
          opt("resume", "Wznawia odtwarzanie (jeśli było włączone)", {
            title: "Automatyczne wznowienie muzyki przy wejściu",
            priority: "optional",
          }),
          opt("welcome_playlist", "Uruchamia wybraną strefę / playlistę", {
            title: "Scena powitalna — muzyka przy wejściu",
            priority: "standard",
          }),
          opt("off", "Pozostaje wyłączona"),
          opt("manual", "Włączam sam"),
        ],
        "Audio",
        0,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "audio-evening",
        "Wieczorem (relaks) muzyka:",
        [
          opt("soft_auto", "Delikatnie włącza się w wybranej strefie", {
            title: "Scena wieczorna — muzyka w tle",
            priority: "optional",
          }),
          opt("manual", "Włączam gdy chcę"),
          opt("off", "Nie używam wieczorem"),
        ],
        "Audio",
        1,
      ),
      priority: "nice_to_have",
    },
    {
      ...q(
        "audio-party",
        "Przy imprezie / gościach:",
        [
          opt("all_zones", "Chcę szybko włączyć muzykę we wszystkich strefach", {
            title: "Scena impreza — synchronizacja stref audio",
            priority: "standard",
          }),
          opt("some_zones", "Tylko wybrane strefy (salon, ogród)", {
            title: "Scena impreza — wybrane strefy audio",
            priority: "standard",
          }),
          opt("manual", "Konfiguruję za każdym razem"),
        ],
        "Audio",
        2,
      ),
      priority: "nice_to_have",
    },
    {
      ...q(
        "audio-leave",
        "Gdy wychodzę z domu, muzyka:",
        [
          opt("pause_all", "Wyłącza się automatycznie", {
            title: "Wyłączenie audio przy wyjściu z domu",
            priority: "standard",
          }),
          opt("continue", "Może grać dalej (np. dla domowników)"),
          opt("manual", "Wyłączam sam"),
        ],
        "Audio",
        3,
      ),
      priority: "must_ask",
    },
  ],

  Klimatyzacja: [
    {
      ...q(
        "ac-arrival",
        "Zanim wrócę do domu, klimatyzacja:",
        [
          opt("pre_cool", "Schładza / ogrzewa z wyprzedzeniem", {
            title: "Pre-kondycjonowanie przed przyjazdem",
            description: "Geolokalizacja, harmonogram lub ręczne „wracam za 30 min”.",
            priority: "must",
          }),
          opt("schedule", "Działa wg stałego harmonogramu"),
          opt("manual", "Włączam po przyjeździe"),
          opt("off", "Nie potrzebuję"),
        ],
        "Klimatyzacja",
        0,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "ac-night",
        "W nocy klimatyzacja:",
        [
          opt("sleep_mode", "Przechodzi w tryb nocny (cichszy, łagodniejszy)", {
            title: "Tryb nocny klimatyzacji",
            priority: "standard",
          }),
          opt("off", "Wyłącza się"),
          opt("normal", "Pracuje normalnie"),
        ],
        "Klimatyzacja",
        1,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "ac-window",
        "Gdy okno jest otwarte, klimatyzacja:",
        [
          opt("auto_off", "Wyłącza się automatycznie", {
            title: "Blokada klimatyzacji przy otwartym oknie",
            priority: "must",
          }),
          opt("notify", "Dostaję powiadomienie"),
          opt("ignore", "Bez reakcji"),
        ],
        "Klimatyzacja",
        2,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "ac-leave",
        "Gdy wychodzę z domu, klimatyzacja:",
        [
          opt("eco", "Przechodzi w tryb eco / oszczędny", {
            title: "Tryb eco klimatyzacji przy wyjściu",
            priority: "standard",
          }),
          opt("off", "Wyłącza się"),
          opt("normal", "Zostaje jak ustawione"),
        ],
        "Klimatyzacja",
        3,
      ),
      priority: "must_ask",
    },
  ],

  "Ogrzewanie / HVAC": [
    {
      ...q(
        "hvac-leave",
        "Gdy wychodzę z domu, ogrzewanie:",
        [
          opt("setback", "Obniża temperaturę (tryb nieobecności)", {
            title: "Tryb nieobecności — obniżenie temperatury",
            priority: "must",
          }),
          opt("eco", "Przechodzi w tryb eco", {
            title: "Tryb eco ogrzewania przy wyjściu",
            priority: "standard",
          }),
          opt("off", "Wyłącza się całkowicie"),
          opt("normal", "Zostaje jak ustawione"),
        ],
        "HVAC",
        0,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "hvac-arrival",
        "Zanim wrócę do domu, ogrzewanie:",
        [
          opt("preheat", "Nagrzewa z wyprzedzeniem", {
            title: "Pre-grzanie przed przyjazdem",
            priority: "must",
          }),
          opt("schedule", "Działa wg harmonogramu"),
          opt("manual", "Reguluję po przyjeździe"),
        ],
        "HVAC",
        1,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "hvac-night",
        "W nocy temperatura w sypialni:",
        [
          opt("lower", "Obniża się automatycznie", {
            title: "Nocne obniżenie temperatury w sypialni",
            priority: "standard",
          }),
          opt("normal", "Bez zmian"),
          opt("higher", "Lekko podwyższona"),
        ],
        "HVAC",
        2,
      ),
      priority: "nice_to_have",
    },
    {
      ...q(
        "hvac-window",
        "Przy otwartym oknie ogrzewanie / chłodzenie:",
        [
          opt("reduce", "Redukuje moc lub wyłącza strefę", {
            title: "Reakcja HVAC na otwarte okno",
            priority: "must",
          }),
          opt("notify", "Tylko powiadomienie"),
          opt("ignore", "Bez reakcji"),
        ],
        "HVAC",
        3,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "hvac-guests",
        "Gdy są goście, preferuję:",
        [
          opt("comfort", "Wyższy komfort — szybsze reagowanie", {
            title: "Profil komfortowy HVAC dla gości",
            priority: "optional",
          }),
          opt("eco", "Oszczędność energii"),
          opt("normal", "Bez zmian"),
        ],
        "HVAC",
        4,
      ),
      priority: "nice_to_have",
    },
  ],

  "Monitoring / kamery": [
    {
      ...q(
        "mon-motion",
        "Powiadomienia o ruchu na kamerach:",
        [
          opt("always", "Zawsze gdy wykryty ruch", {
            title: "Powiadomienia push — ruch na kamerach",
            priority: "standard",
          }),
          opt("night_only", "Tylko w nocy / gdy nie ma mnie w domu", {
            title: "Powiadomienia o ruchu — tryb nocny / nieobecność",
            priority: "standard",
          }),
          opt("off", "Nie chcę powiadomień"),
        ],
        "Monitoring",
        0,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "mon-alarm",
        "Gdy włącza się alarm, kamery:",
        [
          opt("record", "Rozpoczynają nagrywanie automatycznie", {
            title: "Integracja alarm → nagrywanie kamer",
            priority: "must",
          }),
          opt("notify", "Tylko powiadomienie z podglądem"),
          opt("manual", "Sam sprawdzam"),
        ],
        "Monitoring",
        1,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "mon-remote",
        "Dostęp do kamer zdalnie (telefon):",
        [
          opt("full", "Pełny podgląd na żywo i nagrania"),
          opt("limited", "Tylko wybrane kamery"),
          opt("no", "Nie potrzebuję zdalnego dostępu"),
        ],
        "Monitoring",
        2,
      ),
      priority: "nice_to_have",
    },
    {
      ...q(
        "mon-privacy",
        "Prywatność w domu (kamery wewnętrzne):",
        [
          opt("disable_home", "Wyłączają się gdy jestem w domu", {
            title: "Tryb prywatności kamer wewnętrznych",
            priority: "standard",
          }),
          opt("blur", "Maskowanie stref prywatnych"),
          opt("always_on", "Zawsze aktywne"),
        ],
        "Monitoring",
        3,
      ),
      priority: "must_ask",
    },
  ],

  "Alarm / czujki": [
    {
      ...q(
        "alarm-evening",
        "Uzbrojenie alarmu wieczorem:",
        [
          opt("auto_schedule", "Automatycznie o wybranej godzinie", {
            title: "Harmonogram uzbrajania alarmu",
            priority: "standard",
          }),
          opt("manual_app", "Ręcznie z aplikacji"),
          opt("manual_panel", "Ręcznie z panelu / manipulatora"),
        ],
        "Alarm",
        0,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "alarm-leave",
        "Gdy wychodzę z domu, alarm:",
        [
          opt("auto_arm", "Uzbraja się automatycznie", {
            title: "Automatyczne uzbrajanie przy wyjściu",
            priority: "must",
          }),
          opt("remind", "Dostaję przypomnienie"),
          opt("manual", "Uzbrajam sam"),
        ],
        "Alarm",
        1,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "alarm-disarm",
        "Rozbrojenie po powrocie:",
        [
          opt("code", "Kod na klawiaturze"),
          opt("tag", "Brelok / tag NFC"),
          opt("app", "Aplikacja mobilna"),
          opt("auto", "Automatycznie (geolokalizacja / obecność)", {
            title: "Automatyczne rozbrajanie po powrocie",
            priority: "standard",
          }),
        ],
        "Alarm",
        2,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "alarm-home",
        "Gdy jestem w domu, czujki:",
        [
          opt("partial", "Część stref wyłączona (ruch w domu OK)", {
            title: "Tryb domowy alarmu — częściowe wyłączenie stref",
            priority: "must",
          }),
          opt("perimeter", "Tylko obwód (okna, drzwi)", {
            title: "Tryb domowy — ochrona obwodowa",
            priority: "standard",
          }),
          opt("full_off", "Alarm całkowicie rozbrojony"),
        ],
        "Alarm",
        3,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "alarm-notify",
        "Powiadomienia o alarmie:",
        [
          opt("push_sms", "Push + SMS", {
            title: "Powiadomienia alarmowe push + SMS",
            priority: "must",
          }),
          opt("push", "Tylko push w aplikacji"),
          opt("off", "Bez powiadomień (niezalecane)"),
        ],
        "Alarm",
        4,
      ),
      priority: "must_ask",
    },
  ],

  "Brama / garaż": [
    {
      ...q(
        "gate-leave",
        "Po wyjeździe z posesji brama / furtka:",
        [
          opt("auto_close", "Zamyka się automatycznie", {
            title: "Automatyczne zamykanie bramy po wyjeździe",
            priority: "must",
          }),
          opt("confirm", "Zamknięcie po potwierdzeniu w aplikacji"),
          opt("manual", "Zamykam sam"),
        ],
        "Brama",
        0,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "gate-arrival",
        "Gdy wracam do domu, brama:",
        [
          opt("auto_open", "Otwiera się automatycznie (obecność / geolokalizacja)", {
            title: "Automatyczne otwieranie bramy przy przyjeździe",
            priority: "standard",
          }),
          opt("tag", "Otwiera się po zbliżeniu tagu"),
          opt("app", "Otwieram z aplikacji"),
          opt("manual", "Otwieram ręcznie"),
        ],
        "Brama",
        1,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "gate-guest",
        "Gość przy furtce:",
        [
          opt("remote_open", "Otwieram zdalnie z telefonu / domofonu", {
            title: "Zdalne otwieranie furtki dla gości",
            priority: "standard",
          }),
          opt("notify", "Dostaję powiadomienie z podglądem"),
          opt("manual", "Obsługuję na miejscu"),
        ],
        "Brama",
        2,
      ),
      priority: "nice_to_have",
    },
    {
      ...q(
        "gate-garage",
        "Garaż po wyjeździe samochodem:",
        [
          opt("auto_close", "Brama garażowa zamyka się automatycznie", {
            title: "Automatyczne zamykanie bramy garażowej",
            priority: "must",
          }),
          opt("remind", "Przypomnienie jeśli pozostaje otwarta", {
            title: "Alert — brama garażowa otwarta",
            priority: "standard",
          }),
          opt("manual", "Zamykam sam"),
        ],
        "Brama",
        3,
      ),
      priority: "must_ask",
    },
  ],

  "Basen / wellness": [
    {
      ...q(
        "pool-daily",
        "Codzienna automatyka basenu:",
        [
          opt("schedule", "Harmonogram (filtracja, oświetlenie, temperatura)", {
            title: "Harmonogram automatyki basenu",
            priority: "must",
          }),
          opt("manual", "Steruję ręcznie"),
          opt("off", "Basen nieaktywny sezonowo"),
        ],
        "Basen",
        0,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "pool-sauna",
        "Przed korzystaniem z sauny:",
        [
          opt("preheat", "Sauna nagrzewa się z wyprzedzeniem (aplikacja / harmonogram)", {
            title: "Pre-grzanie sauny",
            priority: "standard",
          }),
          opt("manual", "Włączam na miejscu"),
          opt("na", "Nie dotyczy"),
        ],
        "Basen",
        1,
      ),
      priority: "nice_to_have",
    },
    {
      ...q(
        "pool-leave",
        "Gdy wychodzę z domu, strefa wellness:",
        [
          opt("eco", "Przechodzi w tryb oszczędny", {
            title: "Tryb eco — basen / sauna przy wyjściu",
            priority: "standard",
          }),
          opt("off", "Wyłącza się"),
          opt("normal", "Bez zmian"),
        ],
        "Basen",
        2,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "pool-evening",
        "Wieczorem basen / oświetlenie ogrodu:",
        [
          opt("auto_off", "Wyłącza się o stałej godzinie", {
            title: "Harmonogram wyłączenia strefy wellness wieczorem",
            priority: "standard",
          }),
          opt("remind", "Przypomnienie do ręcznego wyłączenia"),
          opt("manual", "Steruję sam"),
        ],
        "Basen",
        3,
      ),
      priority: "nice_to_have",
    },
  ],

  "Funkcje specjalne": [
    {
      ...q(
        "special-priority",
        "Co jest dla Ciebie najważniejsze w automatyce domu?",
        [
          opt("comfort", "Komfort i wygoda"),
          opt("security", "Bezpieczeństwo"),
          opt("energy", "Oszczędność energii"),
          opt("balance", "Równowaga wszystkich"),
        ],
        "Ogólne",
        0,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "special-automation-level",
        "Ile automatyzacji chcesz w codziennym użytkowaniu?",
        [
          opt("many", "Dużo — dom ma sam reagować na sytuacje", {
            title: "Pakiet rozszerzonych automatyzacji",
            description: "Klient oczekuje wielu scenariuszy — uwzględnić czas konfiguracji.",
            priority: "standard",
          }),
          opt("some", "Umiarkowanie — kluczowe scenariusze", {
            title: "Podstawowy pakiet automatyzacji",
            priority: "standard",
          }),
          opt("few", "Minimum — głównie ręczne sterowanie"),
          opt("grow", "Zaczynamy od podstaw, rozbudujemy później"),
        ],
        "Ogólne",
        1,
      ),
      priority: "must_ask",
    },
    {
      ...q(
        "special-voice",
        "Sterowanie głosem (Asystent Google / Alexa / Siri):",
        [
          opt("yes", "Tak, chcę używać regularnie", {
            title: "Konfiguracja sterowania głosowego",
            priority: "optional",
          }),
          opt("maybe", "Może w przyszłości"),
          opt("no", "Nie"),
        ],
        "Ogólne",
        2,
      ),
      priority: "nice_to_have",
    },
    {
      ...q(
        "special-training",
        "Szkolenie przed odbiorem instalacji:",
        [
          opt("full", "Pełne — chcę zrozumieć wszystkie scenariusze"),
          opt("brief", "Krótkie — najważniejsze funkcje"),
          opt("self", "Wolę samodzielnie odkrywać"),
        ],
        "Ogólne",
        3,
      ),
      priority: "nice_to_have",
    },
  ],
};

/** Pytania cross-system — pokazywane gdy projekt ma ≥2 pozycje specyfikacji. */
export const GLOBAL_AUTOMATION_FUNCTIONALITY_SEEDS: Omit<ClientFunctionalityTemplateItem, "position">[] = [
  {
    id: "global-alarm-evening",
    title: "Gdy wieczorem uzbrajam alarm, dodatkowo:",
    description: "Wybierz co ma się dziać automatycznie.",
    questionType: "multi",
    options: [
      opt("close_blinds", "Rolety się zamykają", {
        title: "Scenariusz uzbrojenia — zamykanie rolet",
        priority: "standard",
      }),
      opt("lights_off", "Światła gasną", {
        title: "Scenariusz uzbrojenia — wyłączenie oświetlenia",
        priority: "standard",
      }),
      opt("hvac_eco", "HVAC przechodzi w tryb eco", {
        title: "Scenariusz uzbrojenia — tryb eco HVAC",
        priority: "optional",
      }),
      opt("nothing", "Nic — każdy system osobno"),
    ],
    category: "Automatyzacje",
    priority: "must_ask",
  },
  {
    id: "global-away",
    title: "Scenariusz „W domu nikogo” — co ma się wydarzyć?",
    questionType: "multi",
    options: [
      opt("arm_alarm", "Alarm uzbrojony", {
        title: "Scenariusz nieobecności — uzbrojenie alarmu",
        priority: "must",
      }),
      opt("lights_off", "Światła zgaszone", {
        title: "Scenariusz nieobecności — oświetlenie",
        priority: "must",
      }),
      opt("blinds_closed", "Rolety zamknięte", {
        title: "Scenariusz nieobecności — rolety",
        priority: "standard",
      }),
      opt("hvac_eco", "HVAC w trybie oszczędnym", {
        title: "Scenariusz nieobecności — HVAC eco",
        priority: "standard",
      }),
      opt("simulate", "Symulacja obecności (światła losowo)", {
        title: "Symulacja obecności — oświetlenie",
        priority: "optional",
      }),
    ],
    category: "Automatyzacje",
    priority: "must_ask",
  },
  {
    id: "global-arrival",
    title: "Scenariusz „Wracam do domu” — co ma się wydarzyć?",
    questionType: "multi",
    options: [
      opt("disarm", "Alarm rozbrojony", {
        title: "Scenariusz powrotu — rozbrojenie alarmu",
        priority: "must",
      }),
      opt("lights_on", "Światło w przedpokoju", {
        title: "Scenariusz powrotu — oświetlenie",
        priority: "must",
      }),
      opt("blinds_open", "Rolety otwarte (jeśli jasno)", {
        title: "Scenariusz powrotu — rolety",
        priority: "standard",
      }),
      opt("hvac_comfort", "HVAC wraca do komfortu", {
        title: "Scenariusz powrotu — HVAC komfort",
        priority: "standard",
      }),
      opt("gate_open", "Brama otwarta", {
        title: "Scenariusz powrotu — brama",
        priority: "standard",
      }),
    ],
    category: "Automatyzacje",
    priority: "must_ask",
  },
  {
    id: "global-sleep",
    title: "Scenariusz „Idę spać” — jednym przyciskiem / komendą:",
    questionType: "multi",
    options: [
      opt("lights_off", "Światła zgaszone (oprócz nocnych)", {
        title: "Scena nocna — oświetlenie",
        priority: "must",
      }),
      opt("blinds_closed", "Rolety zamknięte", {
        title: "Scena nocna — rolety",
        priority: "standard",
      }),
      opt("arm_alarm", "Alarm uzbrojony (obwód)", {
        title: "Scena nocna — uzbrojenie alarmu",
        priority: "standard",
      }),
      opt("hvac_night", "HVAC — tryb nocny", {
        title: "Scena nocna — HVAC",
        priority: "standard",
      }),
      opt("audio_off", "Muzyka wyłączona", {
        title: "Scena nocna — audio off",
        priority: "optional",
      }),
    ],
    category: "Automatyzacje",
    priority: "must_ask",
  },
  {
    id: "global-guests",
    title: "Scenariusz „Przychodzą goście”:",
    questionType: "multi",
    options: [
      opt("entry_lights", "Jaśniejsze oświetlenie wejścia / salonu", {
        title: "Scena goście — oświetlenie",
        priority: "optional",
      }),
      opt("door_notify", "Powiadomienie gdy ktoś dzwoni / stoi przy furtkce", {
        title: "Scena goście — powiadomienie domofon",
        priority: "standard",
      }),
      opt("disarm_partial", "Alarm w trybie gościnny", {
        title: "Scena goście — tryb alarmu",
        priority: "optional",
      }),
      opt("manual", "Bez specjalnej sceny"),
    ],
    category: "Automatyzacje",
    priority: "nice_to_have",
  },
];

export function withFunctionalityItemPositions(
  items: Omit<ClientFunctionalityTemplateItem, "position">[],
): ClientFunctionalityTemplateItem[] {
  return items.map((item, index) => ({ ...item, position: index }));
}

export function seedCatalogFunctionalityItems(
  catalogName: string,
  existing: ClientFunctionalityTemplateItem[],
): ClientFunctionalityTemplateItem[] {
  if (existing.length) {
    return existing;
  }
  const seed = SPECIFICATION_CATALOG_FUNCTIONALITY_SEEDS[catalogName];
  if (!seed) {
    return [];
  }
  return withFunctionalityItemPositions(seed);
}

export function normalizeCatalogFunctionalityItems(value: unknown): ClientFunctionalityTemplateItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return withFunctionalityItemPositions(
    value
      .filter(
        (entry): entry is ClientFunctionalityTemplateItem =>
          Boolean(entry) &&
          typeof entry === "object" &&
          typeof (entry as ClientFunctionalityTemplateItem).id === "string" &&
          typeof (entry as ClientFunctionalityTemplateItem).title === "string" &&
          Array.isArray((entry as ClientFunctionalityTemplateItem).options),
      )
      .map((entry) => ({
        ...entry,
        questionType: entry.questionType ?? "single",
        category: entry.category ?? "Ogólne",
        priority: entry.priority ?? "must_ask",
      })),
  );
}
