#!/usr/bin/env python3
"""Part B — DEVICE-ENGINE parity proxy (llama.cpp).

The device embeds queries with BGE-M3 on **llama.rn**, which wraps **llama.cpp**. This script
runs that exact engine (llama-cpp-python, same C++ core) on a BGE-M3 GGUF — CLS-pooled, L2-
normalized — and retrieves against the FlagEmbedding-built bundle using the SAME cloud
retrieval.py. That is precisely the device scenario:

    corpus vectors = FlagEmbedding (cloud build)   ·   query vector = llama.cpp (device engine)

So this measures the real cross-engine NN-order stability, isolating only the ARM-vs-x86 fp
rounding (which the handoff accepts — NN-order, not byte-identity, is the bar). It emits
`parity_device.json` in the SAME schema as run_parity_cloud.py → feed both to compare_parity.py.

This is also the reference implementation for the device's KyroApp/src/bgeEmbed.ts (identical
logic: CLS pooling + explicit L2 normalize).

Run:  python -m parity.run_parity_llamacpp --bundle bundles/edh-core-v1.kyro --gguf <path/bge-m3-Q8_0.gguf>
"""
from __future__ import annotations

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CLOUD = os.path.dirname(HERE)
sys.path.insert(0, CLOUD)

import numpy as np  # noqa: E402
import sqlite_vec  # noqa: E402

from kyro_engine import retrieval as R  # noqa: E402


def _default_gguf() -> str | None:
    if os.path.exists("/tmp/bge_m3_gguf_path.txt"):
        p = open("/tmp/bge_m3_gguf_path.txt").read().strip()
        if os.path.exists(p):
            return p
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bundle", default=os.path.join(CLOUD, "bundles", "edh-core-v1.kyro"))
    ap.add_argument("--queries", default=os.path.join(HERE, "queries.json"))
    ap.add_argument("--gguf", default=_default_gguf())
    ap.add_argument("--out", default=os.path.join(HERE, "parity_device.json"))
    ap.add_argument("--k", type=int, default=6)
    a = ap.parse_args()
    if not a.gguf or not os.path.exists(a.gguf):
        ap.error("--gguf path to a bge-m3 GGUF is required (e.g. gpustack/bge-m3-GGUF · bge-m3-Q8_0.gguf)")

    from llama_cpp import Llama
    # pooling_type=2 == LLAMA_POOLING_TYPE_CLS — MUST match FlagEmbedding's dense pooling.
    llm = Llama(model_path=a.gguf, embedding=True, pooling_type=2, n_ctx=512, verbose=False)

    def embed_vec(text: str) -> np.ndarray:
        out = llm.embed(text)
        v = np.asarray(out, dtype=np.float32).reshape(-1)
        if v.shape[0] != 1024:
            raise SystemExit(f"llama.cpp returned dim {v.shape[0]} (expected 1024) — wrong model/pooling?")
        n = np.linalg.norm(v)
        return v / n if n > 0 else v  # explicit L2-norm, matching the cloud embedder + bgeEmbed.ts

    conn = R.open_bundle_ro(a.bundle)
    knn = R.make_vec0_knn(conn)
    queries = json.load(open(a.queries))["queries"]

    results = []
    for q in queries:
        blob = sqlite_vec.serialize_float32(embed_vec(q["text"]).tolist())
        res = R.retrieve(conn, q["text"], None, embed=lambda _t, _b=blob: _b, knn=knn,
                         opts={"k_chunks": a.k, "k_nodes": 4})
        topk = [{"rank": i + 1, "chunk_id": c.id, "score": round(c.score, 6), "via": c.via,
                 "trust_tier": c.trust_tier, "citation": c.source_citation}
                for i, c in enumerate(res.chunks[:a.k])]
        results.append({"id": q["id"], "text": q["text"], "top_chunks": topk,
                        "top3_set": sorted(c["chunk_id"] for c in topk[:3]),
                        "coverage": {"covered": res.coverage.covered, "score": res.coverage.score,
                                     "top_trust_tier": res.coverage.top_trust_tier}})
    conn.close()

    payload = {"plane": "device-proxy-llamacpp", "engine": "llama.cpp (llama-cpp-python)",
               "gguf": os.path.basename(a.gguf), "pooling": "cls", "embedder_dim": 1024,
               "bundle": os.path.basename(a.bundle), "k": a.k, "queries": results}
    json.dump(payload, open(a.out, "w"), indent=2)
    cov = sum(1 for r in results if r["coverage"]["covered"])
    print(f"[parity-device-proxy] engine=llama.cpp gguf={os.path.basename(a.gguf)} "
          f"queries={len(results)} covered={cov}/{len(results)}")
    print(f"  wrote {os.path.relpath(a.out, CLOUD)} — diff vs cloud: python -m parity.compare_parity "
          f"parity/parity_cloud.json parity/parity_device.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
