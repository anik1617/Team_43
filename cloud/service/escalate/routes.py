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
import re
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


_URL_RE = re.compile(r"(?i)\b(?:https?|ftp)://\S+")


def _defang(text: str) -> str:
    """Neutralise URLs in operator-supplied text so an injected link can't render as clickable in
    the surgeon's WhatsApp (http://evil → http[:]//evil)."""
    return _URL_RE.sub(lambda m: m.group(0).replace("://", "[:]//"), text or "")


def _short(text: str) -> str:
    """Short fields: collapse to a single defanged line (no newlines to forge our own header lines)."""
    return _defang((text or "").replace("\r", " ").replace("\n", " ")).strip()


def _twilio_configured() -> bool:
    return all(os.environ.get(k) for k in
               ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"))


def _twilio_send(body: str, to_e164: str) -> dict:
    """Send the briefing to a specific E.164 number over WhatsApp. Staged stub if Twilio (or the
    number) is missing — so the demo never breaks and we never accidentally text a real person.
    The Twilio SID stays server-side (never returned to the unauthenticated caller)."""
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    frm = os.environ.get("TWILIO_WHATSAPP_FROM")          # e.g. "whatsapp:+14155238886"
    if not all((sid, token, frm, to_e164)):
        return {"delivered": False, "channel": "staged",
                "note": "Twilio not configured — escalation captured but not sent (demo-safe)."}
    to = to_e164 if to_e164.startswith("whatsapp:") else f"whatsapp:{to_e164}"
    from twilio.rest import Client                          # imported lazily; optional dep
    Client(sid, token).messages.create(body=body, from_=frm, to=to)   # sid kept server-side
    return {"delivered": True, "channel": "whatsapp"}


@router.post("")
def escalate(e: Escalation, x_kyro_token: str | None = Header(default=None),
             session: Session = Depends(get_session)) -> dict:
    _check_token(x_kyro_token)
    if not _rate_ok():
        raise HTTPException(status_code=429, detail="escalation rate limit exceeded; retry shortly")

    ticket = f"esc_{uuid.uuid4().hex[:10]}"
    ts = now_iso()
    # normalize BEFORE the 'or' default so a whitespace specialty can't collapse to '' and widen
    # the match to every specialty.
    specialty = (e.needed_specialty or "").strip() or "neurosurgery"

    # DETERMINISTIC match over opted-in, phone-carrying specialists (the model is not on this path).
    experts = session.exec(select(Expert)).all()
    match = best_match(experts, specialty, e.region)

    # Operator-supplied text is UNTRUSTED: defang URLs, single-line the short fields, and fence the
    # case narrative so injected text can't masquerade as Kyro's own system lines. The opt-out
    # footer is server-generated (after the fence) and therefore non-spoofable.
    briefing = (
        f"🧠 KYRO ESCALATION {ticket}\n{ts}\n"
        f"Specialty requested: {specialty}\n"
        f"Stopped at: {_short(e.reached_leaf) or 'irreducible surgical step'}\n"
        f"Location: {_short(e.location) or 'n/a'}  ·  On-scene callback: {_short(e.callback) or 'n/a'}\n"
        f"----- UNVERIFIED, MACHINE-RELAYED CASE TEXT -----\n"
        f"{_defang(e.case_summary)}\n"
        f"----- END CASE TEXT -----\n"
        f"(Sent by Kyro because you opted in to emergency teleconsults. Reply STOP to opt out.)"
    )

    if match:
        # Fail CLOSED on the dangerous path: if Twilio is live but the relay isn't locked with a
        # token, don't actually send — an open public endpoint must not drive real WhatsApp.
        if _twilio_configured() and not os.environ.get("KYRO_ESCALATE_TOKEN"):
            result = {"delivered": False, "channel": "staged",
                      "note": "Live relay requires KYRO_ESCALATE_TOKEN — staged, not sent."}
        else:
            result = _twilio_send(briefing, match.phone_e164)
        # NON-IDENTIFYING response: no name / phone / institution / region — an open endpoint must
        # not let a caller enumerate the expert directory. The audit log keeps WHO, server-side.
        recommended = {"specialty": match.specialty, "on_call": match.on_call}
    else:
        result = {"delivered": False, "channel": "staged",
                  "note": f"No opted-in {specialty} specialist is reachable — "
                          f"handoff staged for on-screen relay."}
        recommended = None

    # Audit log stores NO PHI (no case_summary) — just who/when/specialty/region/outcome.
    session.add(EscalationLog(
        ticket=ticket, needed_specialty=specialty, region=e.region,
        matched_expert_id=(match.id if match else None),
        matched_name=(match.name if match else None),
        channel=str(result.get("channel", "none")), delivered=bool(result.get("delivered"))))
    session.commit()

    return {"ticket": ticket, "at": ts, "matched": match is not None,
            "recommended": recommended, **result}
