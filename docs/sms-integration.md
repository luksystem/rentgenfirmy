# Integracja SMS (Rentgen firmy)

Niezależny moduł wysyłki SMS przez operatora **SMSAPI.pl**. Wysyłka odbywa się wyłącznie po stronie serwera (Vercel API Routes + Supabase). Klucz API nigdy nie trafia do frontendu.

## Zmienne środowiskowe

Dodaj do `.env.local` (lokalnie) i w Vercel → Settings → Environment Variables:

```env
SMS_PROVIDER=smsapi
SMSAPI_TOKEN=twoj_token_oauth_z_panelu_smsapi
SMSAPI_FROM=Luksystem
SMS_TEST_PHONE=+48500100200
SMSAPI_TEST_MODE=1
SMS_WEBHOOK_SECRET=opcjonalny_sekret_webhooka
NEXT_PUBLIC_APP_URL=https://twoja-domena.pl
```

| Zmienna | Opis |
|--------|------|
| `SMS_PROVIDER` | Provider SMS (`smsapi` na start; później `twilio`, `serwersms`) |
| `SMSAPI_TOKEN` | Token OAuth z panelu SMSAPI (scope: wysyłka SMS) |
| `SMSAPI_FROM` | Nazwa nadawcy (musi być zweryfikowana w SMSAPI) |
| `SMS_TEST_PHONE` | Opcjonalny numer domyślny do testów manualnych |
| `SMSAPI_TEST_MODE` | `1` = parametr `test=1` w SMSAPI (walidacja bez wysyłki i opłat). Domyślnie `1` poza `production`. |
| `SMS_WEBHOOK_SECRET` | Opcjonalna weryfikacja webhooka statusów |
| `NEXT_PUBLIC_APP_URL` | Publiczny URL aplikacji (do `notify_url` webhooka) |

## Migracja bazy

Uruchom migrację:

```bash
supabase db push
```

Plik: `supabase/migrations/072_sms_messages.sql`

### Tabela `sms_messages`

| Kolumna | Opis |
|---------|------|
| `id` | UUID rekordu w Rentgenie |
| `recipient_phone` | Numer odbiorcy (format wyświetlany) |
| `message` | Treść SMS |
| `provider` | Nazwa providera (`smsapi`) |
| `provider_message_id` | ID wiadomości u operatora |
| `status` | `queued` → `sent` / `failed` → opcjonalnie `delivered` |
| `error_message` | Komunikat błędu operatora |
| `metadata` | JSON (np. `taskId`, `clientId`, `type`) |
| `sent_at` | Czas wysłania do operatora |
| `delivered_at` | Czas doręczenia (z webhooka) |
| `created_at` | Utworzenie rekordu |

Dostęp do tabeli: **tylko service role** (API serwerowe).

## Architektura kodu

```text
lib/sms/types.ts
lib/sms/config.ts
lib/sms/validate.ts
lib/sms/smsProvider.ts
lib/sms/providers/smsapiProvider.ts
lib/sms/sendSms.ts
lib/sms/webhook.ts
lib/supabase/sms-repository.ts
app/api/sms/send/route.ts
app/api/sms/messages/route.ts
app/api/sms/status-webhook/route.ts
app/dev/sms-test/page.tsx
```

## Wysyłka SMS z kodu

```ts
import { sendSms } from "@/lib/sms/sendSms";

await sendSms({
  phone: client.phone,
  message: `Dzień dobry, link do płatności: ${paymentLink}`,
  metadata: {
    taskId,
    clientId,
    type: "payment_link",
  },
});
```

Przepływ:

1. Walidacja numeru i treści
2. Insert do `sms_messages` ze statusem `queued`
3. Wywołanie providera (SMSAPI)
4. Sukces → `sent` + `provider_message_id` + `sent_at`
5. Błąd → `failed` + `error_message`

## API

### POST /api/sms/send

Wymaga roli **administrator**.

```json
{
  "phone": "+48500100200",
  "message": "Test SMS z aplikacji Rentgen"
}
```

### GET /api/sms/messages?limit=10

Lista ostatnich SMS (admin).

### POST /api/sms/status-webhook

Webhook statusów doręczenia SMSAPI. Parametry m.in.: `MsgId`, `status`, `status_name`, `donedate`.

W panelu SMSAPI ustaw Callback address DLR_SMS:

```text
https://twoja-domena.pl/api/sms/status-webhook?secret=TWOJ_SEKRET
```

## Test manualny (lokalnie)

1. Ustaw `SMSAPI_TOKEN` w `.env.local`
2. Uruchom migrację `072_sms_messages.sql`
3. `npm run dev`
4. Zaloguj się jako administrator
5. Wejdź na `/dev/sms-test`
6. Wyślij SMS testowy
7. Sprawdź rekord w `sms_messages` (status `sent` lub `failed`)

W dev domyślnie `SMSAPI_TEST_MODE=1` — walidacja bez faktycznej wysyłki.

## Gdzie podpiniać później

- Płatności / proformy — link do płatności
- Przypomnienia serwisowe — SLA CAFE
- Powiadomienia zespołu — pilne zadania
- Zlecenia podwykonawców

Wywołuj `sendSms()` tylko z serwera (API route, cron), nigdy z frontendu.

## Podmiana operatora

1. Dodaj `lib/sms/providers/twilioProvider.ts`
2. Rozszerz `getSmsProvider()` w `lib/sms/smsProvider.ts`
3. Ustaw `SMS_PROVIDER=twilio`
