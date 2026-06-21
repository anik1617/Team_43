"""C7 contribution portal — the flywheel UI: gap inbox → contribute → curate → stage to corpus."""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select

from ..db import get_session
from ..models import Contribution, ContribStatus, Gap, GapStatus, now_iso
from .export import stage_contribution

_HERE = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(_HERE, "templates"))
router = APIRouter(tags=["portal"])


@router.get("/portal", response_class=HTMLResponse)
def inbox(request: Request, session: Session = Depends(get_session)):
    gaps = session.exec(select(Gap).order_by(Gap.status, Gap.id)).all()
    pending = len(session.exec(
        select(Contribution).where(Contribution.status == ContribStatus.pending)).all())
    return templates.TemplateResponse(request, "inbox.html",
                                      {"gaps": gaps, "pending": pending})


# keep contributed text bounded — DB hygiene + the staged corpus .txt stays sane
_MAXLEN = {"title": 200, "citation": 300, "contributor": 120, "body": 8000}


@router.post("/portal/contribute")
def contribute(gap_id: int = Form(...), title: str = Form(...), body: str = Form(...),
               citation: str = Form(...), contributor: str = Form(...), tier: int = Form(2),
               session: Session = Depends(get_session)):
    # Trust tier is NOT client-trusted. The open form may only self-attest community (2) or
    # expert (1); tier 0 = canonical/guideline and is assignable ONLY by a curator during review.
    # Otherwise anyone could mint "guideline-grade" provenance and poison the trust ordering.
    tier = tier if tier in (1, 2) else 2
    c = Contribution(gap_id=gap_id,
                     title=title.strip()[:_MAXLEN["title"]],
                     body=body.strip()[:_MAXLEN["body"]],
                     citation=citation.strip()[:_MAXLEN["citation"]],
                     contributor=contributor.strip()[:_MAXLEN["contributor"]],
                     tier=tier)
    session.add(c)
    session.commit()
    return RedirectResponse("/portal/curate", status_code=303)


@router.get("/portal/curate", response_class=HTMLResponse)
def curate(request: Request, session: Session = Depends(get_session)):
    pending = session.exec(select(Contribution)
                           .where(Contribution.status == ContribStatus.pending)
                           .order_by(Contribution.id)).all()
    gaps = {g.id: g for g in session.exec(select(Gap)).all()}
    return templates.TemplateResponse(request, "curate.html",
                                      {"pending": pending, "gaps": gaps})


@router.post("/portal/curate/{cid}")
def curate_action(cid: int, action: str = Form(...), reviewer: str = Form("curator"),
                  note: str = Form(""), session: Session = Depends(get_session)):
    c = session.get(Contribution, cid)
    if not c or c.status != ContribStatus.pending:
        return RedirectResponse("/portal/curate", status_code=303)
    c.reviewed_at = now_iso()
    c.reviewer = reviewer.strip() or "curator"
    c.review_note = note.strip() or None
    if action == "approve":
        c.status = ContribStatus.approved
        c.staged_path = stage_contribution(c)         # <-- the flywheel closes here
        if c.gap_id:
            g = session.get(Gap, c.gap_id)
            if g:
                g.status = GapStatus.addressed
                session.add(g)
    else:
        c.status = ContribStatus.rejected
    session.add(c)
    session.commit()
    return RedirectResponse("/portal/contributions", status_code=303)


@router.get("/portal/contributions", response_class=HTMLResponse)
def contributions(request: Request, session: Session = Depends(get_session)):
    items = session.exec(select(Contribution).order_by(Contribution.id.desc())).all()
    gaps = {g.id: g for g in session.exec(select(Gap)).all()}
    return templates.TemplateResponse(request, "contributions.html",
                                      {"items": items, "gaps": gaps})
