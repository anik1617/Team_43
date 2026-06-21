"""C7 contribution portal — the flywheel UI: gap inbox → contribute (auto-stage to corpus)."""
from __future__ import annotations

import os
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select

from ..db import get_session
from ..experts.routes import current_expert
from ..models import APK_URL, Contribution, ContribStatus, Gap, GapStatus, now_iso
from .export import MAX_UPLOAD_BYTES, safe_ext, stage_attachment, stage_contribution

_HERE = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(_HERE, "templates"))
templates.env.globals["APK_URL"] = APK_URL      # available to the shared base.html on every page
router = APIRouter(tags=["portal"])


@router.get("/app", response_class=HTMLResponse)
def app_showcase(request: Request, session: Session = Depends(get_session)):
    """Public product page: what Kyro does + the Android app download. No auth required."""
    entries = len(session.exec(select(Contribution)).all())
    return templates.TemplateResponse(request, "app.html", {"entries": entries})


def _flash(path: str, msg: str) -> str:
    """Redirect target carrying a one-line confirmation the templates render as a toast."""
    return f"{path}?{urlencode({'msg': msg})}"


@router.get("/portal", response_class=HTMLResponse)
def inbox(request: Request, session: Session = Depends(get_session)):
    gaps = session.exec(select(Gap).order_by(Gap.status, Gap.id)).all()
    contributed = len(session.exec(select(Contribution)).all())
    expert = current_expert(request, session)   # the inbox is browsable open; contributing is gated
    return templates.TemplateResponse(request, "inbox.html",
                                      {"gaps": gaps, "contributed": contributed, "expert": expert})


# keep contributed text bounded — DB hygiene + the staged corpus .txt stays sane
_MAXLEN = {"title": 200, "citation": 300, "contributor": 120, "body": 8000}


@router.post("/portal/contribute")
async def contribute(
        request: Request,
        title: str = Form(...),
        body: str = Form(""),
        citation: str = Form(""),
        gap_id: int | None = Form(None),
        attachment: UploadFile | None = File(None),
        session: Session = Depends(get_session)):
    """Direct contribution: stage straight into the corpus (ingest/). REQUIRES a signed-in expert
    account — the contributor identity + trust tier come from the AUTHENTICATED account (never free
    text), so every nugget carries verifiable provenance. No curator gate; the signed bundle build
    is the human-in-the-loop."""
    expert = current_expert(request, session)
    if not expert:
        return RedirectResponse(
            _flash("/experts/login", "Sign in as a registered expert to contribute."),
            status_code=303)
    # Provenance + trust tier are DERIVED from the account, never client-supplied: a verified expert
    # contributes at tier 1, otherwise tier 2 (community). Tier 0 stays guideline-only, never minted.
    contributor = (f"{expert.name} · {expert.specialty}".strip(" ·")) or expert.email
    tier = 1 if expert.verified else 2

    # Read the optional upload first so we can validate before persisting anything.
    data: bytes | None = None
    filename: str | None = None
    if attachment is not None and attachment.filename:
        filename = attachment.filename
        if not safe_ext(filename):
            return RedirectResponse(
                _flash("/portal", f"Unsupported file type for “{filename}”. Try PDF, image, or text."),
                status_code=303)
        data = await attachment.read()
        if len(data) > MAX_UPLOAD_BYTES:
            return RedirectResponse(
                _flash("/portal", "Attachment is larger than 15 MB. Please upload a smaller file."),
                status_code=303)

    body = body.strip()
    title = title.strip()[:_MAXLEN["title"]]
    if not title or (not body and data is None):
        return RedirectResponse(
            _flash("/portal", "Add a title and either knowledge text or a file before contributing."),
            status_code=303)

    c = Contribution(
        gap_id=gap_id,
        title=title,
        body=body[:_MAXLEN["body"]],
        citation=citation.strip()[:_MAXLEN["citation"]],
        contributor=contributor[:_MAXLEN["contributor"]],
        tier=tier,
        status=ContribStatus.approved,            # direct-contribute: staged on submit
        reviewed_at=now_iso())
    session.add(c)
    session.commit()
    session.refresh(c)                            # need c.id for the corpus filename stem

    if data is not None:
        c.attachment_path = stage_attachment(c, filename, data)
    c.staged_path = stage_contribution(
        c, attachment_name=os.path.basename(c.attachment_path) if c.attachment_path else None)

    if gap_id:
        g = session.get(Gap, gap_id)
        if g:
            g.status = GapStatus.addressed
            session.add(g)
    session.add(c)
    session.commit()
    return RedirectResponse(
        _flash("/portal/contributions", "Knowledge added to Kyro's knowledge base ✓"),
        status_code=303)


@router.get("/portal/contributions", response_class=HTMLResponse)
def contributions(request: Request, session: Session = Depends(get_session)):
    items = session.exec(select(Contribution).order_by(Contribution.id.desc())).all()
    gaps = {g.id: g for g in session.exec(select(Gap)).all()}
    return templates.TemplateResponse(request, "contributions.html",
                                      {"items": items, "gaps": gaps})
