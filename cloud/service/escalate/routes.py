"""
E8 — /escalate : the device's 🔴 hard-stop handoff to a live human expert.

When Kyro reaches an irreducible surgical/localization step it cannot own, the device POSTs the
captured encounter state here; we relay a pre-briefed summary to the on-call neurosurgeon over
Twilio WhatsApp. This is the "continuity, not knowledge" hero — a dropped call loses nothing
because the handoff carries the structured state.

Twilio creds are optional: with them set we send for real; without them we return a 'staged'
response (so the distributed demo works even before Twilio is wired). Credentials come from env
(TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM / KYRO_ONCALL_WHATSAPP_TO).

Abuse controls (this is an outbound-messaging relay = a cost/spear-phishing target):
  • Field length caps (below) bound what gets forwarded into WhatsApp.
  • Optional shared secret: set KYRO_ESCALATE_TOKEN and callers must send a matching
    X-Kyro-Token header. UNSET (the demo default) = open, so the distributed demo still works
    with no provisioning — but a public deploy can lock the relay by setting one env var.
  • A small in-process rate limit caps sends per rolling minute (KYRO_ESCALATE_RATE_MAX).
"""
from __future__ import annotations

import collections
import datetime as dt
import os
import threading
import time
import uuid

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/escalate", tags=["escalate"])


class Escalation(BaseModel):
    # caps bound the payload relayed to WhatsApp (over-long fields -> 422 automatically)
    case_summary: str = Field(..., max_length=4000)        # pre-briefed handoff (GCS, pupils, vitals, leaf)
    location: str | None = Field(default=None, max_length=200)    # facility / GMO location
    reached_leaf: str | None = Field(default=None, max_length=120)  # the CGT leaf where Kyro stopped
    callback: str | None = Field(default=None, max_length=80)     # phone/WhatsApp to reach the GMO


def _check_token(x_kyro_token: str | None) -> None:
    """When KYRO_ESCALATE_TOKEN is configured, require a matching X-Kyro-Token header.
    Unset => open (demo default). 401 on mismatch."""
    expected = os.environ.get("KYRO_ESCALATE_TOKEN")
    if expected and x_kyro_token != expected:
        raise HTTPException(status_code=401, detail="invalid or missing X-Kyro-Token")


_RATE_MAX = int(os.environ.get("KYRO_ESCALATE_RATE_MAX", "20"))   # sends per rolling window
_RATE_WINDOW_S = 60
_recent: "collections.deque[float]" = collections.deque()
_rate_lock = threading.Lock()


def _rate_ok() -> bool:
    now = time.time()
    with _rate_lock:
        while _recent and now - _recent[0] > _RATE_WINDOW_S:
            _recent.popleft()
        if len(_recent) >= _RATE_MAX:
            return False
        _recent.append(now)
        return True


def _twilio_send(body: str) -> dict:
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    frm = os.environ.get("TWILIO_WHATSAPP_FROM")          # e.g. "whatsapp:+14155238886"
    to = os.environ.get("KYRO_ONCALL_WHATSAPP_TO")        # e.g. "whatsapp:+92..."
    if not all((sid, token, frm, to)):
        return {"delivered": False, "channel": "staged",
                "note": "Twilio not configured — escalation captured but not sent (demo-safe)."}
    from twilio.rest import Client                          # imported lazily; optional dep
    msg = Client(sid, token).messages.create(body=body, from_=frm, to=to)
    return {"delivered": True, "channel": "whatsapp", "sid": msg.sid}


@router.post("")
def escalate(e: Escalation, x_kyro_token: str | None = Header(default=None)) -> dict:
    _check_token(x_kyro_token)
    if not _rate_ok():
        raise HTTPException(status_code=429, detail="escalation rate limit exceeded; retry shortly")
    ticket = f"esc_{uuid.uuid4().hex[:10]}"
    ts = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    briefing = (
        f"🧠 KYRO ESCALATION {ticket}\n"
        f"{ts}\n"
        f"Stopped at: {e.reached_leaf or 'irreducible surgical step'}\n"
        f"Location: {e.location or 'n/a'}  ·  Callback: {e.callback or 'n/a'}\n\n"
        f"{e.case_summary}"
    )
    result = _twilio_send(briefing)
    return {"ticket": ticket, "at": ts, **result}
