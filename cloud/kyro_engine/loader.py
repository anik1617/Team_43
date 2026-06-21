# cloud/kyro_engine/loader.py
"""Load the cgt_* spine from a signed .kyro bundle and (by default) verify its ed25519
signatures before trusting it. Reuses kyro_bundle.signing for the canonical digests so the
verify path here matches the build/sign path byte-for-byte (the seam). PURE READ — never
mutates or recreates the bundle file (so it must NOT use bundle_writer.open_bundle, whose
default deletes the file)."""
from __future__ import annotations

import os
import sqlite3
from dataclasses import dataclass, field

import sqlite_vec

from kyro_bundle import signing


class BundleError(Exception):
    """Raised when a bundle is missing, unreadable, or fails signature verification."""


@dataclass
class Spine:
    nodes: dict                                   # id -> {kind, field, action, source_citation, trust_tier}
    edges: list                                   # [{src, dst, cond}]
    root: str
    strings: dict = field(default_factory=dict)   # node_id -> {lang: (prompt, recommendation)}; only nodes with rows


def _open(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)
    return conn


def load_spine(path: str, verify: bool = True) -> Spine:
    if not os.path.exists(path):
        raise BundleError(f"bundle not found: {path}")
    try:
        conn = _open(path)
    except sqlite3.Error as e:
        raise BundleError(f"cannot open bundle {path}: {e}") from e
    try:
        if verify:
            row = conn.execute("SELECT signature, signer_pubkey FROM manifest").fetchone()
            if row is None:
                raise BundleError("bundle has no manifest row")
            man_sig, pub = row
            if not signing.verify(signing.manifest_digest(conn), man_sig, pub):
                raise BundleError("manifest signature verification failed")
            cgt_row = conn.execute("SELECT signature FROM cgt_meta").fetchone()
            cgt_sig = cgt_row[0] if cgt_row else None
            if not signing.verify(signing.cgt_digest(conn), cgt_sig, pub):
                raise BundleError("CGT spine signature verification failed")
        nodes = {r[0]: {'kind': r[1], 'field': r[2], 'action': r[3],
                        'source_citation': r[4], 'trust_tier': r[5]}
                 for r in conn.execute(
                     "SELECT id,kind,field,action,source_citation,trust_tier FROM cgt_nodes")}
        edges = [{'src': r[0], 'dst': r[1], 'cond': r[2]}
                 for r in conn.execute("SELECT src_id,dst_id,condition FROM cgt_edges")]
        root_row = conn.execute("SELECT root_id FROM cgt_meta").fetchone()
        if root_row is None:
            raise BundleError("bundle has no cgt_meta root")
        root = root_row[0]
        strings: dict = {}
        for nid, lang, prompt, rec in conn.execute(
                "SELECT node_id,lang,prompt,recommendation FROM cgt_strings"):
            strings.setdefault(nid, {})[lang] = (prompt, rec)
    except sqlite3.Error as e:
        raise BundleError(f"malformed bundle {path}: {e}") from e
    finally:
        conn.close()
    return Spine(nodes=nodes, edges=edges, root=root, strings=strings)
