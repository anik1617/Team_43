# Embedding-parity result — edh-core-v1.kyro

Measured 2026-06-21 on the RunPod build pod (RTX 4090). All numbers reproducible via the
scripts in this directory.

## Bundle under test
`bundles/edh-core-v1.kyro` — `embedder_id=bge-m3`, `dim=1024`, `sqlite_vec=v0.1.9`, signed
ed25519 with the **pinned** dev signer key (`verify` → VALID).
- **1415 chunks** (535 tier-0 + 464 tier-1 text_units, 416 programmatic community summaries)
- **10,172 nodes · 19,168 edges** · L1 spine 60/87/41
  - includes a **backfill** of the 60 credit-gap orphan chunks: their entities/relationships were
    re-extracted by Claude Code agents (no API), recovering 55 clinical chunks → +273 new nodes,
    +535 edges, and 463 links onto existing entities. Orphans dropped 60 → 5 (genuine filler).
- BGE-M3 build: **fp32** (`use_fp16=False`), HF revision `5617a9f61b028005a4858fdac845db406aefb181`

## 1 · Mechanics — self-retrieval on the real bundle
Query each row with its OWN stored vector → it must come back rank-1.
**chunks 25/25, nodes 25/25 rank-1 (min top-1 similarity 1.0).** vec0 wiring + encoding +
distance→similarity are correct on the real BGE-M3 bundle.

## 2 · Coverage + threshold recalibration
`grounding_threshold` was tuned on the mock embedder; recalibrated on real BGE-M3 over the
20-query clinical set. Top-1 vector-hit similarity distribution: min 0.548 / median 0.656 / max 0.810.

| threshold | tier-0 coverage |
|---|---|
| 0.25 | 20/20 (100%) |
| **0.30** | **20/20 (100%)** |
| 0.40 | 19/20 (95%) |

**Recommendation: keep `grounding_threshold = 0.30`** on both planes — 100% tier-0 coverage,
comfortably below the 0.548 min top-1. (0.40 is a viable stricter setting; 95% coverage.)

## 3 · Cross-plane NN-order parity (the #1 killer)
Corpus embedded cloud-side with FlagEmbedding (fp32); queries embedded with **llama.cpp**
(the engine `llama.rn` wraps) on a BGE-M3 GGUF, CLS-pooled + L2-normalized; both retrieve
against the same bundle. Bar: **≥95% of queries have an identical top-3 chunk SET AND no swap**.

| device precision | top-3 set + no-swap | coverage agreement | verdict |
|---|---|---|---|
| **FP16 GGUF** | **19/20 = 95%** | 20/20 | **PASS ✓** |
| Q8_0 GGUF | 15–16/20 = 75–80% | 20/20 | FAIL |

**Finding:** parity holds **at FP16**; Q8_0 quantization noise shifts *near-tie graph-expansion
chunks* at the top-3 boundary (the high-score vector hits + the coverage verdict stay stable —
functional parity was ~100% even at Q8). **Ship the FP16 BGE-M3 GGUF on device** (~1.2 GB), not Q8_0.
A stable `(tier, -score, id)` tiebreaker was added to both planes' retrieval sort so equal-scored
chunks order deterministically across planes.

### Caveat (honest)
The proxy is llama.cpp on **x86**, not `llama.rn` on **ARM**. It isolates engine + quantization
(the dominant factors) but not the residual ARM fp rounding — confirm on-device with
`edge/e2/parityDevice.ts` → `compare_parity.py` against this same `parity_cloud.json`.

## Reproduce
```bash
python -m parity.run_parity_cloud      --bundle bundles/edh-core-v1.kyro
python -m parity.sweep_threshold       --bundle bundles/edh-core-v1.kyro
python -m parity.run_parity_llamacpp   --bundle bundles/edh-core-v1.kyro --gguf <bge-m3-FP16.gguf> --out parity/parity_device.json
python -m parity.compare_parity parity/parity_cloud.json parity/parity_device.json
```

## Bugs found + fixed during this build (both would have shipped silently)
1. **`kyro_engine/retrieval.py:_manifest_get`** queried a key/value manifest that doesn't exist →
   swallowed exception → defaulted EVERY bundle to the hash embedder. On a real bge-m3 bundle that
   hash-embeds the QUERY against a BGE-M3 corpus = the #1 killer, invisibly. Fixed to read the wide
   single-row manifest.
2. **`kyro_bundle/graphrag_io.py`** only recognized `document_ids` (plural); graphrag 3.1 emits
   `document_id` (singular) → every chunk's source was unresolved → **all 999 chunks were tier-1
   "Uncited source"** (no tier-0, no real citations). Fixed to accept both. Restored 535 tier-0
   chunks + real citations + 🟢 coverage.
