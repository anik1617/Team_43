"""
ed25519 signing + verification for the bundle. This is part of the SEAM: Gowrish's E1
loader must reproduce the SAME canonical-digest rule defined here, or every bundle gets
rejected. The rule is intentionally simple and ACTUALLY language-portable (the previous
iterdump()-based rule was not — see "Why not iterdump" below).

================================ CANONICAL DIGEST RULE ================================
A digest is SHA-256 over a deterministic byte stream built from table ROWS — never from
any SQL text. Both Python (here) and JS (bundleLoader.ts) build the identical stream.

FIELD ENCODING  enc(value) = tag(1 byte) || len(payload) as 8-byte big-endian || payload
  NULL      tag 'N'  payload b""                          (distinct from empty text)
  INTEGER   tag 'I'  payload = decimal ASCII of the int   (e.g. -3 -> "-3")
  TEXT      tag 'S'  payload = UTF-8 bytes
  (REAL is never emitted directly — see the weight rule below. BLOBs are never signed.)

ROW ENCODING    enc_row(values) = concat(enc(v) for v in values, in the FIXED column
  order listed per table below). No SQL ORDER BY is trusted.

TABLE ENCODING  enc_table(name, rows):
    bodies = sorted( enc_row(r) for r in rows )      # BYTEWISE sort of the encoded rows
    out    = enc(name) || enc(len(rows))
    for body in bodies:  out ||= len(body) as 8-byte big-endian || body
  Bytewise sort of the encoded body is the ONLY ordering rule — identical in Python
  (sorted(list[bytes])) and JS (compare Uint8Arrays byte by byte). This sidesteps every
  SQL NULL-ordering / collation difference between the two SQLite bindings.

WEIGHT RULE     edges.weight is the only REAL in any signed table. It is encoded as an
  INTEGER of micro-units:  micro = floor(weight * 1_000_000 + 0.5)  (explicit half-up,
  same formula both sides — never a float string, so no format/rounding-mode drift).

DIGEST          digest(name, tables) =
    SHA-256( b"kyro-canon-v1|" || name || concat(enc_table(t.name, t.rows) for t in tables) )
  The name ("manifest" / "cgt") is domain separation so the two digests can never collide.

------------------------------- manifest digest (whole bundle) -------------------------------
Covers everything clinically load-bearing. EXCLUDES the embedding float blobs (chunk_vec /
node_vec values) — a tampered embedding cannot forge text, cannot change the deterministic
spine's leaf/decision, and cannot escalate a confidence badge (the badge comes from spine
structure + coverage, not retrieval rank); it can at most bias which TRUE, SIGNED chunk
surfaces in a 🟡 synthesis. We DO sign the vec ID LISTS (the "belt") so add/remove/reassign
tampering is still caught; only value-perturbation of an existing id is out of crypto scope.

Tables, in this fixed order, each with its fixed column list:
  manifest        (bundle_id, version, scope, embedder_id, embedder_dim, lang,
                   graphrag_version, sqlite_vec_version, created_at)   -- NOT signature/pubkey
  chunks          (id, kind, text, source_citation, source_doc_id, trust_tier)
  nodes           (id, name, type, description, trust_tier)
  edges           (src_id, dst_id, relation, weight, source_chunk_id)
  node_community  (node_id, community_id, level)
  cgt_nodes       (id, kind, field, required, action, source_citation, trust_tier)
  cgt_edges       (src_id, dst_id, condition)
  cgt_strings     (node_id, lang, prompt, recommendation)
  cgt_meta        (root_id, version, signature)   -- binds the spine signature into the bundle
  chunk_vec_ids   (chunk_id)                       -- belt: ids only, not the vectors
  node_vec_ids    (node_id)                        -- belt

------------------------------- cgt digest (spine, signed separately) -------------------------------
So the mentor can re-sign the clinical tree without re-signing the whole knowledge bundle.
Tables, fixed order:
  cgt_nodes   (id, kind, field, required, action, source_citation, trust_tier)
  cgt_edges   (src_id, dst_id, condition)
  cgt_strings (node_id, lang, prompt, recommendation)
  cgt_meta    (root_id, version)                   -- signature column EXCLUDED (it's what we sign)

Both digest functions are PURE READS — they never mutate the DB (the old rule UPDATE-blanked
the signature columns then relied on a rollback; we just omit those columns from the SELECT).

Why not iterdump: sqlite3.iterdump() emits Python-specific SQL text, and worse, dumps the
vec0 virtual tables as their internal shadow tables (megabytes of X'..' hex). Neither is
reproducible from RN/JS. This row-walk is.
"""

from __future__ import annotations

import hashlib
import sqlite3

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

_HEADER = b"kyro-canon-v1|"
_WEIGHT_SCALE = 1_000_000


# --- canonical field / row / table / digest encoders (mirror these exactly in JS) ---

def _enc(value) -> bytes:
    if value is None:
        tag, payload = b"N", b""
    elif isinstance(value, bool):  # guard: sqlite has no bool, but never sign one as 'I' silently
        raise TypeError("boolean is not a canonical field type")
    elif isinstance(value, int):
        tag, payload = b"I", str(value).encode("utf-8")
    elif isinstance(value, str):
        tag, payload = b"S", value.encode("utf-8")
    elif isinstance(value, float):
        raise TypeError("float must be pre-quantized to an int before encoding (see weight rule)")
    else:
        raise TypeError(f"un-signable field type {type(value).__name__}")
    return tag + len(payload).to_bytes(8, "big") + payload


def _enc_table(name: str, rows: list[tuple]) -> bytes:
    bodies = sorted(b"".join(_enc(v) for v in row) for row in rows)
    out = _enc(name) + _enc(len(rows))
    for body in bodies:
        out += len(body).to_bytes(8, "big") + body
    return out


def _weight_micro(w) -> int:
    """edges.weight REAL -> integer micro-units, half-up. NULL stays NULL."""
    if w is None:
        return None
    return int(w * _WEIGHT_SCALE + 0.5)  # floor of (x*1e6 + 0.5); w>=0 for retrieval weights


def _digest(name: str, tables: list[tuple[str, list[tuple]]]) -> bytes:
    stream = _HEADER + name.encode("utf-8")
    for tname, rows in tables:
        stream += _enc_table(tname, rows)
    return hashlib.sha256(stream).digest()


# --- the two bundle digests (pure reads) ---

def _rows(conn: sqlite3.Connection, sql: str) -> list[tuple]:
    return list(conn.execute(sql))


def manifest_digest(conn: sqlite3.Connection) -> bytes:
    """SHA-256 over the whole logical bundle (embeddings excluded; vec id-lists included)."""
    edges = [(s, d, r, _weight_micro(w), sc)
             for (s, d, r, w, sc) in _rows(conn, "SELECT src_id,dst_id,relation,weight,source_chunk_id FROM edges")]
    tables = [
        ("manifest", _rows(conn, "SELECT bundle_id,version,scope,embedder_id,embedder_dim,lang,"
                                 "graphrag_version,sqlite_vec_version,created_at FROM manifest")),
        ("chunks", _rows(conn, "SELECT id,kind,text,source_citation,source_doc_id,trust_tier FROM chunks")),
        ("nodes", _rows(conn, "SELECT id,name,type,description,trust_tier FROM nodes")),
        ("edges", edges),
        ("node_community", _rows(conn, "SELECT node_id,community_id,level FROM node_community")),
        ("cgt_nodes", _rows(conn, "SELECT id,kind,field,required,action,source_citation,trust_tier FROM cgt_nodes")),
        ("cgt_edges", _rows(conn, "SELECT src_id,dst_id,condition FROM cgt_edges")),
        ("cgt_strings", _rows(conn, "SELECT node_id,lang,prompt,recommendation FROM cgt_strings")),
        ("cgt_meta", _rows(conn, "SELECT root_id,version,signature FROM cgt_meta")),
        ("chunk_vec_ids", _rows(conn, "SELECT chunk_id FROM chunk_vec")),
        ("node_vec_ids", _rows(conn, "SELECT node_id FROM node_vec")),
    ]
    return _digest("manifest", tables)


def cgt_digest(conn: sqlite3.Connection) -> bytes:
    """SHA-256 over only the cgt_* spine, with cgt_meta.signature EXCLUDED (it's what we sign)."""
    tables = [
        ("cgt_nodes", _rows(conn, "SELECT id,kind,field,required,action,source_citation,trust_tier FROM cgt_nodes")),
        ("cgt_edges", _rows(conn, "SELECT src_id,dst_id,condition FROM cgt_edges")),
        ("cgt_strings", _rows(conn, "SELECT node_id,lang,prompt,recommendation FROM cgt_strings")),
        ("cgt_meta", _rows(conn, "SELECT root_id,version FROM cgt_meta")),
    ]
    return _digest("cgt", tables)


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
