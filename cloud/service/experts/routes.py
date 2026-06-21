"""Surgeon accounts — register / login / profile, email-password AND Google OAuth.

A surgeon becomes *contactable* only after opting in WITH a phone (the matcher enforces both);
opting in records the consent version + timestamp, and the profile lets them revoke it any time.
Phone numbers are PII and live ONLY here in the cloud — never synced to a device.
"""
from __future__ import annotations

import os
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select

from ..auth import hash_password, verify_password
from ..db import get_session
from ..models import APK_URL, CONSENT_TEXT, CONSENT_VERSION, Expert, now_iso
from .oauth import get_google, google_enabled

_HERE = os.path.dirname(os.path.abspath(__file__))
# reuse the portal's templates dir so expert pages extend the same base.html / design system
templates = Jinja2Templates(directory=os.path.join(_HERE, "..", "portal", "templates"))
templates.env.globals["APK_URL"] = APK_URL      # shared base.html download button
router = APIRouter(tags=["experts"])

SPECIALTIES = ["Neurosurgery", "Neurology", "General surgery", "Emergency medicine",
               "Anaesthesiology", "Other"]


def _flash(path: str, msg: str) -> str:
    return f"{path}?{urlencode({'msg': msg})}"


def current_expert(request: Request, session: Session) -> Expert | None:
    eid = request.session.get("expert_id")
    return session.get(Expert, eid) if eid else None


def _ctx(request: Request, **extra) -> dict:
    base = {"request": request, "specialties": SPECIALTIES,
            "google_enabled": google_enabled(), "consent_text": CONSENT_TEXT}
    base.update(extra)
    return base


# ---- registration -------------------------------------------------------------------------

@router.get("/experts/register", response_class=HTMLResponse)
def register_get(request: Request):
    return templates.TemplateResponse(request, "experts_register.html", _ctx(request, form={}))


@router.post("/experts/register")
def register_post(request: Request, email: str = Form(...), password: str = Form(...),
                  name: str = Form(""), specialty: str = Form(""), role: str = Form(""),
                  institution: str = Form(""), region: str = Form(""), phone: str = Form(""),
                  opt_in: str | None = Form(None), session: Session = Depends(get_session)):
    email = email.strip().lower()
    form = {"email": email, "name": name, "specialty": specialty, "role": role,
            "institution": institution, "region": region, "phone": phone, "opt_in": opt_in}
    opted = opt_in is not None
    errors = []
    if "@" not in email or "." not in email.split("@")[-1]:
        errors.append("Enter a valid email address.")
    if len(password) < 8:
        errors.append("Password must be at least 8 characters.")
    if opted and not phone.strip():
        errors.append("A phone number is required to opt in to emergency contact.")
    if not errors and session.exec(select(Expert).where(Expert.email == email)).first():
        errors.append("An account with that email already exists. Try signing in.")
    if errors:
        return templates.TemplateResponse(
            request, "experts_register.html", _ctx(request, form=form, error=" ".join(errors)))

    e = Expert(
        email=email, password_hash=hash_password(password), name=name.strip(),
        specialty=specialty.strip(), role=role.strip(), institution=institution.strip(),
        region=region.strip(), phone_e164=phone.strip(), contact_opt_in=opted,
        consent_version=CONSENT_VERSION if opted else None,
        consent_at=now_iso() if opted else None)
    session.add(e)
    session.commit()
    session.refresh(e)
    request.session["expert_id"] = e.id
    return RedirectResponse(
        _flash("/experts/profile", "Account created ✓. Review your contact settings below."), 303)


# ---- login / logout -----------------------------------------------------------------------

@router.get("/experts/login", response_class=HTMLResponse)
def login_get(request: Request):
    return templates.TemplateResponse(request, "experts_login.html", _ctx(request, form={}))


@router.post("/experts/login")
def login_post(request: Request, email: str = Form(...), password: str = Form(...),
               session: Session = Depends(get_session)):
    email = email.strip().lower()
    e = session.exec(select(Expert).where(Expert.email == email)).first()
    if not e or not verify_password(password, e.password_hash):
        return templates.TemplateResponse(
            request, "experts_login.html",
            _ctx(request, form={"email": email}, error="Invalid email or password."))
    request.session["expert_id"] = e.id
    return RedirectResponse(_flash("/experts/profile", "Signed in ✓"), 303)


@router.get("/experts/logout")
def logout(request: Request):
    request.session.pop("expert_id", None)
    return RedirectResponse(_flash("/experts/login", "Signed out."), 303)


# ---- profile (edit + consent revoke) ------------------------------------------------------

@router.get("/experts/profile", response_class=HTMLResponse)
def profile_get(request: Request, session: Session = Depends(get_session)):
    e = current_expert(request, session)
    if not e:
        return RedirectResponse("/experts/login", 303)
    return templates.TemplateResponse(request, "experts_profile.html", _ctx(request, expert=e))


@router.post("/experts/profile")
def profile_post(request: Request, name: str = Form(""), specialty: str = Form(""),
                 role: str = Form(""), institution: str = Form(""), region: str = Form(""),
                 phone: str = Form(""), on_call: str | None = Form(None),
                 opt_in: str | None = Form(None), session: Session = Depends(get_session)):
    e = current_expert(request, session)
    if not e:
        return RedirectResponse("/experts/login", 303)
    opted = opt_in is not None
    if opted and not phone.strip():
        return templates.TemplateResponse(
            request, "experts_profile.html",
            _ctx(request, expert=e, error="A phone number is required to stay opted in."))

    e.name, e.specialty, e.role = name.strip(), specialty.strip(), role.strip()
    e.institution, e.region, e.phone_e164 = institution.strip(), region.strip(), phone.strip()
    e.on_call = on_call is not None
    # record fresh consent on opt-IN, OR when the consent wording (CONSENT_VERSION) has been bumped
    # since they last agreed — otherwise a stale-version opt-in would keep them matched under terms
    # they never accepted.
    if opted and (not e.contact_opt_in or e.consent_version != CONSENT_VERSION):
        e.consent_version, e.consent_at = CONSENT_VERSION, now_iso()
    e.contact_opt_in = opted                            # opting out keeps the record but stops matching
    session.add(e)
    session.commit()
    msg = "Profile saved ✓" + ("" if opted else ". You are opted out and won't be contacted.")
    return RedirectResponse(_flash("/experts/profile", msg), 303)


# ---- Google OAuth (async; registered only when creds are present) -------------------------

@router.get("/auth/google")
async def auth_google(request: Request):
    google = get_google()
    if not google:
        return RedirectResponse(
            _flash("/experts/login", "Google sign-in isn't configured yet. Use email and password."), 303)
    # Pin the callback from KYRO_OAUTH_REDIRECT when set — it MUST byte-match a Google "Authorized
    # redirect URI". Deriving from request.url_for is fragile behind a TLS proxy (builds http:// if
    # --proxy-headers isn't active → redirect_uri_mismatch). Authlib reuses this same value for the
    # token exchange in the callback, so pinning here is sufficient.
    redirect_uri = os.environ.get("KYRO_OAUTH_REDIRECT") or str(request.url_for("auth_google_callback"))
    return await google.authorize_redirect(request, redirect_uri)


@router.get("/auth/google/callback", name="auth_google_callback")
async def auth_google_callback(request: Request, session: Session = Depends(get_session)):
    google = get_google()
    if not google:
        return RedirectResponse("/experts/login", 303)
    try:
        token = await google.authorize_access_token(request)
    except Exception:
        return RedirectResponse(
            _flash("/experts/login", "Google sign-in failed or was cancelled."), 303)
    info = token.get("userinfo") or {}
    sub, email = info.get("sub"), (info.get("email") or "").strip().lower()
    if not sub or not email:
        return RedirectResponse(_flash("/experts/login", "Google returned no email."), 303)
    if not info.get("email_verified"):                  # only ever trust a Google-VERIFIED address
        return RedirectResponse(_flash("/experts/login", "Your Google email isn't verified."), 303)

    e = session.exec(select(Expert).where(Expert.oauth_sub == sub)).first()
    if not e:
        existing = session.exec(select(Expert).where(Expert.email == email)).first()
        if existing and existing.password_hash:
            # A password account already owns this email — do NOT silently link Google to it
            # (pre-registration account-takeover). Make them prove the password first.
            return RedirectResponse(_flash("/experts/login",
                "An account with this email already exists. Sign in with your password."), 303)
        if existing:                                    # OAuth-only row (no password) → safe to attach
            existing.oauth_provider, existing.oauth_sub = "google", sub
            e = existing
        else:
            e = Expert(email=email, oauth_provider="google", oauth_sub=sub, name=info.get("name", ""))
            session.add(e)
    session.commit()
    session.refresh(e)
    request.session["expert_id"] = e.id
    return RedirectResponse(
        _flash("/experts/profile",
               "Signed in with Google ✓. Add your specialty, phone, and opt-in to be reachable."), 303)
