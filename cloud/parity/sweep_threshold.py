#!/usr/bin/env python3
"""Part B — recalibrate grounding_threshold on the REAL bge-m3 bundle.

`grounding_threshold = 0.30` (in kyro_engine/retrieval.py AND the device retrieval.ts) was
tuned on the MOCK, non-semantic embedder. Real BGE-M3 cosine distributions differ, so we sweep
{0.25, 0.30, 0.40} over the shared query set and report, per threshold:
  - coverage rate (queries with >=1 supporting chunk at/under max_trust_tier=0)
  - the similarity-score distribution (so the choice is data-driven, not vibes)

Retrieval fetches the same k chunks regardless of threshold (threshold only gates COVERAGE),
so we embed+retrieve once per query and recompute coverage at each threshold — cheap.

Run:  python -m parity.sweep_threshold --bundle bundles/edh-core-v1.kyro
"""
from __future__ import annotations

import argparse
import json
import os
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CLOUD = os.path.dirname(HERE)
sys.path.insert(0, CLOUD)

import sqlite_vec  # noqa: E402

from kyro_bundle.embedders import BgeM3Embedder  # noqa: E402
from kyro_engine import retrieval as R  # noqa: E402

THRESHOLDS = [0.25, 0.30, 0.40]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bundle", default=os.path.join(CLOUD, "bundles", "edh-core-v1.kyro"))
    ap.add_argument("--queries", default=os.path.join(HERE, "queries.json"))
    ap.add_argument("--out", default=os.path.join(HERE, "threshold_sweep.json"))
    a = ap.parse_args()

    conn = R.open_bundle_ro(a.bundle)
    knn = R.make_vec0_knn(conn)
    bge = BgeM3Embedder()
    queries = json.load(open(a.queries))["queries"]

    # embed + retrieve once per query; keep the full scored context for re-coverage
    per_query, top1_scores, all_scores = [], [], []
    for q in queries:
        blob = sqlite_vec.serialize_float32(bge.embed(q["text"]).tolist())
        res = R.retrieve(conn, q["text"], None, embed=lambda _t, _b=blob: _b, knn=knn,
                         opts={"k_chunks": 6, "k_nodes": 4})
        per_query.append((q["id"], res.chunks))
        scores = [c.score for c in res.chunks if c.via == "vector"]
        if scores:
            top1_scores.append(max(scores))
            all_scores.extend(scores)

    sweep = {}
    for thr in THRESHOLDS:
        opts = {**R.DEFAULTS, "grounding_threshold": thr}
        covered, per = 0, []
        for qid, ctx in per_query:
            cov = R.compute_coverage(None, ctx, opts)
            covered += 1 if cov.covered else 0
            per.append({"id": qid, "covered": cov.covered,
                        "score": round(cov.score, 4) if cov.score is not None else None,
                        "top_trust_tier": cov.top_trust_tier})
        sweep[f"{thr:.2f}"] = {"coverage_rate": round(covered / len(queries), 3),
                               "covered": covered, "total": len(queries), "per_query": per}

    def stats(xs):
        xs = sorted(xs)
        return {"n": len(xs), "min": round(xs[0], 4), "max": round(xs[-1], 4),
                "mean": round(statistics.mean(xs), 4), "median": round(statistics.median(xs), 4),
                "p25": round(xs[len(xs) // 4], 4), "p75": round(xs[(3 * len(xs)) // 4], 4)}

    report = {"bundle": os.path.basename(a.bundle),
              "top1_vector_score_dist": stats(top1_scores) if top1_scores else {},
              "all_vector_score_dist": stats(all_scores) if all_scores else {},
              "sweep": sweep}
    json.dump(report, open(a.out, "w"), indent=2)
    conn.close()

    print(f"[threshold-sweep] {os.path.basename(a.bundle)}")
    if top1_scores:
        d = report["top1_vector_score_dist"]
        print(f"  top-1 vector-hit similarity: min={d['min']} p25={d['p25']} median={d['median']} "
              f"p75={d['p75']} max={d['max']}")
    for thr in THRESHOLDS:
        s = sweep[f"{thr:.2f}"]
        print(f"  threshold {thr:.2f}: coverage {s['covered']}/{s['total']} = {s['coverage_rate']:.0%}")
    print(f"  wrote {os.path.relpath(a.out, CLOUD)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
