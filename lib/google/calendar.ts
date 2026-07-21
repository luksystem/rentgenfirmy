import { google } from "googleapis";

/**
 * Integracja z Kalendarzem Google (konto serwisowe) — używana wyłącznie po stronie serwera.
 * Konfiguracja: patrz komentarz w `.env.example` (GOOGLE_CALENDAR_CLIENT_EMAIL,
 * GOOGLE_CALENDAR_PRIVATE_KEY, GOOGLE_CALENDAR_ID). Jeśli zmienne nie są ustawione,
 * wszystkie funkcje poniżej są no-op (zwracają null) — nie blokują reszty przepływu.
 */

export function isGoogleCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_EMAIL &&
      process.env.GOOGLE_CALENDAR_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_ID,
  );
}

function getCalendarClient() {
  const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Brak konfiguracji konta serwisowego Google Calendar.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });

  return google.calendar({ version: "v3", auth });
}

/** Data w formacie YYYY-MM-DD + 1 dzień — Google Calendar traktuje `end.date` jako wykluczający. */
function nextDayIso(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Tworzy całodniowy wpis w kalendarzu firmowym. Zwraca `eventId` albo `null`, gdy integracja
 * nie jest skonfigurowana lub wystąpił błąd (nie przerywa głównego przepływu akceptacji urlopu). */
export async function createAllDayCalendarEvent(params: {
  summary: string;
  startDate: string;
  endDate: string;
  description?: string;
}): Promise<string | null> {
  if (!isGoogleCalendarConfigured()) {
    return null;
  }

  try {
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID!;
    const { data } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { date: params.startDate },
        end: { date: nextDayIso(params.endDate) },
      },
    });
    return data.id ?? null;
  } catch (error) {
    console.error("[google-calendar] Nie udało się utworzyć wpisu urlopu:", error);
    return null;
  }
}

/** Aktualizuje całodniowy wpis (lub tworzy nowy, gdy brak eventId). */
export async function upsertAllDayCalendarEvent(params: {
  eventId?: string | null;
  summary: string;
  startDate: string;
  endDate: string;
  description?: string;
}): Promise<string | null> {
  if (!isGoogleCalendarConfigured()) {
    return params.eventId ?? null;
  }

  if (params.eventId) {
    try {
      const calendar = getCalendarClient();
      const calendarId = process.env.GOOGLE_CALENDAR_ID!;
      await calendar.events.patch({
        calendarId,
        eventId: params.eventId,
        requestBody: {
          summary: params.summary,
          description: params.description,
          start: { date: params.startDate },
          end: { date: nextDayIso(params.endDate) },
        },
      });
      return params.eventId;
    } catch (error) {
      console.error("[google-calendar] Nie udało się zaktualizować wpisu urlopu:", error);
      await deleteCalendarEvent(params.eventId);
    }
  }

  return createAllDayCalendarEvent(params);
}

/** Usuwa wpis z kalendarza (np. po cofnięciu zaakceptowanego urlopu). Błędy są tylko logowane. */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!isGoogleCalendarConfigured()) {
    return;
  }

  try {
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID!;
    await calendar.events.delete({ calendarId, eventId });
  } catch (error) {
    console.error("[google-calendar] Nie udało się usunąć wpisu urlopu:", error);
  }
}

