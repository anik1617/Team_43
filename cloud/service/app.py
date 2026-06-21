"""
Kyro Cloud Service — one small FastAPI app, two functions, one deploy:
  • C7 contribution portal  (/portal ...)  — the community knowledge flywheel
  • E8 escalation relay      (/escalate)   — device 🔴 stop → Twilio WhatsApp to the on-call expert

The clinical decision engine is NOT here — it runs on-device, offline. This is the thin cloud
edge: knowledge intake + the human handoff. Deployable to any free tier (one public URL serves
the remote demo: the device hits /escalate, the teammate uses /portal).

Run locally:   cd cloud && .venv/Scripts/python -m uvicorn service.app:app --reload --port 8000
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load cloud/.env for local dev BEFORE anything reads os.environ (Google/session/Twilio secrets).
# On Render the env is set in the dashboard, so the file is absent and this simply no-ops.
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI                       # noqa: E402
from fastapi.responses import RedirectResponse    # noqa: E402
from fastapi.staticfiles import StaticFiles        # noqa: E402
from starlette.middleware.sessions import SessionMiddleware  # noqa: E402

from .db import init_db                            # noqa: E402
from .escalate.routes import router as escalate_router  # noqa: E402
from .experts.routes import router as experts_router    # noqa: E402
from .portal.routes import router as portal_router      # noqa: E402
from .seed import seed_if_empty                    # noqa: E402

# Session secret: NEVER a hardcoded fallback (a known key in the repo = forgeable sessions). Use
# KYRO_SESSION_SECRET if set; otherwise generate an unguessable per-process secret so cookies are
# never signable with a public key — the trade-off is that a restart invalidates logins (fine for
# the demo). Set KYRO_SESSION_SECRET on the deploy for stable sessions.
_SESSION_SECRET = os.environ.get("KYRO_SESSION_SECRET")
if not _SESSION_SECRET:
    import secrets
    _SESSION_SECRET = secrets.token_urlsafe(32)
    print("[kyro] WARNING: KYRO_SESSION_SECRET not set — using a random per-process secret "
          "(logins reset on restart). Set KYRO_SESSION_SECRET on the deploy for stable sessions.")

# Secure cookies by default (Render serves HTTPS). Local dev / the test suite run over plain HTTP,
# where a Secure cookie is never sent — those set KYRO_INSECURE_COOKIES=1 to allow it.
_INSECURE_COOKIES = os.environ.get("KYRO_INSECURE_COOKIES") == "1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_if_empty()
    yield


app = FastAPI(title="Kyro Cloud Service", version="0.1.0", lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=_SESSION_SECRET,
                   https_only=not _INSECURE_COOKIES, same_site="lax")

# Static assets (logo, favicon) — served by the app itself so the portal stays self-contained.
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")),
          name="static")


@app.get("/healthz")
def healthz():
    return {"ok": True, "service": "kyro-cloud",
            "functions": {"portal": "/portal", "escalate": "POST /escalate",
                          "experts": "/experts/register"}}


@app.get("/")
def root():
    return RedirectResponse("/portal")


app.include_router(portal_router)
app.include_router(escalate_router)
app.include_router(experts_router)
