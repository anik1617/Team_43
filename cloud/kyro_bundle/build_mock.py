"""
Build edh-core-v0-mock.kyro — the hour-one mock bundle that unblocks the EDGE stream.

Run:  python -m kyro_bundle.build_mock
Output: cloud/bundles/edh-core-v0-mock.kyro  (+ a dev signing keypair under cloud/keys/)

This is the reference for the real compiler (C5): same schema, same signing rule, same
manifest fields — only the CONTENT source changes (GraphRAG parquet instead of mock_content).
"""

from __future__ import annotations

import datetime
import os
import sqlite3

import sqlite_vec

from . import mock_content as mc
from . import schema, signing
from .embedders import HashEmbedder

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BUNDLE_PATH = os.path.join(ROOT, "bundles", "edh-core-v0-mock.kyro")
KEYS_DIR = os.path.join(ROOT, "keys")
PRIV_PATH = os.path.join(KEYS_DIR, "dev_signer.key")  # gitignored
PUB_PATH = os.path.join(KEYS_DIR, "dev_signer.pub")   # committed so Gowrish can pin it


def _open(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)
    return conn


def _load_or_make_keypair():
    os.makedirs(KEYS_DIR, exist_ok=True)
    if os.path.exists(PRIV_PATH):
        with open(PRIV_PATH) as f:
            priv = signing.load_private_key(f.read().strip())
        pub_hex = priv.public_key().public_bytes_raw().hex()
    else:
        priv, pub_hex = signing.generate_keypair()
        with open(PRIV_PATH, "w") as f:
            f.write(signing.private_key_hex(priv))
        print(f"  generated dev signer key -> {PRIV_PATH} (gitignored)")
    with open(PUB_PATH, "w") as f:
        f.write(pub_hex)
    return priv, pub_hex


def _insert_vec(conn, table: str, id_col: str, rows: list[tuple[str, object]]):
    for _id, vec in rows:
        conn.execute(
            f"INSERT INTO {table}({id_col}, embedding) VALUES (?, ?)",
            (_id, sqlite_vec.serialize_float32(vec.tolist())),
        )


def build():
    embedder = HashEmbedder()  # ⚠ swap to BgeM3Embedder() at step ③ — one line

    if os.path.exists(BUNDLE_PATH):
        os.remove(BUNDLE_PATH)
    os.makedirs(os.path.dirname(BUNDLE_PATH), exist_ok=True)

    priv, pub_hex = _load_or_make_keypair()
    conn = _open(BUNDLE_PATH)
    schema.create_all(conn)

    sqlite_vec_ver = conn.execute("SELECT vec_version()").fetchone()[0]
    created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # --- manifest (signature/pubkey filled in after signing) ---
    conn.execute(
        "INSERT INTO manifest VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        ("edh-core-v0-mock", 0, "edh-core",
         embedder.id, embedder.dim, "en",
         "mock-0", sqlite_vec_ver, created_at, "", ""),
    )

    # --- L2 chunks + vectors ---
    for cid, kind, text, cite, doc, tier in mc.CHUNKS:
        conn.execute("INSERT INTO chunks VALUES (?,?,?,?,?,?)", (cid, kind, text, cite, doc, tier))
    _insert_vec(conn, "chunk_vec", "chunk_id",
                [(c[0], embedder.embed(c[2])) for c in mc.CHUNKS])

    # --- L2 nodes + vectors (embed the description) ---
    for nid, name, ntype, desc, tier in mc.NODES:
        conn.execute("INSERT INTO nodes VALUES (?,?,?,?,?)", (nid, name, ntype, desc, tier))
    _insert_vec(conn, "node_vec", "node_id",
                [(n[0], embedder.embed(n[3])) for n in mc.NODES])

    # --- L2 edges + community membership ---
    conn.executemany("INSERT INTO edges VALUES (?,?,?,?,?)", mc.EDGES)
    conn.executemany("INSERT INTO node_community VALUES (?,?,?)", mc.NODE_COMMUNITY)

    # --- L1 CGT spine (validate the leaf-action vocabulary before it ships) ---
    for row in mc.CGT_NODES:
        action = row[4]
        if action is not None and action not in schema.CGT_ACTIONS:
            raise ValueError(f"CGT node {row[0]} has invalid action {action!r}")
        conn.execute("INSERT INTO cgt_nodes VALUES (?,?,?,?,?,?,?)", row)
    conn.executemany("INSERT INTO cgt_edges VALUES (?,?,?)", mc.CGT_EDGES)
    conn.executemany("INSERT INTO cgt_strings VALUES (?,?,?,?)", mc.CGT_STRINGS)
    conn.execute("INSERT INTO cgt_meta VALUES (?,?,?)", (mc.CGT_ROOT, mc.CGT_VERSION, ""))

    # --- sign: CGT first (so the manifest signature covers the final CGT signature) ---
    cgt_sig = signing.sign(signing.cgt_digest(conn), priv)
    conn.execute("UPDATE cgt_meta SET signature=?", (cgt_sig,))

    man_sig = signing.sign(signing.manifest_digest(conn), priv)
    conn.execute("UPDATE manifest SET signature=?, signer_pubkey=?", (man_sig, pub_hex))

    conn.commit()
    conn.close()

    size = os.path.getsize(BUNDLE_PATH)
    print(f"[built] {BUNDLE_PATH} ({size} bytes)")
    print(f"   embedder={embedder.id} dim={embedder.dim} sqlite_vec={sqlite_vec_ver}")
    print(f"   signer_pubkey={pub_hex}")
    print(f"   chunks={len(mc.CHUNKS)} nodes={len(mc.NODES)} edges={len(mc.EDGES)} "
          f"cgt_nodes={len(mc.CGT_NODES)}")


if __name__ == "__main__":
    build()
