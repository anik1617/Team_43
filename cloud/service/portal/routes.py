"""C7 contribution portal — the flywheel UI: gap inbox → contribute (auto-stage to corpus)."""
from __future__ import annotations

import os
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select

from ..db import get_session
from ..models import Contribution, ContribStatus, Gap, GapStatus, now_iso
from .export import MAX_UPLOAD_BYTES, safe_ext, stage_attachment, stage_contribution

_HERE = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(_HERE, "templates"))
router = APIRouter(tags=["portal"])


def _flash(path: str, msg: str) -> str:
    """Redirect target carrying a one-line confirmation the templates render as a toast."""
    return f"{path}?{urlencode({'msg': msg})}"


@router.get("/portal", response_class=HTMLResponse)
def inbox(request: Request, session: Session = Depends(get_session)):
    gaps = session.exec(select(Gap).order_by(Gap.status, Gap.id)).all()
    contributed = len(session.exec(select(Contribution)).all())
    return templates.TemplateResponse(request, "inbox.html",
                                      {"gaps": gaps, "contributed": contributed})


# keep contributed text bounded — DB hygiene + the staged corpus .txt stays sane
_MAXLEN = {"title": 200, "citation": 300, "contributor": 120, "body": 8000}


@router.post("/portal/contribute")
async def contribute(
        title: str = Form(...),
        body: str = Form(""),
        citation: str = Form(""),
        contributor: str = Form(""),
        tier: int = Form(2),
        gap_id: int | None = Form(None),
        attachment: UploadFile | None = File(None),
        session: Session = Depends(get_session)):
    """Direct contribution: stage straight into the corpus (ingest/). No curator gate — the
    signed bundle build is the human-in-the-loop. A contribution may address a gap or stand
    alone (custom upload), and may carry prose, an uploaded file, or both."""
    # Trust tier is NOT client-trusted: the open form self-attests community (2) or expert (1).
    # Tier 0 = canonical/guideline is never client-assignable — else anyone could mint
    # "guideline-grade" provenance and poison the trust ordering. Clamp it server-side.
    tier = tier if tier in (1, 2) else 2

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
                _flash("/portal", "Attachment is larger than 15 MB — please upload a smaller file."),
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
        contributor=contributor.strip()[:_MAXLEN["contributor"]] or "Anonymous contributor",
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
        _flash("/portal/contributions", "Knowledge contributed and staged to the corpus ✓"),
        status_code=303)


@router.get("/portal/contributions", response_class=HTMLResponse)
def contributions(request: Request, session: Session = Depends(get_session)):
    items = session.exec(select(Contribution).order_by(Contribution.id.desc())).all()
    gaps = {g.id: g for g in session.exec(select(Gap)).all()}
    return templates.TemplateResponse(request, "contributions.html",
                                      {"items": items, "gaps": gaps})
