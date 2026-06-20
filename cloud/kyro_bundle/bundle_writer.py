"""
Shared low-level bundle-writing helpers used by BOTH build_mock.py and build_bundle.py,
so the mock and the real compiler are guaranteed to emit byte-compatible bundles (same
schema, same vec insertion, same signing sequence). If signing or table layout ever
changes, it changes HERE once.
"""

from __future__ import annotations

import os
import sqlite3

import sqlite_vec

from . import signing


def open_bundle(path: str, fresh: bool = True) -> sqlite3.Connection:
    """Open (optionally recreating) a bundle file with sqlite-vec loaded."""
    if fresh and os.path.exists(path):
        os.remove(path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)
    return conn


def sqlite_vec_version(conn: sqlite3.Connection) -> str:
    return conn.execute("SELECT vec_version()").fetchone()[0]


def insert_vectors(conn, table: str, id_col: str, rows) -> None:
    """rows = iterable of (id, numpy_float32_vector)."""
    for _id, vec in rows:
        conn.execute(
            f"INSERT INTO {table}({id_col}, embedding) VALUES (?, ?)",
            (_id, sqlite_vec.serialize_float32(vec.tolist())),
        )


def load_or_make_keypair(keys_dir: str):
    """Dev signer: reuse the committed keypair if present, else generate + persist.

    Private key is written to keys/dev_signer.key (gitignored); public key to
    keys/dev_signer.pub (committed, the edge app pins it).
    """
    priv_path = os.path.join(keys_dir, "dev_signer.key")
    pub_path = os.path.join(keys_dir, "dev_signer.pub")
    os.makedirs(keys_dir, exist_ok=True)
    if os.path.exists(priv_path):
        with open(priv_path) as f:
            priv = signing.load_private_key(f.read().strip())
        pub_hex = priv.public_key().public_bytes_raw().hex()
    else:
        priv, pub_hex = signing.generate_keypair()
        with open(priv_path, "w") as f:
            f.write(signing.private_key_hex(priv))
        print(f"  generated dev signer key -> {priv_path} (gitignored)")
    with open(pub_path, "w") as f:
        f.write(pub_hex)
    return priv, pub_hex


def ingest_cgt_sql(conn, sql_path: str, valid_actions) -> dict:
    """Load the authored L1 spine from its SQL file (e.g. spine/edh-cgt.sql).

    The spine ships as `CREATE TABLE IF NOT EXISTS cgt_* ... ; INSERT ...` — schema-exact
    to doc 08 §1 — so it's idempotent against schema.create_all() and we just run it.
    It inserts its own cgt_meta row with a placeholder signature that finalize_and_sign()
    then overwrites with the real ed25519 signature (the intended compile-time handshake).
    """
    with open(sql_path, encoding="utf-8") as f:
        conn.executescript(f.read())
    bad = conn.execute(
        "SELECT id, action FROM cgt_nodes WHERE action IS NOT NULL AND action NOT IN "
        f"({','.join('?' * len(valid_actions))})", tuple(valid_actions)
    ).fetchall()
    if bad:
        raise ValueError(f"CGT spine has invalid leaf action(s): {bad}")
    if conn.execute("SELECT count(*) FROM cgt_meta").fetchone()[0] != 1:
        raise ValueError("CGT spine must define exactly one cgt_meta row")
    return {t: conn.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
            for t in ("cgt_nodes", "cgt_edges", "cgt_strings")}


def finalize_and_sign(conn, priv, pub_hex: str) -> None:
    """Sign the CGT spine first, then the whole-bundle manifest (which covers the CGT
    signature), then commit. Mirror of the verify order in verify.py."""
    cgt_sig = signing.sign(signing.cgt_digest(conn), priv)
    conn.execute("UPDATE cgt_meta SET signature=?", (cgt_sig,))
    man_sig = signing.sign(signing.manifest_digest(conn), priv)
    conn.execute("UPDATE manifest SET signature=?, signer_pubkey=?", (man_sig, pub_hex))
    conn.commit()
