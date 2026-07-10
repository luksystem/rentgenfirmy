# PUBLIC_REPORT_SECURITY_MODEL — bezpieczne udostępnianie raportu

> Publiczny raport dostępny przez link `/public/report/{token}` zabezpieczony hasłem.
> Domyślnie prywatny. Publiczne API nie ujawnia surowych danych audytu.

## Token

- Generowany losowo: `crypto.randomBytes(24).toString("base64url")` (≈192 bitów entropii).
- Unikalny (`unique` w DB). Możliwość regeneracji (unieważnia stary link).
- Nie jest sekwencyjny, nie zawiera ID sesji.

## Hasło

- Nigdy nie przechowywane jawnie. Hash: `scrypt` z losową solą (format `scrypt:salt:hash`,
  jak `lib/process/kanban-auth.ts`). Weryfikacja `timingSafeEqual`.
- Zmiana hasła = nowy hash. Hasło opcjonalne? Nie — wymagane do włączenia linku (bezpieczeństwo).

## Sesja publiczna

- Po poprawnym haśle: podpisany HMAC cookie (`report_public_session`) z `token` + `exp`
  (jak `kanban-session.ts`). Ważność krótka (np. 12 h). Cookie `httpOnly`, `sameSite=lax`, `secure`.
- Kolejne wejścia w oknie sesji nie wymagają ponownego hasła (do limitu/wygaśnięcia).

## Wygaśnięcie i limity

- `expires_at` — po dacie link nieaktywny (410/404).
- `max_views` (opcjonalny) — licznik `view_count` udanych wyświetleń; po przekroczeniu blokada.
- `is_active` — ręczne włącz/wyłącz.

## Rate limiting i blokada

- Licznik `failed_attempts` na rekordzie share + `locked_until`.
- Po N (np. 5) błędnych próbach w oknie → `locked_until = now + 15 min` (HTTP 429).
- Każda próba (poprawna/błędna) logowana; przy poprawnym haśle licznik błędów zerowany.

## Logowanie dostępu (`audit_report_share_access_log`)

- `accessed_at`, `ip_hash` (SHA-256 z IP + sól serwera — zgodnie z prywatnością, brak surowego IP),
- `user_agent`, `password_ok` (bool), `event` (`view` | `password_ok` | `password_fail`).

## Ochrona przed indeksacją

- Nagłówek `X-Robots-Tag: noindex, nofollow` na trasach publicznych raportu.
- `<meta name="robots" content="noindex,nofollow">` w stronie publicznej.
- `robots.txt`: `Disallow: /public/report/`.

## Autoryzacja i RLS

- Zarządzanie share tylko przez właściciela sesji (`requireOwnedSession`).
- Tabele `audit_report_shares` / `..._access_log`: RLS — dostęp tylko właściciela sesji.
- Publiczny odczyt raportu przechodzi przez **service-role** na serwerze (po weryfikacji hasła/sesji),
  nigdy bezpośrednio z przeglądarki. Brak publicznego endpointu zwracającego surowe `audit_*`.

## Zakres danych

- Publiczny raport zwraca wyłącznie sekcje włączone w `visible_sections` (patrz
  `PUBLIC_REPORT_DATA_VISIBILITY.md`) i tylko pola zatwierdzone do publikacji.

## Ryzyka i mitigacje

| Ryzyko | Mitigacja |
|---|---|
| Zgadywanie tokenu | 192-bit entropia, brak indeksacji |
| Brute-force hasła | rate limit + lock + logowanie |
| Wyciek surowych danych | filtr sekcji server-side, brak public API do `audit_*` |
| Współdzielenie linku po czasie | `expires_at`, `max_views`, wyłączenie/regeneracja |
| Korelacja IP | `ip_hash` zamiast surowego IP |
| Przejęcie cookie | `httpOnly`+`secure`+`sameSite`, krótki `exp` |
