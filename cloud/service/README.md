# Kyro Cloud Service

One small FastAPI app, **two functions, one deploy** — the thin cloud edge of an otherwise
on-device product:

- **C7 — Contribution portal** (`/portal`): the community-knowledge flywheel.
  Gap inbox → contribute → curate/approve → **stage into the corpus**. An approved nugget is
  written to `cloud/ingest/contributions/<id>.txt` (provenance-headed), so the next
  `build_bundle` run ingests it. That staging step is the flywheel — and the moat.
- **E8 — Escalation relay** (`POST /escalate`): the device's 🔴 hard-stop handoff. Relays a
  pre-briefed encounter summary to the on-call neurosurgeon over Twilio WhatsApp.
  *"Continuity, not knowledge"* — a dropped call loses nothing.

> The clinical **decision engine is NOT here** — it runs on-device, offline. This service is
> only knowledge intake + the human handoff. That minimal cloud footprint is a pitch strength.

## Run locally

```bash
cd cloud
.venv/Scripts/python -m uvicorn service.app:app --reload --port 8000
# open http://localhost:8000/portal
```

Endpoints: `/portal` (gap inbox) · `/portal/curate` · `/portal/contributions` ·
`POST /escalate` · `/healthz`.

## Get a public URL (for the distributed demo: remote device + teammate)

**Option A — quick tunnel (fastest, your machine stays up):**
```bash
# run uvicorn (above), then in another shell:
cloudflared tunnel --url http://localhost:8000      # or: ngrok http 8000
```
Share the printed `https://…` URL. The remote Android device hits `…/escalate`; your teammate
opens `…/portal`.

**Option B — deploy to Render (free, always-on, recommended for the real demo):**
1. Push this branch to GitHub.
2. Render → **New → Blueprint** → pick the repo → it reads `cloud/service/render.yaml`.
   (Or **New → Web Service**: Root Directory `cloud`, Build `pip install -r service/requirements.txt`,
   Start `uvicorn service.app:app --host 0.0.0.0 --port $PORT`.)
3. You get a public `https://kyro-cloud.onrender.com`.

> Free tier disk is **ephemeral** — the SQLite DB + staged contributions reset on redeploy.
> Fine for a demo (gaps re-seed on boot). For persistence, add a Render Disk or Postgres.

## Enable real WhatsApp escalation (optional)

Set these env vars (Render dashboard or local `.env`):
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+14155238886`),
`KYRO_ONCALL_WHATSAPP_TO` (the on-call number). Without them, `/escalate` still returns a ticket
and reports `channel: "staged"` — so the demo never breaks.

```bash
curl -X POST $URL/escalate -H 'content-type: application/json' \
  -d '{"case_summary":"31M, lucid interval then L pupil fixed, GCS 14->7","location":"BHU Gilgit","reached_leaf":"N50_operate_vs_transfer"}'
```

## Layout
```
service/
  app.py              FastAPI app (mounts portal + escalate, lifespan = init_db + seed)
  db.py  models.py    SQLite + SQLModel (Gap, Contribution)
  seed.py             seeds realistic gaps (abstentions / must-abstain vignettes)
  portal/routes.py    the flywheel UI + endpoints
  portal/export.py    approved contribution -> staged corpus file (the loop closing)
  portal/templates/   inbox · curate · provenance-log (mobile-friendly)
  escalate/routes.py  POST /escalate -> Twilio WhatsApp (graceful stub if unconfigured)
```
