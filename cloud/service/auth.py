"""Password hashing + session helpers for surgeon accounts.

Passwords are hashed with stdlib **scrypt** (a memory-hard KDF) — strong, and NO new dependency
(keeps the deploy image small). Format: ``scrypt$N$r$p$<salt_b64>$<dk_b64>``, self-describing so
the work factor can change without breaking old hashes. Never store or log the plaintext.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os

# scrypt work factors. N=2^14 (~16 MB) is a sane interactive default; bump as hardware improves.
_N = 2 ** 14
_R = 8
_P = 1
_DKLEN = 32
_SALT_BYTES = 16
_MAXMEM = 64 * 1024 * 1024   # explicit ceiling so hashlib never rejects our N/r/p


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int, dklen: int) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=n, r=r, p=p,
                          dklen=dklen, maxmem=_MAXMEM)


def hash_password(password: str) -> str:
    """Return a self-describing scrypt hash string for ``password``."""
    if not password:
        raise ValueError("password must not be empty")
    salt = os.urandom(_SALT_BYTES)
    dk = _scrypt(password, salt, _N, _R, _P, _DKLEN)
    return "scrypt${}${}${}${}${}".format(
        _N, _R, _P, base64.b64encode(salt).decode(), base64.b64encode(dk).decode())


def verify_password(password: str, stored: str) -> bool:
    """Constant-time verify ``password`` against a stored scrypt hash. Never raises — any
    malformed/legacy hash (e.g. an OAuth-only account with no password) returns False."""
    if not password or not stored:
        return False
    try:
        scheme, n, r, p, salt_b64, dk_b64 = stored.split("$")
        if scheme != "scrypt":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(dk_b64)
        dk = _scrypt(password, salt, int(n), int(r), int(p), len(expected))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False
