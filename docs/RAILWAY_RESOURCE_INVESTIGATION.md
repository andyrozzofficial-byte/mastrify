# Railway resource investigation

Measurement-only logging to understand memory and egress before launch. **Do not treat these logs as permanent.**

## Enable on Railway (backend)

Set on the **server** service:

| Variable | Value | Purpose |
|----------|-------|---------|
| `MASTRIFY_RESOURCE_DEBUG` | `1` | All `[resource]` logs |
| `MASTRIFY_RESOURCE_IDLE_LOG` | `1` | Optional: RSS every 60s when idle |
| `MASTRIFY_RESOURCE_MEMORY_FOLLOWUP` | `1` | Optional: RSS at +5s / +30s / +120s after each master |

Redeploy, run a few masters, then inspect **Deploy logs**.

## Enable on Vercel (frontend correlation)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_MASTRIFY_RESOURCE_DEBUG` | `1` |

Correlates duplicate POST attempts with server `Master started` lines.

## What gets logged

### Mastering jobs
- **Master started** — upload size, RSS/heap at start
- **Master completed** — processing time, master WAV size, RAM delta, storage target
- **RAM after master (follow-up)** — if `MASTRIFY_RESOURCE_MEMORY_FOLLOWUP=1`
- **Master failed** — on errors

### Background / idle
- No separate worker process: one Node process handles HTTP.
- **Idle memory sample** — only with `MASTRIFY_RESOURCE_IDLE_LOG=1`
- **HTTP request** — every route except `/` and `/health` (detect polling)

### Duplicate jobs
- Server: one `Master started` per `POST /master`
- Client: `processing effect mounted` / `POST /master start` / `POST /master skipped (already have masteredUrl)`
- Opening **/master/result** should **not** call `POST /master` (only deliver/download APIs)

### Downloads / egress
- **Storage persist** — upload + master bytes, `storage: supabase|railway|railway-fallback`
- **Egress: master file serve** — each `GET`/`HEAD` on `/masters/:file` with bytes served (full or range)
- **Download triggered** — `POST /master/deliver`

## How to read findings

### Memory (~$2 on Railway)
- Compare **rssHuman** on `Master started` vs `Master completed` and follow-up lines.
- If RSS stays high 120s after **Master completed** with `activeMasterJobs: 0`, suspect heap retention (buffers, caches) not tmp files.
- Tmp files under `/tmp/masters` and `/tmp/uploads` are removed after successful Supabase upload; on fallback they remain on disk until manual cleanup.

### Egress (~10GB)
Likely sources (check log counts × bytes):

1. **Supabase upload** — `uploadMasterWav` reads full WAV into memory and uploads (`Storage persist` → `uploadBytes`).
2. **Railway `/masters` streaming** — Safari preview uses many **206** range requests; each logged under `Egress: master file serve` with `partial: true`.
3. **Static `/uploads`** — original upload served if not deleted (Supabase path deletes after persist).
4. **Playback from Supabase** — does not hit Railway once `afterUrl` is a signed URL; egress is Supabase-side.

### CPU (low)
Expected: mastering is bursty ffmpeg; idle container shows low CPU between requests.

### Preview MP3
Backend does not emit `previewAfterMp3` today; client may set preview URL from response if present. No server-side preview generation in `server/master.js`.

## Quick checklist after a test session

1. Count `Master started` vs `Master completed` (should match 1:1).
2. Any `Master started` without navigation away from processing? → duplicate POST (Strict Mode or effect deps).
3. Many small `Egress` lines with `partial: true`? → preview scrubbing, not full downloads.
4. `storage: supabase` but still high Railway egress? → uploads + any `railway-fallback` plays.

## Turn off

Remove or unset `MASTRIFY_RESOURCE_DEBUG` and redeploy.
