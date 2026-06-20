"""
Build edh-core-v0-mock.kyro — the hour-one mock bundle that unblocks the EDGE stream.

Run:  python -m kyro_bundle.build_mock
Output: cloud/bundles/edh-core-v0-mock.kyro  (+ a dev signing keypair under cloud/keys/)

This is the reference for the real compiler (build_bundle.py): same schema, same signing
rule, same manifest fields — only the CONTENT source changes (GraphRAG parquet instead of
the hand-written mock_content).
"""

from __future__ import annotations

import datetime
import os

from . import bundle_writer as bw
from . import mock_content as mc
from . import schema
from .embedders import HashEmbedder

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # cloud/
REPO = os.path.dirname(ROOT)                        # repo root
BUNDLE_PATH = os.path.join(ROOT, "bundles", "edh-core-v0-mock.kyro")
KEYS_DIR = os.path.join(ROOT, "keys")
SPINE_SQL = os.path.join(REPO, "spine", "edh-cgt.sql")  # Gowrish's authored L1 spine


def build():
    embedder = HashEmbedder()  # mock vectors; the real compiler uses BgeM3Embedder

    priv, pub_hex = bw.load_or_make_keypair(KEYS_DIR)
    conn = bw.open_bundle(BUNDLE_PATH)
    schema.create_all(conn)

    sqlite_vec_ver = bw.sqlite_vec_version(conn)
    created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    conn.execute(
        "INSERT INTO manifest VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        ("edh-core-v0-mock", 0, "edh-core",
         embedder.id, embedder.dim, "en",
         "mock-0", sqlite_vec_ver, created_at, "", ""),
    )

    # --- L2 chunks + vectors ---
    for cid, kind, text, cite, doc, tier in mc.CHUNKS:
        conn.execute("INSERT INTO chunks VALUES (?,?,?,?,?,?)", (cid, kind, text, cite, doc, tier))
    bw.insert_vectors(conn, "chunk_vec", "chunk_id",
                      [(c[0], embedder.embed(c[2])) for c in mc.CHUNKS])

    # --- L2 nodes + vectors (embed the description) ---
    for nid, name, ntype, desc, tier in mc.NODES:
        conn.execute("INSERT INTO nodes VALUES (?,?,?,?,?)", (nid, name, ntype, desc, tier))
    bw.insert_vectors(conn, "node_vec", "node_id",
                      [(n[0], embedder.embed(n[3])) for n in mc.NODES])

    # --- L2 edges + community membership ---
    conn.executemany("INSERT INTO edges VALUES (?,?,?,?,?)", mc.EDGES)
    conn.executemany("INSERT INTO node_community VALUES (?,?,?)", mc.NODE_COMMUNITY)

    # --- L1: ingest the REAL authored spine (spine/edh-cgt.sql), not a placeholder ---
    cgt = bw.ingest_cgt_sql(conn, SPINE_SQL, schema.CGT_ACTIONS)

    bw.finalize_and_sign(conn, priv, pub_hex)
    conn.close()

    size = os.path.getsize(BUNDLE_PATH)
    print(f"[built] {BUNDLE_PATH} ({size} bytes)")
    print(f"   embedder={embedder.id} dim={embedder.dim} sqlite_vec={sqlite_vec_ver}")
    print(f"   signer_pubkey={pub_hex}")
    print(f"   L2 mock: chunks={len(mc.CHUNKS)} nodes={len(mc.NODES)} edges={len(mc.EDGES)}")
    print(f"   L1 spine (real): cgt_nodes={cgt['cgt_nodes']} cgt_edges={cgt['cgt_edges']} "
          f"cgt_strings={cgt['cgt_strings']}")


if __name__ == "__main__":
    build()
