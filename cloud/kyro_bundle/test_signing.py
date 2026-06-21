"""
Seam regression + tamper test for the canonical digest rule (signing.py).

Run:  python -m kyro_bundle.test_signing
Pre:  a built mock bundle at cloud/bundles/edh-core-v0-mock.kyro (python -m kyro_bundle.build_mock)

This pins the EXACT manifest/cgt digest hexes for the mock bundle (the targets Gowrish's
bundleLoader.ts must reproduce to prove byte-parity across the seam), and demonstrates the
tamper boundary we deliberately drew:

  A. mutate signed clinical text (a chunk)        -> manifest signature MUST fail   (text is signed)
  B. swap an embedding VALUE, keep its id         -> manifest signature still PASSES (blobs excluded — the
                                                     bounded, by-design residual risk)
  C. remove an embedding id (drop a chunk_vec row) -> manifest signature MUST fail   (the id-list belt)

So: tampering can't forge clinical text or change the id set without detection; it can at most
perturb an embedding value, which only biases which TRUE, SIGNED chunk surfaces in a 🟡 synthesis.
"""

from __future__ import annotations

import os
import shutil
import tempfile

from . import bundle_writer as bw
from . import signing
from .embedders import HashEmbedder

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MOCK = os.path.join(ROOT, "bundles", "edh-core-v0-mock.kyro")


def _open_copy(src: str):
    """Open a throwaway copy so tamper tests never corrupt the real bundle."""
    tmp = os.path.join(tempfile.mkdtemp(prefix="kyro_tamper_"), "b.kyro")
    shutil.copyfile(src, tmp)
    return bw.open_bundle(tmp, fresh=False), tmp


def _sigs(conn):
    sig, pub = conn.execute("SELECT signature, signer_pubkey FROM manifest").fetchone()
    cgt_sig = conn.execute("SELECT signature FROM cgt_meta").fetchone()[0]
    return sig, pub, cgt_sig


def main():
    if not os.path.exists(MOCK):
        raise SystemExit("build the mock first: python -m kyro_bundle.build_mock")

    # --- golden vectors: the exact digests E1 must reproduce ---
    conn, _ = _open_copy(MOCK)
    sig, pub, cgt_sig = _sigs(conn)
    man_hex = signing.manifest_digest(conn).hex()
    cgt_hex = signing.cgt_digest(conn).hex()
    print("GOLDEN (mock bundle) — bundleLoader.ts must match these:")
    print(f"  manifest digest = {man_hex}")
    print(f"  cgt digest      = {cgt_hex}")
    assert signing.verify(bytes.fromhex(man_hex), sig, pub), "baseline manifest sig should verify"
    assert signing.verify(bytes.fromhex(cgt_hex), cgt_sig, pub), "baseline cgt sig should verify"
    print("  [PASS] baseline manifest + cgt signatures verify\n")
    conn.close()

    # --- A. tamper signed clinical text -> MUST fail ---
    conn, _ = _open_copy(MOCK)
    sig, pub, _ = _sigs(conn)
    cid = conn.execute("SELECT id FROM chunks LIMIT 1").fetchone()[0]
    conn.execute("UPDATE chunks SET text = text || ' [TAMPERED]' WHERE id = ?", (cid,))
    a_ok = signing.verify(signing.manifest_digest(conn), sig, pub)
    print(f"  [{'PASS' if not a_ok else 'FAIL'}] A: mutated chunk text -> signature rejects (got verify={a_ok})")
    assert not a_ok, "tampered clinical text MUST break the manifest signature"
    conn.close()

    # --- B. swap an embedding value but keep the id -> still PASSES (bounded residual risk) ---
    conn, _ = _open_copy(MOCK)
    sig, pub, _ = _sigs(conn)
    vid = conn.execute("SELECT chunk_id FROM chunk_vec LIMIT 1").fetchone()[0]
    new_vec = HashEmbedder().embed("a deliberately different vector for the same id")
    conn.execute("DELETE FROM chunk_vec WHERE chunk_id = ?", (vid,))
    bw.insert_vectors(conn, "chunk_vec", "chunk_id", [(vid, new_vec)])
    b_ok = signing.verify(signing.manifest_digest(conn), sig, pub)
    print(f"  [{'PASS' if b_ok else 'FAIL'}] B: swapped embedding value, same id -> signature still valid "
          f"(got verify={b_ok}) — by design, blobs excluded")
    assert b_ok, "embedding-value-only change is intentionally outside the signature"
    conn.close()

    # --- C. drop an embedding id -> MUST fail (the id-list belt) ---
    conn, _ = _open_copy(MOCK)
    sig, pub, _ = _sigs(conn)
    vid = conn.execute("SELECT chunk_id FROM chunk_vec LIMIT 1").fetchone()[0]
    conn.execute("DELETE FROM chunk_vec WHERE chunk_id = ?", (vid,))
    c_ok = signing.verify(signing.manifest_digest(conn), sig, pub)
    print(f"  [{'PASS' if not c_ok else 'FAIL'}] C: removed an embedding id -> signature rejects (got verify={c_ok})")
    assert not c_ok, "removing a vec id MUST break the manifest signature (belt)"
    conn.close()

    print("\nALL TAMPER ASSERTIONS HELD — canonical digest behaves as specified.")


if __name__ == "__main__":
    main()
