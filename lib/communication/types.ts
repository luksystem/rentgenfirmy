// Faza 9A (docs/08 D18/D19 §5, docs/role/03) — rejestr zdarzeń komunikacyjnych.
// Mierzymy FAKT kontaktu, nie treść (CLAUDE.md: brak dostępu do WhatsAppa jest założeniem, nie
// brakiem — żaden wskaźnik nie może opierać się na liczbie ani treści wiadomości).

export const COMMUNICATION_DIRECTIONS = ["wychodzace", "przychodzace"] as const;
export type CommunicationDirection = (typeof COMMUNICATION_DIRECTIONS)[number];

export const COMMUNICATION_DIRECTION_LABELS: Record<CommunicationDirection, string> = {
  wychodzace: "My do klienta",
  przychodzace: "Klient do nas",
};

export const COMMUNICATION_CHANNELS = [
  "reczny",
  "sms",
  "email",
  "telefon",
  "whatsapp",
  "narada",
  "system",
] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const COMMUNICATION_CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  reczny: "Wpis ręczny",
  sms: "SMS",
  email: "E-mail",
  telefon: "Telefon",
  whatsapp: "WhatsApp",
  narada: "Narada",
  system: "System",
};

/** Źródła w rejestrze — `reczny` z `communication_events`, reszta wyliczana z tabel źródłowych. */
export const COMMUNICATION_SOURCE_LABELS: Record<string, string> = {
  reczny: "Wpis ręczny",
  ustalenie: "Ustalenie",
  zmiana_projektowa: "Zmiana projektowa",
  oferta: "Oferta",
  rozliczenie: "Rozliczenie",
  raport_etapowy: "Raport etapowy",
  sms: "SMS",
  narada: "Narada",
};

/** Wiersz rejestru (przekrój z report_communication_events — ręczne + pochodne). */
export type CommunicationEventEntry = {
  source: string;
  direction: CommunicationDirection;
  channel: CommunicationChannel;
  eventAt: string;
  actorName: string;
  title: string;
};

/**
 * Dwie osie aktywności projektu (docs/08 D18 — tabela czterech kombinacji). Rozdzielone, bo jeden
 * `MAX()` maskuje najgroźniejszy przypadek: klient pisze, my milczymy.
 */
export type ProjectActivityAxes = {
  lastInternalActivityAt: string | null;
  lastClientActivityAt: string | null;
};

export const SILENCE_STATES = ["zdrowo", "klient_milczy", "my_nie_reagujemy", "obie_ciche"] as const;
export type SilenceState = (typeof SILENCE_STATES)[number];

export const SILENCE_STATE_LABELS: Record<SilenceState, string> = {
  zdrowo: "Zdrowo",
  klient_milczy: "Klient milczy",
  my_nie_reagujemy: "My nie reagujemy",
  obie_ciche: "Obie strony ciche",
};

function ageDays(value: string | null, now: Date): number | null {
  if (!value) {
    return null;
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    return null;
  }
  return Math.floor((now.getTime() - ms) / (1000 * 60 * 60 * 24));
}

/**
 * Cztery kombinacje z D18. „Stara" oś = brak aktywności dłużej niż `silenceDays` ALBO brak
 * jakiejkolwiek daty (projekt bez śladu kontaktu jest cichy, nie zdrowy).
 *
 * `my_nie_reagujemy` jest najgorszy wizerunkowo i wychodzi sam z rozdzielenia osi — dokładnie
 * efekt uboczny, o który prosił właściciel: ręczny przycisk ustawia tylko naszą oś, więc gdy nie
 * odpowiadamy, nikt nie kliknie i oś nasza się starzeje przy świeżej osi klienckiej.
 */
export function resolveSilenceState(
  axes: ProjectActivityAxes,
  silenceDays: number,
  now: Date = new Date(),
): SilenceState {
  const internalAge = ageDays(axes.lastInternalActivityAt, now);
  const clientAge = ageDays(axes.lastClientActivityAt, now);

  const internalStale = internalAge === null || internalAge > silenceDays;
  const clientStale = clientAge === null || clientAge > silenceDays;

  if (internalStale && clientStale) {
    return "obie_ciche";
  }
  if (internalStale) {
    return "my_nie_reagujemy";
  }
  if (clientStale) {
    return "klient_milczy";
  }
  return "zdrowo";
}

/** Dni od naszego ostatniego odezwania się — null gdy nigdy. */
export function daysSinceOurContact(axes: ProjectActivityAxes, now: Date = new Date()): number | null {
  return ageDays(axes.lastInternalActivityAt, now);
}
