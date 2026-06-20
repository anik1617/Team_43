"""
Reference verifier for a .kyro bundle. This is the Python SPEC for Gowrish's E1 loader:
his RN/JS verify path must reproduce these exact checks, or bundles get wrongly accepted
or rejected. Run it as a smoke test after building.

Run:  python -m kyro_bundle.verify cloud/bundles/edh-core-v0-mock.kyro [expected_pubkey_hex]

Checks, in order:
  1. signature — ed25519 over the canonical manifest digest (whole-bundle integrity).
  2. cgt signature — ed25519 over the cgt_* tables (spine integrity, signed separately).
  3. pinned-key check — if an expected pubkey is given, the embedded signer must match it.
     (The app PINS the trusted signer key; it never trusts the embedded pubkey blindly.)
  4. embedder-mismatch guard — demonstrates the app-side refusal: a bundle whose
     embedder_id/dim/sqlite_vec_version don't match the device's own is rejected.
"""

from __future__ import annotations

import sqlite3
import sys

import sqlite_vec

from . import signing


def _open(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)
    return conn


def read_manifest(conn) -> dict:
    cols = [d[0] for d in conn.execute("SELECT * FROM manifest").description]
    return dict(zip(cols, conn.execute("SELECT * FROM manifest").fetchone()))


def verify_bundle(path: str, expected_pubkey: str | None = None,
                  device_embedder_id: str | None = None,
                  device_embedder_dim: int | None = None,
                  device_sqlite_vec: str | None = None) -> bool:
    conn = _open(path)
    m = read_manifest(conn)
    sig, pub = m["signature"], m["signer_pubkey"]
    cgt_sig = conn.execute("SELECT signature FROM cgt_meta").fetchone()[0]

    ok = True

    # 1. manifest signature  (recompute digest with sig/pubkey blanked — no commit)
    man_ok = signing.verify(signing.manifest_digest(conn), sig, pub)
    print(f"  [{'PASS' if man_ok else 'FAIL'}] manifest ed25519 signature")
    ok &= man_ok

    # 2. cgt signature
    cgt_ok = signing.verify(signing.cgt_digest(conn), cgt_sig, pub)
    print(f"  [{'PASS' if cgt_ok else 'FAIL'}] CGT spine ed25519 signature")
    ok &= cgt_ok

    # 3. pinned-key check
    if expected_pubkey is not None:
        pin_ok = (pub == expected_pubkey)
        print(f"  [{'PASS' if pin_ok else 'FAIL'}] signer pubkey matches pinned key")
        ok &= pin_ok

    # 4. embedder/version compatibility (the #1 killer guard)
    if device_embedder_id is not None:
        e_ok = (m["embedder_id"] == device_embedder_id
                and m["embedder_dim"] == device_embedder_dim
                and (device_sqlite_vec is None or m["sqlite_vec_version"] == device_sqlite_vec))
        verdict = "PASS" if e_ok else "FAIL (app would REJECT)"
        print(f"  [{verdict}] embedder/version match "
              f"(bundle={m['embedder_id']}/{m['embedder_dim']}/vec{m['sqlite_vec_version']})")
        ok &= e_ok

    conn.rollback()  # discard the in-memory blanking from digest recomputation
    conn.close()
    return bool(ok)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    path = sys.argv[1]
    expected = sys.argv[2] if len(sys.argv) > 2 else None
    print(f"verifying {path}")
    ok = verify_bundle(path, expected_pubkey=expected)
    print("RESULT:", "VALID" if ok else "INVALID")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
