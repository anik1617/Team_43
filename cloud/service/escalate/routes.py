"""
E8 — /escalate : the device's 🔴 hard-stop handoff to a live human expert.

When Kyro reaches a step it cannot own and the device is ONLINE, it POSTs the captured encounter
state here. The cloud then DETERMINISTICALLY matches a registered, opted-in specialist (code, not
the model — the inversion holds), relays a pre-briefed summary to them over Twilio WhatsApp, and
returns the *recommendation* to the device — **never the surgeon's phone number** (PII stays in
the cloud; the device only learns who was contacted, not how to reach them).

Twilio creds are optional: with them set we send for real; without them we return a 'staged'
response so the distributed demo works before Twilio is wired.

Abuse controls (outbound-messaging relay = a cost/spear-phishing target):
  • Field length caps bound what is forwarded into WhatsApp.
  • Optional shared secret: set KYRO_ESCALATE_TOKEN → callers must send a matching X-Kyro-Token
    header. Unset (the demo default) = open. A public deploy can lock the relay with one env var.
  • A small in-process rate limit caps sends per rolling minute (KYRO_ESCALATE_RATE_MAX).
"""
from __future__ import annotations

import collections
import os
import threading
import time
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..db import get_session
from ..matching import best_match
from ..models import EscalationLog, Expert, now_iso

router = APIRouter(prefix="/escalate", tags=["escalate"])


class Escalation(BaseModel):
    # caps bound the payload relayed to WhatsApp (over-long fields -> 422 automatically)
    case_summary: str = Field(..., max_length=4000)        # pre-briefed handoff (GCS, pupils, vitals, leaf)
    needed_specialty: str = Field(default="neurosurgery", max_length=80)
    location: str | None = Field(default=None, max_length=200)
    region: str | None = Field(default=None, max_length=120)      # used to prefer an in-region expert
    reached_leaf: str | None = Field(default=None, max_length=120)
    callback: str | None = Field(default=None, max_length=80)     # how the on-scene clinician is reached


def _check_token(x_kyro_token: str | None) -> None:
    expected = os.environ.get("KYRO_ESCALATE_TOKEN")
    if expected and x_kyro_token != expected:
        raise HTTPException(status_code=401, detail="invalid or missing X-Kyro-Token")


_RATE_MAX = int(os.environ.get("KYRO_ESCALATE_RATE_MAX", "20"))
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


def _twilio_send(body: str, to_e164: str) -> dict:
    """Send the briefing to a specific E.164 number over WhatsApp. Staged stub if Twilio (or the
    number) is missing — so the demo never breaks and we never accidentally text a real person."""
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    frm = os.environ.get("TWILIO_WHATSAPP_FROM")          # e.g. "whatsapp:+14155238886"
    if not all((sid, token, frm, to_e164)):
        return {"delivered": False, "channel": "staged",
                "note": "Twilio not configured — escalation captured but not sent (demo-safe)."}
    to = to_e164 if to_e164.startswith("whatsapp:") else f"whatsapp:{to_e164}"
    from twilio.rest import Client                          # imported lazily; optional dep
    msg = Client(sid, token).messages.create(body=body, from_=frm, to=to)
    return {"delivered": True, "channel": "whatsapp", "sid": msg.sid}


@router.post("")
def escalate(e: Escalation, x_kyro_token: str | None = Header(default=None),
             session: Session = Depends(get_session)) -> dict:
    _check_token(x_kyro_token)
    if not _rate_ok():
        raise HTTPException(status_code=429, detail="escalation rate limit exceeded; retry shortly")

    ticket = f"esc_{uuid.uuid4().hex[:10]}"
    ts = now_iso()
    specialty = e.needed_specialty or "neurosurgery"

    # DETERMINISTIC match over opted-in, phone-carrying specialists (the model is not on this path).
    experts = session.exec(select(Expert)).all()
    match = best_match(experts, specialty, e.region)

    briefing = (
        f"🧠 KYRO ESCALATION {ticket}\n{ts}\n"
        f"Stopped at: {e.reached_leaf or 'irreducible surgical step'}\n"
        f"Location: {e.location or 'n/a'}  ·  On-scene callback: {e.callback or 'n/a'}\n\n"
        f"{e.case_summary}\n\n"
        f"(You are receiving this because you opted in to Kyro emergency teleconsults. Reply STOP to opt out.)"
    )

    if match:
        result = _twilio_send(briefing, match.phone_e164)
        # NOTE: phone number is deliberately NOT included in the response — PII stays in the cloud.
        recommended = {"name": match.name or "(unnamed expert)", "role": match.role,
                       "institution": match.institution, "region": match.region,
                       "specialty": match.specialty, "on_call": match.on_call}
    else:
        result = {"delivered": False, "channel": "staged",
                  "note": f"No opted-in {specialty} specialist is reachable — "
                          f"handoff staged for on-screen relay."}
        recommended = None

    session.add(EscalationLog(
        ticket=ticket, case_summary=e.case_summary, needed_specialty=specialty, region=e.region,
        matched_expert_id=(match.id if match else None),
        matched_name=(match.name if match else None),
        channel=str(result.get("channel", "none")), delivered=bool(result.get("delivered"))))
    session.commit()

    return {"ticket": ticket, "at": ts, "recommended": recommended, **result}
