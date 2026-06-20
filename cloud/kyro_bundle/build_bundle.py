"""
C5 — the REAL bundle compiler. GraphRAG output (graph only) → BGE-M3 embed → sign →
edh-core-v{N}.kyro.

Approach A (decoupled embeddings): GraphRAG does entity/relationship/community EXTRACTION
with a cloud LLM; we re-embed the text ourselves with BGE-M3 so the shipped vectors share
ONE code path with the on-device embedder. GraphRAG never touches the trust path. See doc 08 §C3.

Run (real):     python -m kyro_bundle.build_bundle --root cloud/graphrag --version 1
Run (selftest): python -m kyro_bundle.build_bundle --selftest    # fabricates parquet, uses HashEmbedder

The mapping GraphRAG -> our schema (the seam, doc 08 §1):
  text_units        -> chunks(kind='text_unit')        citation+tier via sources.resolve_source
  community_reports -> chunks(kind='community_report') tier=1 (LM-generated)
  entities          -> nodes                           tier = most-authoritative supporting source
  relationships     -> edges
  communities       -> node_community
  CGT spine         -> cgt_* (executescript'd from the authored spine SQL, default spine/edh-cgt.sql)
"""

from __future__ import annotations

import argparse
import datetime
import os

from . import bundle_writer as bw
from . import graphrag_io, schema
from .embedders import BgeM3Embedder, Embedder, HashEmbedder
from .sources import resolve_source

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                        # cloud/
REPO = os.path.dirname(ROOT)                         # repo root
KEYS_DIR = os.path.join(ROOT, "keys")
DEFAULT_SPINE_SQL = os.path.join(REPO, "spine", "edh-cgt.sql")  # Gowrish's authored L1 spine


def _stem(title) -> str | None:
    if not title:
        return None
    return os.path.splitext(os.path.basename(str(title)))[0]


def _as_list(val) -> list:
    """Coerce a parquet cell (numpy array / list / scalar / NaN / None) to a plain list.
    Avoids numpy's ambiguous truth value on `array or []`."""
    if val is None:
        return []
    if isinstance(val, str):
        return [val]
    if hasattr(val, "__len__"):
        return list(val)
    try:
        import math
        if isinstance(val, float) and math.isnan(val):
            return []
    except Exception:
        pass
    return [val]


def _first(val):
    """First element of a list-like cell (document_ids / text_unit_ids), else None."""
    lst = _as_list(val)
    return lst[0] if lst else None


def normalize(t: graphrag_io.GraphRAGTables):
    """GraphRAG DataFrames -> the row tuples the schema expects. Pure data, no I/O."""
    c = t.cols
    doc_title = dict(zip(t.documents[c["doc_id"]], t.documents[c["doc_title"]])) \
        if c["doc_title"] else {}

    # --- chunks: text_units + community_reports ---
    chunks = []
    tu_tier = {}  # text_unit_id -> trust_tier, for entity-tier derivation
    for _, r in t.text_units.iterrows():
        doc_id = _first(r[c["tu_docs"]]) if c["tu_docs"] else None
        citation, tier = resolve_source(_stem(doc_title.get(doc_id, doc_id)))
        cid = str(r[c["tu_id"]])
        chunks.append((cid, "text_unit", str(r[c["tu_text"]]), citation, str(doc_id), tier))
        tu_tier[cid] = tier
    for _, r in t.community_reports.iterrows():
        lvl = r[c["cr_level"]] if c["cr_level"] else 0
        chunks.append((f"cr_{r[c['cr_community']]}", "community_report",
                       str(r[c["cr_text"]]), f"Community summary (level {lvl})",
                       "graphrag", 1))

    # --- nodes: entities; tier = min (most authoritative) over supporting text_units ---
    title_to_id, nodes = {}, []
    for _, r in t.entities.iterrows():
        nid = str(r[c["ent_id"]])
        title = str(r[c["ent_title"]])
        title_to_id[title] = nid
        desc = str(r[c["ent_desc"]]) if c["ent_desc"] and r[c["ent_desc"]] else title
        tu_ids = _as_list(r["text_unit_ids"]) if "text_unit_ids" in t.entities.columns else []
        tiers = [tu_tier[i] for i in tu_ids if i in tu_tier]
        tier = min(tiers) if tiers else 1
        ntype = str(r[c["ent_type"]]) if c["ent_type"] and r[c["ent_type"]] else "entity"
        nodes.append((nid, title, ntype, desc, tier))

    # --- edges: relationships (source/target are entity titles) ---
    edges = []
    for _, r in t.relationships.iterrows():
        src = title_to_id.get(str(r[c["rel_src"]]))
        dst = title_to_id.get(str(r[c["rel_dst"]]))
        if not src or not dst:
            continue  # relationship to an entity that didn't survive extraction
        rel = str(r[c["rel_desc"]])[:120] if c["rel_desc"] and r[c["rel_desc"]] else "related_to"
        weight = float(r[c["rel_weight"]]) if c["rel_weight"] and r[c["rel_weight"]] is not None else 1.0
        edges.append((src, dst, rel, weight, str(_first(r[c["rel_tu"]])) if c["rel_tu"] else None))

    # --- node_community: resolve entity refs (id or title) to node ids ---
    id_set = {n[0] for n in nodes}
    node_comm = []
    if c["comm_entities"]:
        for _, r in t.communities.iterrows():
            cid, lvl = f"c_{r[c['comm_id']]}", (r[c["comm_level"]] if c["comm_level"] else 0)
            for ref in _as_list(r[c["comm_entities"]]):
                nid = str(ref) if str(ref) in id_set else title_to_id.get(str(ref))
                if nid:
                    node_comm.append((nid, cid, int(lvl)))
    return chunks, nodes, edges, node_comm


def compile_bundle(tables, out_path, version, embedder: Embedder, lang="en",
                   graphrag_version="2.x", cgt_path=DEFAULT_SPINE_SQL):
    chunks, nodes, edges, node_comm = normalize(tables)

    priv, pub_hex = bw.load_or_make_keypair(KEYS_DIR)
    conn = bw.open_bundle(out_path)
    schema.create_all(conn)
    vec_ver = bw.sqlite_vec_version(conn)
    created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    conn.execute("INSERT INTO manifest VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                 (f"edh-core-v{version}", version, "edh-core",
                  embedder.id, embedder.dim, lang, graphrag_version, vec_ver,
                  created_at, "", ""))

    conn.executemany("INSERT INTO chunks VALUES (?,?,?,?,?,?)", chunks)
    bw.insert_vectors(conn, "chunk_vec", "chunk_id",
                      [(ch[0], embedder.embed(ch[2])) for ch in chunks])
    conn.executemany("INSERT INTO nodes VALUES (?,?,?,?,?)", nodes)
    bw.insert_vectors(conn, "node_vec", "node_id",
                      [(n[0], embedder.embed(n[3])) for n in nodes])
    conn.executemany("INSERT INTO edges VALUES (?,?,?,?,?)", edges)
    conn.executemany("INSERT INTO node_community VALUES (?,?,?)", node_comm)

    # L1: ingest the authored spine SQL (default spine/edh-cgt.sql)
    cgt = bw.ingest_cgt_sql(conn, cgt_path, schema.CGT_ACTIONS)

    bw.finalize_and_sign(conn, priv, pub_hex)
    conn.close()

    print(f"[built] {out_path} ({os.path.getsize(out_path)} bytes)")
    print(f"   embedder={embedder.id} dim={embedder.dim} sqlite_vec={vec_ver}")
    print(f"   L2: chunks={len(chunks)} nodes={len(nodes)} edges={len(edges)} "
          f"node_community={len(node_comm)}")
    print(f"   L1 spine: cgt_nodes={cgt['cgt_nodes']} cgt_edges={cgt['cgt_edges']} "
          f"cgt_strings={cgt['cgt_strings']}")
    print(f"   signer_pubkey={pub_hex}")


def _selftest():
    """Fabricate GraphRAG-shaped parquet, compile with HashEmbedder, prove the mapping."""
    import tempfile

    import pandas as pd

    d = tempfile.mkdtemp(prefix="grtest_")
    pd.DataFrame({"id": ["d1"], "title": ["peshawar_recommendations_2019.txt"]}).to_parquet(f"{d}/documents.parquet")
    pd.DataFrame({"id": ["t1", "t2"], "text": ["EDH lucid interval then deterioration.",
                                               "Fixed dilated pupil signals herniation."],
                  "document_ids": [["d1"], ["d1"]]}).to_parquet(f"{d}/text_units.parquet")
    pd.DataFrame({"id": ["e1", "e2"], "title": ["Extradural Haematoma", "Uncal Herniation"],
                  "type": ["condition", "condition"],
                  "description": ["Arterial clot between dura and skull.", "Brainstem compression."],
                  "text_unit_ids": [["t1"], ["t2"]]}).to_parquet(f"{d}/entities.parquet")
    pd.DataFrame({"source": ["Extradural Haematoma"], "target": ["Uncal Herniation"],
                  "description": ["can progress to"], "weight": [0.9],
                  "text_unit_ids": [["t1"]]}).to_parquet(f"{d}/relationships.parquet")
    pd.DataFrame({"community": [0], "level": [0], "entity_ids": [["e1", "e2"]]}).to_parquet(f"{d}/communities.parquet")
    pd.DataFrame({"community": [0], "level": [0],
                  "full_content": ["EDH can herniate; act fast."]}).to_parquet(f"{d}/community_reports.parquet")

    out = os.path.join(ROOT, "bundles", "edh-core-selftest.kyro")
    compile_bundle(graphrag_io.load(d), out, version=99, embedder=HashEmbedder())
    print("[selftest] OK — GraphRAG->bundle mapping works end to end.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", help="GraphRAG project root (expects output/ parquet)")
    ap.add_argument("--version", type=int, default=1)
    ap.add_argument("--cgt", default=DEFAULT_SPINE_SQL,
                    help="path to the authored CGT spine SQL (default: spine/edh-cgt.sql)")
    ap.add_argument("--mock-embed", action="store_true",
                    help="use HashEmbedder instead of BGE-M3 (wiring tests only)")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()

    if a.selftest:
        _selftest()
        return
    if not a.root:
        ap.error("--root is required (or use --selftest)")

    output_dir = os.path.join(a.root, "output")
    embedder = HashEmbedder() if a.mock_embed else BgeM3Embedder()
    out = os.path.join(ROOT, "bundles", f"edh-core-v{a.version}.kyro")
    compile_bundle(graphrag_io.load(output_dir), out, a.version, embedder, cgt_path=a.cgt)


if __name__ == "__main__":
    main()
