#!/usr/bin/env python3
"""Part B — cloud-side embedding-parity harness for edh-core-v{N}.kyro.

Produces `parity_cloud.json`: the artifact the DEVICE plane (Gowrish, llama.rn BGE-M3)
diffs against to prove cross-plane NN-order stability. We do NOT chase byte-identity
(fp16 GPU != ARM fp is non-reproducible by construction); the bar is ORDER stability:

    on >=95% of queries the top-3 chunk SET is identical AND there is no swap within
    the top-3 (top-4/5 may reorder freely).

What this script does, all against the REAL bge-m3 bundle:
  1. manifest guard      — assert embedder_id=bge-m3, dim=1024.
  2. embedder-detect     — assert the cloud retrieval helper (_manifest_get) now picks
                           bge-m3 on the real bundle (regression guard for the seam bug
                           where it silently defaulted to the hash embedder).
  3. self-retrieval      — query a sample of chunks/nodes with their OWN stored vector;
                           top-1 must be the row itself, score > 0.99 (proves vec0 wiring
                           + encoding + distance->similarity on the real bundle).
  4. semantic retrieval  — embed each shared query with BGE-M3 (fp32), run retrieve(),
                           record the ordered top-k chunks (id/score/citation/tier) +
                           coverage. This ordered list is the device-comparison target.

Run:  python -m parity.run_parity_cloud --bundle bundles/edh-core-v1.kyro
"""
from __future__ import annotations

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CLOUD = os.path.dirname(HERE)
sys.path.insert(0, CLOUD)

import sqlite_vec  # noqa: E402

from kyro_bundle.embedders import BgeM3Embedder  # noqa: E402
from kyro_engine import retrieval as R  # noqa: E402


def read_manifest(conn) -> dict:
    cols = [d[0] for d in conn.execute("SELECT * FROM manifest").description]
    return dict(zip(cols, conn.execute("SELECT * FROM manifest").fetchone()))


def self_retrieval_check(conn, knn, sample: int = 25) -> dict:
    """Query each sampled row with its OWN stored vector; top-1 must be itself > 0.99."""
    out = {}
    for table, id_col, kind in (("chunk_vec", "chunk_id", "chunk"), ("node_vec", "node_id", "node")):
        ids = [r[0] for r in conn.execute(f"SELECT {id_col} FROM {table} LIMIT ?", (sample,))]
        ok, worst = 0, 1.0
        for _id in ids:
            blob = conn.execute(f"SELECT embedding FROM {table} WHERE {id_col}=?", (_id,)).fetchone()[0]
            hits = knn(table, blob, 3)
            top = hits[0] if hits else None
            if top is not None and top.id == _id and top.score > 0.99:
                ok += 1
            if top is not None:
                worst = min(worst, top.score)
        out[kind] = {"sampled": len(ids), "rank1_self": ok, "min_top1_score": round(worst, 4)}
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bundle", default=os.path.join(CLOUD, "bundles", "edh-core-v1.kyro"))
    ap.add_argument("--queries", default=os.path.join(HERE, "queries.json"))
    ap.add_argument("--out", default=os.path.join(HERE, "parity_cloud.json"))
    ap.add_argument("--emb-out", default=os.path.join(HERE, "query_embeddings.cloud.json"))
    ap.add_argument("--k", type=int, default=6)
    a = ap.parse_args()

    conn = R.open_bundle_ro(a.bundle)
    m = read_manifest(conn)
    assert m["embedder_id"] == "bge-m3", f"expected a bge-m3 bundle, got embedder_id={m['embedder_id']!r}"
    assert m["embedder_dim"] == 1024, f"expected dim 1024, got {m['embedder_dim']}"
    picked = R._manifest_get(conn, "embedder_id")
    assert picked == "bge-m3", (
        f"_manifest_get returned {picked!r} on the real bundle — the embedder-detection "
        "seam bug is NOT fixed; cloud queries would be hash-embedded against a BGE-M3 corpus."
    )

    knn = R.make_vec0_knn(conn)
    bge = BgeM3Embedder()  # fp32 (embedders.py use_fp16=False)

    self_chk = self_retrieval_check(conn, knn)

    queries = json.load(open(a.queries))["queries"]
    results, qembs = [], {}
    for q in queries:
        vec = bge.embed(q["text"])
        blob = sqlite_vec.serialize_float32(vec.tolist())
        res = R.retrieve(conn, q["text"], None, embed=lambda _t, _b=blob: _b, knn=knn,
                         opts={"k_chunks": a.k, "k_nodes": 4})
        topk = [{"rank": i + 1, "chunk_id": c.id, "score": round(c.score, 6), "via": c.via,
                 "trust_tier": c.trust_tier, "kind": c.kind, "citation": c.source_citation,
                 "snippet": " ".join((c.text or "").split())[:160]}
                for i, c in enumerate(res.chunks[:a.k])]
        results.append({
            "id": q["id"], "text": q["text"],
            "top_chunks": topk,
            "top3_set": sorted(c["chunk_id"] for c in topk[:3]),
            "seed_nodes": [{"node_id": h.id, "score": round(h.score, 6)} for h in res.seed_nodes],
            "coverage": {"covered": res.coverage.covered, "score": res.coverage.score,
                         "top_trust_tier": res.coverage.top_trust_tier,
                         "citations": res.coverage.supporting_citations},
        })
        qembs[q["id"]] = [round(float(x), 6) for x in vec]

    rev = "unknown"
    if os.path.exists("/tmp/bge_m3_revision.txt"):
        rev = open("/tmp/bge_m3_revision.txt").read().strip()

    payload = {
        "plane": "cloud", "bundle": os.path.basename(a.bundle),
        "embedder_id": m["embedder_id"], "embedder_dim": m["embedder_dim"],
        "bge_m3_revision": rev, "use_fp16": False, "k": a.k,
        "acceptance": "top-3 chunk SET identical AND no swap within top-3, on >=95% of queries",
        "self_retrieval": self_chk,
        "queries": results,
    }
    json.dump(payload, open(a.out, "w"), indent=2)
    json.dump({"embedder_id": m["embedder_id"], "dim": m["embedder_dim"], "vectors": qembs},
              open(a.emb_out, "w"))
    conn.close()

    cov = sum(1 for r in results if r["coverage"]["covered"])
    print(f"[parity-cloud] bundle={os.path.basename(a.bundle)} "
          f"embedder={m['embedder_id']}/{m['embedder_dim']} rev={rev[:12]}")
    print(f"  self-retrieval chunks: {self_chk['chunk']['rank1_self']}/{self_chk['chunk']['sampled']} "
          f"rank-1 (min top1 {self_chk['chunk']['min_top1_score']})")
    print(f"  self-retrieval nodes : {self_chk['node']['rank1_self']}/{self_chk['node']['sampled']} "
          f"rank-1 (min top1 {self_chk['node']['min_top1_score']})")
    print(f"  semantic queries: {len(results)} | covered (tier<=0): {cov}/{len(results)}")
    print(f"  wrote {os.path.relpath(a.out, CLOUD)} and {os.path.relpath(a.emb_out, CLOUD)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
