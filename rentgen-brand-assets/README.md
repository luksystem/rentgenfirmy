# Rentgen — logo i ikony PWA

Znak Rentgena łączy geometryczną literę **R** z pierścieniem diagnostycznym i punktem danych. Ma kojarzyć się z monitoringiem, analizą, widocznością procesów i sterowaniem BMS.

## Kolory marki

- Granat tła: `#081B33`
- Turkus: `#22D3EE`
- Niebieski: `#3B82F6`
- Biel punktu danych: `#FFFFFF`

## Pliki główne

- `rentgen-app-icon-master-1024.png` — główna ikona aplikacji.
- `rentgen-logo-mark-transparent-1024.png` — znak na przezroczystym tle.

## Ikony aplikacji

- `icons/pwa-192x192.png` — standardowa ikona PWA.
- `icons/pwa-512x512.png` — duża ikona PWA.
- `icons/pwa-maskable-512x512.png` — pełne tło do maskowania przez Androida.
- `icons/apple-touch-icon-180x180.png` — ikona ekranu początkowego iOS/iPadOS.
- `icons/favicon.ico` — favicon 16/32/48 px.
- `icons/favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` — favicony PNG.

## Powiadomienia push

- `icons/notification-icon-192x192.png` — kolorowa ikona powiadomienia.
- `icons/push-badge-72x72.png`
- `icons/push-badge-96x96.png` — rekomendowany domyślny badge.
- `icons/push-badge-128x128.png`

Badge jest monochromatyczny i ma przezroczyste tło. System operacyjny może nadać mu własny kolor.

## Instalacja

1. Skopiuj katalog `icons` do katalogu publicznego aplikacji.
2. Wstaw wpisy z `manifest-icons.json` do `manifest.webmanifest`.
3. Dodaj wpisy z `head-snippet.html` do sekcji `<head>`.
4. W Service Workerze użyj `notification-icon-192x192.png` i `push-badge-96x96.png` zgodnie z przykładem w `service-worker-push-snippet.js`.

