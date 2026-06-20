"""
ed25519 signing + verification for the bundle. This is part of the SEAM: Gowrish's E1
loader must verify with the SAME canonical-digest rule defined here, or every bundle
gets rejected. The rule is intentionally simple and language-portable.

CANONICAL DIGEST RULE (what gets signed):
  1. Build the full SQLite DB with manifest.signature = '' and manifest.signer_pubkey = ''.
  2. Take sqlite3 `iterdump()` — the full schema+data as deterministic SQL text — and
     DROP the two lines that set manifest.signature / signer_pubkey (they don't exist yet).
  3. digest = SHA-256(utf-8 of that dump text).
  4. signature = ed25519_sign(private_key, digest); also record signer_pubkey (hex).
  5. UPDATE manifest SET signature=<hex>, signer_pubkey=<hex>.

Verification reverses it: re-dump, blank the signature/pubkey columns, re-hash, ed25519-verify.
Because iterdump() is ordered and deterministic, the digest is reproducible cross-platform.

The CGT spine is signed SEPARATELY (cgt_meta.signature) over the cgt_* tables only, so the
clinical tree can be re-signed by the mentor without re-signing the whole knowledge bundle.
"""

from __future__ import annotations

import hashlib
import sqlite3

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)


# Lines matching these prefixes are excluded from the digest (they hold the signature itself).
def _canonical_dump(conn: sqlite3.Connection, table_filter: set[str] | None = None) -> bytes:
    """Deterministic SQL dump, with the signature-bearing UPDATEs neutralized."""
    lines = []
    for line in conn.iterdump():
        if table_filter is not None:
            # crude table scoping: keep only statements naming an allowed table
            if not any(t in line for t in table_filter):
                continue
        lines.append(line)
    text = "\n".join(lines)
    return text.encode("utf-8")


def manifest_digest(conn: sqlite3.Connection) -> bytes:
    """
    SHA-256 over the whole-bundle dump with manifest.signature/signer_pubkey blanked.
    Call this AFTER all content is inserted but with manifest signature columns = ''.
    """
    conn.execute("UPDATE manifest SET signature='', signer_pubkey=''")
    return hashlib.sha256(_canonical_dump(conn)).digest()


def cgt_digest(conn: sqlite3.Connection) -> bytes:
    """SHA-256 over only the cgt_* tables, with cgt_meta.signature blanked."""
    conn.execute("UPDATE cgt_meta SET signature=''")
    scope = {"cgt_nodes", "cgt_edges", "cgt_strings", "cgt_meta"}
    return hashlib.sha256(_canonical_dump(conn, table_filter=scope)).digest()


def sign(digest: bytes, private_key: Ed25519PrivateKey) -> str:
    return private_key.sign(digest).hex()


def verify(digest: bytes, signature_hex: str, pubkey_hex: str) -> bool:
    try:
        pub = Ed25519PublicKey.from_public_bytes(bytes.fromhex(pubkey_hex))
        pub.verify(bytes.fromhex(signature_hex), digest)
        return True
    except Exception:
        return False


# --- dev keypair helpers (mock only; real signer key lives in a secret store later) ---

def generate_keypair() -> tuple[Ed25519PrivateKey, str]:
    priv = Ed25519PrivateKey.generate()
    pub_hex = priv.public_key().public_bytes_raw().hex()
    return priv, pub_hex


def load_private_key(raw_hex: str) -> Ed25519PrivateKey:
    return Ed25519PrivateKey.from_private_bytes(bytes.fromhex(raw_hex))


def private_key_hex(priv: Ed25519PrivateKey) -> str:
    return priv.private_bytes_raw().hex()
