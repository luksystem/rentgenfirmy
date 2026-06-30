# Loxone Miniserver — Swagger UI Server

Standalone, zero-dependency server: interaktywna dokumentacja Swagger UI dla Loxone Miniserver API (V17.0)
z wbudowanym proxy — **Try It Out działa naprawdę**, bez problemów CORS, z autoryzacją server-side.

## Co w środku

| Plik | Opis |
|---|---|
| `server.js` | Node.js server (zero npm dependencies) — UI + spec + proxy `/lox/*` → Miniserver |
| `index.html` | Swagger UI (Loxone branding, proxy status indicator) |
| `loxone-miniserver-api.yaml` | OpenAPI 3.0 spec — 57 endpointów, 8 kategorii |
| `Dockerfile` + `docker-compose.yml` | Deployment na Docker host / ZimaOS |

## Quick start — Node (bez instalacji czegokolwiek)

```bash
node server.js --host 192.168.1.77 --user admin --pass twojehaslo
# → http://localhost:8077
```

Wymagany tylko Node ≥ 14. Zero `npm install`.

## Quick start — Docker

```bash
# edytuj docker-compose.yml (LOX_HOST, LOX_USER, LOX_PASS)
docker compose up -d --build
# → http://<docker-host>:8077
```

## Konfiguracja

| Env var | CLI flag | Default | Opis |
|---|---|---|---|
| `PORT` | `--port` | `8077` | Port UI |
| `LOX_HOST` | `--host` | `192.168.1.77` | IP/host Miniservera |
| `LOX_PORT` | `--lox-port` | `80` | Port Miniservera |
| `LOX_TLS` | `--tls` | off | HTTPS do Miniservera (Gen2) |
| `LOX_TLS_INSECURE` | `--insecure` | off | Pomiń weryfikację certyfikatu |
| `LOX_USER` | `--user` | — | Basic auth user (wstrzykiwany w proxy) |
| `LOX_PASS` | `--pass` | — | Basic auth password |

Jeśli nie podasz `LOX_USER`/`LOX_PASS`, możesz autoryzować się per-request —
przeglądarka przekaże nagłówek `Authorization` przez proxy.

## Endpointy serwera

| Route | Opis |
|---|---|
| `/` | Swagger UI |
| `/spec.yaml` | OpenAPI spec (import do Postman/Insomnia/Bruno) |
| `/health` | Status proxy + target |
| `/lox/*` | Proxy → Miniserver (np. `/lox/jdev/cfg/apiKey`) |

## Użycie w Swagger UI

1. Otwórz `http://localhost:8077`
2. W dropdownie **Servers** wybierz **`/lox` (Built-in proxy)**
3. Rozwiń endpoint → **Try it out** → **Execute**

Szybki test bez UI:

```bash
curl http://localhost:8077/lox/jdev/cfg/apiKey
curl http://localhost:8077/lox/jdev/sps/io/LivingroomLight/On
curl http://localhost:8077/lox/jdev/sys/cpu
```

## Zakres API (V17.0, 31.03.2026)

- **Connectivity** — apiKey, reachability
- **Security** — certyfikaty, keyexchange, enc/fenc, visu password
- **Authentication** — pełny lifecycle JWT (getkey2 → getjwt → refresh → kill)
- **Controls** — `jdev/sps/io/{uuid}/{cmd}` + secured commands
- **VirtualIO** — sterowanie po nazwie, API Connector `SET()`, status queries
- **Structure** — LoxAPP3.json + version check
- **System** — PLC (state/restart/stop/run), config (ip/dhcp/ntp), monitoring (cpu/heap), reboot, SD card, firmware update
- **CloudDNS** — `connect.loxonecloud.com` resolver (V17.0 Remote Connect)

## Limity

- Endpointy **WebSocket-only** (`enablebinstatusupdate`, `keyexchange`, live state events)
  nie działają przez HTTP proxy — do live eventów użyj `node-red-contrib-loxone`.
- Pełny flow tokenowy (AES/RSA encrypted `getjwt`) wymaga implementacji klienckiej —
  proxy obsługuje Basic Auth, co wystarcza do klasycznych webservices na Gen1/Gen2.

---
Taftek · wygenerowano z oficjalnej dokumentacji Loxone V17.0
