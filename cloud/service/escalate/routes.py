"""
E8 — /escalate : the device's 🔴 hard-stop handoff to a live human expert.

When Kyro reaches an irreducible surgical/localization step it cannot own, the device POSTs the
captured encounter state here; we relay a pre-briefed summary to the on-call neurosurgeon over
Twilio WhatsApp. This is the "continuity, not knowledge" hero — a dropped call loses nothing
because the handoff carries the structured state.

Twilio creds are optional: with them set we send for real; without them we return a 'staged'
response (so the distributed demo works even before Twilio is wired). Credentials come from env
(TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM / KYRO_ONCALL_WHATSAPP_TO).
"""
from __future__ import annotations

import datetime as dt
import os
import uuid

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/escalate", tags=["escalate"])


class Escalation(BaseModel):
    case_summary: str                    # pre-briefed handoff text (GCS, pupils, vitals, leaf reached)
    location: str | None = None          # facility / GMO location
    reached_leaf: str | None = None      # the CGT leaf where Kyro stopped
    callback: str | None = None          # phone/WhatsApp to reach the GMO


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
def escalate(e: Escalation) -> dict:
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
