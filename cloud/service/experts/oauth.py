"""Google OAuth (OIDC) via Authlib — env-gated exactly like the Twilio relay: it registers ONLY
when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are present, so email/password works with zero setup
and the Google button simply doesn't appear until the creds are configured.

We use Authlib (not a hand-rolled flow) on purpose: it handles OIDC discovery, the state/nonce
anti-CSRF dance, the code→token exchange, and ID-token signature verification — all security-
critical steps that are easy to get subtly wrong by hand."""
from __future__ import annotations

import os

from authlib.integrations.starlette_client import OAuth

_oauth = OAuth()
_registered = False

_GOOGLE_METADATA = "https://accounts.google.com/.well-known/openid-configuration"


def google_enabled() -> bool:
    return bool(os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"))


def get_google():
    """Return the registered Google OAuth client, or None if creds aren't configured."""
    global _registered
    if not google_enabled():
        return None
    if not _registered:
        _oauth.register(
            name="google",
            client_id=os.environ["GOOGLE_CLIENT_ID"],
            client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
            server_metadata_url=_GOOGLE_METADATA,
            client_kwargs={"scope": "openid email profile"},
        )
        _registered = True
    return _oauth.google
