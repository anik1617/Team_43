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

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from .db import init_db
from .escalate.routes import router as escalate_router
from .portal.routes import router as portal_router
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_if_empty()
    yield


app = FastAPI(title="Kyro Cloud Service", version="0.1.0", lifespan=lifespan)


@app.get("/healthz")
def healthz():
    return {"ok": True, "service": "kyro-cloud",
            "functions": {"portal": "/portal", "escalate": "POST /escalate"}}


@app.get("/")
def root():
    return RedirectResponse("/portal")


app.include_router(portal_router)
app.include_router(escalate_router)
