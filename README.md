# buffer-scheduler

Plant **freigegebene** LinkedIn-Posts automatisch in Buffer ein (Mo + Mi, 08:00 Europe/Vienna) über die **Buffer GraphQL API**. Buffer veröffentlicht sie dann autonom → Rechner aus. ToS-konform (Buffer ist offizieller LinkedIn-Partner).

## Wochen-Ablauf (Ziel)

1. **Fr:** Die Claude-Routine entwirft 2 Posts (+ Zitatkarten) → landen mit `status: pending` in `queue/`.
2. **Du gibst frei:** `status: approved` setzen (oder per Push bestätigen).
3. **Cron (Railway):** `npm run schedule` plant die freigegebenen Posts via Buffer-API für nächsten Mo + Mi, 08:00 ein.
4. **Buffer veröffentlicht** automatisch. Dein einziger Schritt bleibt die **Freigabe**.

## Setup (einmalig)

### 1. Buffer API-Key (machst du)
- https://developers.buffer.com → **„API-Schlüssel anfordern"** → Token kopieren.
- **Niemals in Chat/Git** — nur als `.env` (lokal) bzw. **Railway-Secret**.

### 2. Lokal finalisieren
```
cp .env.example .env        # BUFFER_TOKEN eintragen
npm install
npm run introspect          # bestätigt das Live-Schema (exakte Mutation/Felder)
npm run channels            # liefert deine LinkedIn-Channel-ID -> in .env als BUFFER_CHANNEL_ID
```
> Beim ersten echten Lauf finalisiere ich `createScheduledPost()` in `src/buffer.mjs` gegen das Introspection-Ergebnis (Mutation-Name + aktuelles Medien-Format, Buffer-Änderung 25.05.2026).

### 3. Railway (computer-off Betrieb)
- Neues Projekt aus diesem Repo.
- **Variables (Secrets):** `BUFFER_TOKEN`, `BUFFER_API_URL`, `BUFFER_CHANNEL_ID`, `TZ=Europe/Vienna`, `POST_HOUR=8`.
- **Cron Job:** wöchentlich (z. B. Fr/So) → Command `npm run schedule`.

### 4. Queue
- Freigegebene Posts liegen als `queue/*.md` mit Frontmatter `status: approved`, `order: 1|2` (1=Mo, 2=Mi), optional `image:` (gehostete URL).
- Beispiel: siehe `queue/example-post.md`.

## Befehle
| Befehl | Zweck |
|---|---|
| `npm run introspect` | Live-Schema anzeigen (Mutationen/Queries) |
| `npm run channels` | Verbundene Kanäle + IDs |
| `npm run schedule` | Freigegebene Posts für Mo+Mi einplanen |

## Deploy auf Railway (computer-off)
`railway.json` ist vorbereitet (Cron: So 16:00 UTC = 18:00 Wien, Command `npm run schedule`).
1. Railway CLI: `npm i -g @railway/cli` → `railway login` → im Projektordner `railway init` → `railway up`. (Alternativ: Repo auf GitHub pushen und in Railway verbinden.)
2. Railway → Service → **Variables** (Secrets): `BUFFER_TOKEN`, `BUFFER_API_URL=https://api.buffer.com/`, `BUFFER_ORG_ID`, `BUFFER_CHANNEL_ID`, `TZ=Europe/Vienna`, `POST_HOUR=8`.
3. Cron läuft wöchentlich → plant freigegebene `queue/`-Posts für Mo+Mi ein.

## Status (2026-05-28)
- ✅ Buffer-API: **Text + Bild** funktionieren (live verifiziert, create+delete, nichts blieb übrig).
- ✅ Endpoint `api.buffer.com`, Mutation `createPost` (`schedulingType: automatic`, `mode: customScheduled`, `dueAt`, `assets`), Channel `lbirgf` bestätigt.
- ⏳ **Bild-Hosting:** Zitatkarten-PNGs müssen unter öffentlicher URL liegen (z. B. Cloudflare R2) → dann via `image:`-Frontmatter im Queue-Post.
- ⏳ **Content-Pipeline:** freigegebene Posts in eine Cloud-Queue bringen (Repo, aus dem Railway deployt), damit der Cron wirklich computer-off läuft.
- ⚠️ **API-Key rotieren** (war im Chat sichtbar) und neu in `.env`/Railway setzen.
