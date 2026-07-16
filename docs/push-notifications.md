# Web Push — powiadomienia systemowe

Aplikacja używa standardowego **Web Push** (Push API + Notifications API + Service Worker + VAPID). Web Push jest **dodatkowym kanałem dostarczenia** obok istniejących powiadomień w aplikacji (`user_notifications` + realtime).

## Architektura

| Warstwa | Pliki |
|---------|-------|
| Baza | `supabase/migrations/133_push_subscriptions.sql` |
| API | `app/api/push/{status,subscribe,unsubscribe,test}/route.ts` |
| Serwer | `lib/push/send-push.ts` → `sendPushToUser()` |
| Service Worker | `public/sw.js` |
| Frontend | `hooks/use-push-notifications.ts`, `components/push/push-notifications-settings.tsx` |
| Ustawienia | `/moja-praca/powiadomienia` |

Subskrypcje są powiązane z `profiles.id` (= `auth.users.id`). Przy wylogowaniu subskrypcja **nie jest usuwana** — powiadomienia nadal trafiają na konto użytkownika na danym urządzeniu.

## Zmienne środowiskowe

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:biuro@luksystem.pl
```

Generowanie kluczy:

```bash
npx web-push generate-vapid-keys
```

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — frontend (subskrypcja PushManager)
- `VAPID_PRIVATE_KEY` — **tylko serwer** (Vercel, `.env.local`)
- `VAPID_SUBJECT` — kontakt mailto aplikacji

**Nigdy** nie commituj prawdziwych kluczy. Uzupełnij `.env.local` lokalnie i zmienne w Vercel (Project → Settings → Environment Variables).

## Supabase — migracja

```bash
supabase db push
```

lub uruchom SQL z `133_push_subscriptions.sql` w Supabase SQL Editor.

Tabela `push_subscriptions` ma RLS: użytkownik widzi i zarządza wyłącznie własnymi subskrypcjami. Wysyłka push z backendu używa `SUPABASE_SERVICE_ROLE_KEY` (już w projekcie).

## Vercel

1. Dodaj zmienne `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
2. Wdróż aplikację (HTTPS jest wymagany dla Web Push).
3. Upewnij się, że `public/sw.js` i `public/manifest.webmanifest` są dostępne bez logowania (middleware wyklucza te ścieżki).

## Test lokalny

1. Uzupełnij klucze VAPID w `.env.local`.
2. Uruchom migrację Supabase.
3. `npm run dev`
4. Zaloguj się → `/moja-praca/powiadomienia` → **Włącz powiadomienia** → **Wyślij testowe**.
5. Przejdź na inną kartę lub zamknij kartę — powiadomienie powinno pojawić się systemowo.
6. Kliknięcie otwiera wewnętrzną ścieżkę aplikacji.

## Test po wdrożeniu

Powtórz kroki 4–6 na produkcyjnym HTTPS. Sprawdź w DevTools → Application → Service Workers, czy `/sw.js` jest zarejestrowany.

## Platformy

| Platforma | Zachowanie |
|-----------|------------|
| Chrome / Edge / Firefox (desktop) | Pełna obsługa po HTTPS |
| Android (Chrome) | Pełna obsługa |
| iOS Safari | Wymaga dodania do ekranu początkowego (PWA); instrukcja w UI |

## Ikony PWA

Ikony aplikacji i powiadomień znajdują się w `public/icons/` (źródło: `rentgen-brand-assets`).

- PWA: `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`
- Push: `notification-icon-192x192.png` (icon), `push-badge-96x96.png` (badge)
- Favicon / Apple: `favicon.ico`, `apple-touch-icon-180x180.png`

## Użycie `sendPushToUser()` w modułach

Przykład po przypisaniu zadania użytkownikowi (obok istniejącego powiadomienia in-app):

```typescript
import { createWorkItemAssignedNotificationServer } from "@/lib/notifications/work-item-notifications";
import { sendPushToUser } from "@/lib/push/send-push";
import { workItemLinkUrl } from "@/lib/my-work/types";

// Po utworzeniu zadania:
await createWorkItemAssignedNotificationServer({
  workItemId: item.id,
  title: item.title,
  recipientProfileId: item.assignedUserId,
});

await sendPushToUser(item.assignedUserId, {
  title: "Nowe zadanie przypisane",
  body: item.title,
  url: workItemLinkUrl(item.id),
  tag: `work-item-${item.id}`,
  notificationId: item.id,
}).catch((error) => {
  console.error("[push] work_item_assigned delivery failed", { workItemId: item.id });
});
```

Push nie zastępuje `user_notifications` — to osobny kanał. Błędy push nie powinny blokować logiki biznesowej (`.catch` lub fire-and-forget).

## Bezpieczeństwo

- Endpoint testowy wysyła wyłącznie do zalogowanego użytkownika (stały payload testowy).
- Limit: 1 test / 60 s na użytkownika.
- URL w powiadomieniu musi być wewnętrzną ścieżką (`/...`).
- Subskrypcje wygasłe (HTTP 404/410) są automatycznie usuwane.
