import type { ServiceAiEstimateSettings } from "@/lib/service/types";

export const DEFAULT_SERVICE_AI_SYSTEM_PROMPT =
  "Jesteś asystentem wyceny serwisowej Smart Home. Zwracaj wyłącznie JSON zgodny ze schematem. Nie podawaj kwot robocizny.";

export const DEFAULT_SERVICE_AI_RULES_PROMPT = `- Rozdziel zadania na listę recognizedTasks.
- Oznacz warrantyStatus: warranty | paid | mixed | unknown (szczególnie ważne przy aktywnej gwarancji — patrz sekcja Gwarancja powyżej).
- programmerOnsiteHours = praca u klienta, programmerRemoteHours = zdalnie.
- helperHours: podaj 0 — aplikacja ustawi pomocnika na tyle samo godzin co instalator (zazwyczaj jadą razem).
- Jeśli opis jest ogólny — obniż confidence i dodaj questions.
- Materiały tylko orientacyjnie, verificationRequired=true gdy niepewne.
- Nie zwracaj kwot robocizny/dojazdu — aplikacja liczy je ze stawek.
- Noclegi (overnights): ustaw 0 — aplikacja wyliczy je z odległości i liczby dni. Przy krótkim dojeździe (< progu km z ustawień) zawsze 0.
- estimatedTrips: przy krótkim dojeździe i wielodniowych pracach aplikacja liczy osobne wyjazdy na każdy dzień.`;

export const DEFAULT_SERVICE_AI_NEW_CONTACT_RULES_PROMPT = `Nowy kontakt (niezweryfikowany klient — brak historii instalacji w systemie):
- Brak kontekstu projektu — zakładaj niepewność i szacuj OSTROŻNIE W GÓRĘ (bufor odkryć na miejscu).
- Przy bardzo ogólnych opisach (np. "inteligentny dom", "automatyzacja", "coś nie działa", "nowa instalacja") typowy scenariusz to WIZYTA u klienta:
  • łącznie installerHours + programmerOnsiteHours często > 6 h (nawet gdy klient nie poda szczegółów),
  • programmerRemoteHours też zwykle wyższe niż przy znanym systemie (analiza, konfiguracja, testy),
  • requiresTrip=true dla zadań w obiekcie.
- Nie zaniżaj godzin — lepiej szacować wyżej; klient może doprecyzować odpowiedziami na questions.
- OBOWIĄZKOWO dodaj 2–4 konkretne questions (powierzchnia, istniejące systemy, objawy, dostęp zdalny, zdjęcia/szkice).
- Przy ogólnym opisie: confidence max 0.65, verificationRequired=true dla materiałów.
- W riskFlags dodaj wpis o niepewności nowego kontaktu, gdy brak szczegółów technicznych.
- Dla nowego kontaktu przy ogólnym opisie typowy przyjazd to często > 6 h pracy u klienta łącznie (instalator + programista onsite).`;

export function getDefaultServiceAiEstimateSettings(): ServiceAiEstimateSettings {
  return {
    systemPrompt: DEFAULT_SERVICE_AI_SYSTEM_PROMPT,
    rulesPrompt: DEFAULT_SERVICE_AI_RULES_PROMPT,
    newContactRulesPrompt: DEFAULT_SERVICE_AI_NEW_CONTACT_RULES_PROMPT,
  };
}
