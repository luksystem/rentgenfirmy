import type {
  InternalAcceptanceRuleTemplate,
  InternalAcceptanceSourceRuleSet,
} from "@/lib/internal-acceptance/types";

/** Biblioteka reguł QA — rozszerzaj bez zmiany kodu generatora. */
export const INTERNAL_ACCEPTANCE_RULE_LIBRARY: InternalAcceptanceSourceRuleSet[] = [
  {
    id: "company-documentation",
    sourceType: "company_standard",
    items: [
      rule("doc-backup", "Backup wykonany", "Potwierdzenie kopii zapasowej programu i konfiguracji.", "Dokumentacja", "critical", true),
      rule("doc-export", "Eksport programu", "Zapisany eksport projektu automatyki / BMS.", "Dokumentacja", "critical", true),
      rule("doc-panel-photos", "Zdjęcia rozdzielni", "Udokumentowano stan rozdzielni po montażu.", "Dokumentacja", "normal", true),
      rule("doc-rack-photos", "Zdjęcia racka", "Udokumentowano rack / szafę RACK.", "Rack", "normal", true),
      rule("doc-passwords", "Hasła zapisane", "Hasła i dane dostępowe zapisane w module haseł projektu.", "Dokumentacja", "critical", true),
      rule("doc-complete", "Dokumentacja kompletna", "Komplet dokumentacji powykonawczej dla klienta.", "Dokumentacja powykonawcza", "critical", true),
    ],
  },
  {
    id: "company-network",
    sourceType: "company_standard",
    items: [
      rule("net-internet", "Internet działa", "Połączenie WAN stabilne.", "Sieć", "critical", true),
      rule("net-vpn", "VPN działa", "Dostęp zdalny skonfigurowany i przetestowany.", "Sieć", "normal", true),
      rule("net-wifi", "WiFi działa", "Pokrycie i hasła zgodne z ustaleniami.", "Sieć", "critical", true),
      rule("net-addressing", "Adresacja poprawna", "Adresy IP/VLAN zgodne z dokumentacją.", "Sieć", "normal", true),
      rule("net-time", "Synchronizacja czasu", "NTP / synchronizacja czasu w systemie.", "Sieć", "normal", true),
    ],
  },
  {
    id: "company-panel",
    sourceType: "company_standard",
    items: [
      rule("panel-labels", "Przewody opisane", "Wszystkie przewody opisane w rozdzielni.", "Rozdzielnia", "critical", true),
      rule("panel-breakers", "Zabezpieczenia opisane", "Oznaczenia zabezpieczeń czytelne.", "Rozdzielnia", "normal", true),
      rule("panel-aesthetics", "Estetyka rozdzielni", "Porządek, brak luźnych przewodów.", "Rozdzielnia", "normal", true),
      rule("panel-reserve", "Rezerwy zachowane", "Zachowane rezerwy w rozdzielni.", "Rozdzielnia", "optional", false),
    ],
  },
  {
    id: "company-app",
    sourceType: "company_standard",
    items: [
      rule("app-icons", "Brak pustych ikon", "Wszystkie ikony w aplikacji przypisane.", "Aplikacja", "normal", true),
      rule("app-errors", "Brak błędów", "Brak aktywnych błędów / alarmów w UI.", "Aplikacja", "critical", true),
      rule("app-rooms", "Nazwy pomieszczeń", "Nazwy pomieszczeń zgodne z projektem.", "Aplikacja", "normal", true),
      rule("app-temps", "Temperatury widoczne", "Wszystkie czujniki temperatury raportują dane.", "Aplikacja", "normal", true),
      rule("app-buttons", "Przyciski działają", "Wszystkie przyciski fizyczne i wirtualne działają.", "Aplikacja", "critical", true),
      rule("app-user-test", "Test użytkownika", "Przeprowadzono test użytkownika z klientem / symulacją.", "Test użytkownika", "critical", true),
      rule("app-training", "Szkolenie", "Przekazano podstawowe szkolenie z obsługi.", "Szkolenie", "normal", true),
      rule("app-ready", "Gotowość do odbioru", "Quality Gate — projekt gotowy do odbioru klienta.", "Gotowość do odbioru", "critical", true),
    ],
  },
  {
    id: "spec-lighting",
    sourceType: "specification",
    matchTitleContains: ["oświetlen", "light", "dali", "dmx"],
    matchCategory: ["oświetlenie", "lighting"],
    items: lightingItems(),
  },
  {
    id: "spec-blinds",
    sourceType: "specification",
    matchTitleContains: ["rolet", "shade", "zaluzj", "screen"],
    matchCategory: ["rolety", "zaluzje"],
    items: blindsItems(),
  },
  {
    id: "spec-hvac",
    sourceType: "specification",
    matchTitleContains: ["hvac", "klimat", "ogrzew", "pomp", "wentyl", "rekuper"],
    matchCategory: ["hvac", "klimatyzacja", "ogrzewanie"],
    items: hvacItems(),
  },
  {
    id: "spec-alarm",
    sourceType: "specification",
    matchTitleContains: ["alarm", "czujk", "sensor"],
    matchCategory: ["alarm", "bezpieczeństwo"],
    items: alarmItems(),
  },
  {
    id: "spec-monitoring",
    sourceType: "specification",
    matchTitleContains: ["monitoring", "kamer", "cctv", "nvr"],
    matchCategory: ["monitoring", "cctv"],
    items: monitoringItems(),
  },
  {
    id: "spec-audio",
    sourceType: "specification",
    matchTitleContains: ["audio", "sonos", "multiroom", "głośnik", "amplifik"],
    matchCategory: ["audio", "multiroom"],
    items: audioItems(),
  },
  {
    id: "spec-integration-deye",
    sourceType: "specification",
    matchTitleContains: ["deye", "inwerter", "falownik", "pv", "magazyn energii"],
    items: deyeItems(),
  },
  {
    id: "spec-integration-knx",
    sourceType: "specification",
    matchTitleContains: ["knx", "ets"],
    items: knxItems(),
  },
  {
    id: "spec-integration-modbus",
    sourceType: "specification",
    matchTitleContains: ["modbus"],
    items: modbusItems(),
  },
  {
    id: "spec-integration-bacnet",
    sourceType: "specification",
    matchTitleContains: ["bacnet"],
    items: bacnetItems(),
  },
  {
    id: "agreement-tablet",
    sourceType: "agreement",
    matchTitleContains: ["tablet", "panel ścienny", "panel scienny"],
    items: tabletItems(),
  },
  {
    id: "agreement-vpn",
    sourceType: "agreement",
    matchTitleContains: ["vpn", "zdalny", "remote"],
    items: [
      rule("agr-vpn-access", "Dostęp VPN", "Potwierdzenie działania dostępu zdalnego zgodnie z ustaleniem.", "Sieć", "normal", true),
    ],
  },
  {
    id: "agreement-scenes",
    sourceType: "agreement",
    matchTitleContains: ["scena", "sceny", "automatyzac"],
    items: [
      rule("agr-scenes", "Sceny i automatyzacje", "Wszystkie ustalone sceny i automatyzacje przetestowane.", "Automatyzacje", "critical", true),
    ],
  },
];

function rule(
  id: string,
  name: string,
  description: string,
  category: InternalAcceptanceRuleTemplate["category"],
  priority: InternalAcceptanceRuleTemplate["priority"],
  mandatory: boolean,
): InternalAcceptanceRuleTemplate {
  return { id, name, description, category, priority, mandatory };
}

function lightingItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("light-circuits", "Obwody oświetleniowe", "Sprawdzono wszystkie obwody.", "Oświetlenie", "critical", true),
    rule("light-scenes", "Sceny oświetlenia", "Sceny działają poprawnie.", "Oświetlenie", "critical", true),
    rule("light-buttons", "Przyciski", "Przyciski fizyczne i w aplikacji.", "Oświetlenie", "normal", true),
    rule("light-app", "Sterowanie z aplikacji", "Sterowanie z aplikacji mobilnej / panelu.", "Oświetlenie", "normal", true),
    rule("light-schedules", "Harmonogramy", "Harmonogramy oświetlenia.", "Oświetlenie", "normal", true),
    rule("light-emergency", "Awaryjne wyłączenie", "Funkcja awaryjnego wyłączenia.", "Oświetlenie", "critical", true),
  ];
}

function blindsItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("blind-each", "Każda roleta działa", "Indywidualne sterowanie rolet.", "Rolety", "critical", true),
    rule("blind-direction", "Kierunki poprawne", "Kierunek jazdy zgodny z oczekiwaniem.", "Rolety", "normal", true),
    rule("blind-groups", "Grupy", "Grupowe sterowanie rolet.", "Rolety", "normal", true),
    rule("blind-scenes", "Sceny rolet", "Sceny z roletami.", "Rolety", "normal", true),
    rule("blind-schedule", "Harmonogram rolet", "Harmonogram działania.", "Rolety", "optional", false),
  ];
}

function hvacItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("hvac-zones", "Strefy HVAC", "Sterowanie strefami działa.", "HVAC", "critical", true),
    rule("hvac-temps", "Temperatury", "Odczyty i setpointy poprawne.", "HVAC", "critical", true),
    rule("hvac-modes", "Tryby pracy", "Grzanie / chłodzenie / auto.", "HVAC", "normal", true),
    rule("hvac-schedules", "Harmonogramy HVAC", "Harmonogramy temperatur.", "HVAC", "normal", true),
  ];
}

function alarmItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("alarm-sensors", "Czujki", "Wszystkie czujki raportują poprawnie.", "Alarm", "critical", true),
    rule("alarm-arm", "Uzbrojenie / rozbrojenie", "Procedura uzbrojenia działa.", "Alarm", "critical", true),
    rule("alarm-notify", "Powiadomienia alarmowe", "Powiadomienia docierają.", "Powiadomienia", "critical", true),
  ];
}

function monitoringItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("mon-cameras", "Kamery", "Obraz z wszystkich kamer.", "Monitoring", "critical", true),
    rule("mon-recording", "Nagrywanie", "Nagrywanie / archiwum.", "Monitoring", "normal", true),
    rule("mon-remote", "Podgląd zdalny", "Dostęp z aplikacji / VPN.", "Monitoring", "normal", true),
  ];
}

function audioItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("audio-zones", "Strefy audio", "Wszystkie strefy odtwarzają.", "Audio", "critical", true),
    rule("audio-sources", "Źródła", "Przełączanie źródeł działa.", "Audio", "normal", true),
    rule("audio-volume", "Głośność / sceny", "Sceny audio i głośność.", "Multiroom", "normal", true),
  ];
}

function deyeItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("deye-comm", "Komunikacja Deye", "Brak błędów komunikacji.", "Integracje", "critical", true),
    rule("deye-energy", "Odczyt energii", "Poprawny odczyt energii.", "Integracje", "critical", true),
    rule("deye-pv", "Odczyt PV", "Dane produkcji PV.", "Integracje", "normal", true),
    rule("deye-battery", "Odczyt baterii", "Stan magazynu energii.", "Integracje", "normal", true),
  ];
}

function knxItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("knx-line", "Linia KNX", "Komunikacja na magistrali.", "Integracje", "critical", true),
    rule("knx-group", "Grupy adresów", "Adresacja zgodna z projektem ETS.", "Integracje", "critical", true),
    rule("knx-devices", "Urządzenia KNX", "Wszystkie urządzenia online.", "Integracje", "normal", true),
  ];
}

function modbusItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("modbus-comm", "Komunikacja Modbus", "Brak timeoutów / błędów CRC.", "Integracje", "critical", true),
    rule("modbus-registers", "Rejestry", "Mapowanie rejestrów zgodne z dokumentacją.", "Integracje", "normal", true),
  ];
}

function bacnetItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("bacnet-discover", "Discovery BACnet", "Urządzenia wykryte.", "Integracje", "critical", true),
    rule("bacnet-points", "Punkty BACnet", "Odczyt / zapis punktów.", "Integracje", "critical", true),
    rule("bacnet-schedules", "Harmonogramy BACnet", "Harmonogramy synchronizują się.", "Integracje", "normal", true),
  ];
}

function tabletItems(): InternalAcceptanceRuleTemplate[] {
  return [
    rule("tablet-mounted", "Tablet zamontowany", "Montaż zgodny z ustaleniem.", "Aplikacja", "normal", true),
    rule("tablet-app", "Aplikacja uruchamia się", "Start aplikacji klienta.", "Aplikacja", "critical", true),
    rule("tablet-autostart", "Automatyczny start", "Autostart po restarcie.", "Aplikacja", "normal", true),
    rule("tablet-screensaver", "Wygaszacz", "Wygaszacz / blokada skonfigurowana.", "Aplikacja", "optional", false),
    rule("tablet-connection", "Połączenie z systemem", "Stałe połączenie z BMS.", "Aplikacja", "critical", true),
  ];
}

export function getInternalAcceptanceRuleSetById(id: string) {
  return INTERNAL_ACCEPTANCE_RULE_LIBRARY.find((entry) => entry.id === id) ?? null;
}
