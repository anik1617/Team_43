# Embedding parity — cloud side (Part B)

This directory is the **cloud half** of the cross-plane embedding-parity test for
`edh-core-v{N}.kyro`. It produces the artifact the **device half** (Gowrish, BGE-M3 on
`llama.rn`) diffs against.

## The bar is NN-order stability, not byte-identity
Byte-identical embeddings across planes are **impossible**: fp16/quantized inference on the
GPU vs. ARM rounds differently. Retrieval correctness depends only on the **ordering** of
L2-normalized vectors, so the agreed acceptance bar is:

> On **≥95 %** of the shared queries, the **top-3 chunk SET is identical AND there is no swap
> within the top-3** (top-4/5 may reorder freely).

## Files
| File | What |
|---|---|
| `queries.json` | The shared query set (20 acute-TBI/EDH clinical strings). **Both planes embed + retrieve THIS file.** |
| `run_parity_cloud.py` | Cloud harness → `parity_cloud.json` (+ `query_embeddings.cloud.json`). Manifest guard, embedder-detection regression guard, self-retrieval mechanics check, semantic top-k. |
| `sweep_threshold.py` | Recalibrates `grounding_threshold` ∈ {0.25, 0.30, 0.40} on the real bundle → `threshold_sweep.json`. |
| `compare_parity.py` | The acceptance gate: `compare_parity.py parity_cloud.json parity_device.json` → PASS/FAIL. |

## Provenance (pin this on BOTH planes)
- **Model:** `BAAI/bge-m3`, dense embeddings, **dim 1024**, **L2-normalized** (`v/‖v‖`).
- **HF revision:** `5617a9f61b028005a4858fdac845db406aefb181` (the snapshot this bundle was built on).
- **Precision:** `use_fp16=False` (fp32) on the build plane — deterministic; see `kyro_bundle/embedders.py`.
- Recorded **outside** the signed manifest digest columns (a digest-column change is a coordinated
  seam change to `signing.py` + device `canonicalDigest.ts` — deliberately avoided here).

## Device-side contract (Gowrish)
Emit `parity_device.json` in the SAME schema as `parity_cloud.json` — minimally, per query:
`{"id": "...", "top_chunks": [{"chunk_id": "..."}, ...]}` ordered by similarity. Use the SAME
`queries.json`, the SAME bundle, BGE-M3 at the revision above, L2-normalized float32[1024], and the
portable `... WHERE embedding MATCH ? AND k = ?` knn form (sqlite-vec ≥0.1.9 rejects bare `LIMIT`).
Then run `compare_parity.py`.

## Run
```bash
cd cloud
python -m parity.run_parity_cloud --bundle bundles/edh-core-v1.kyro
python -m parity.sweep_threshold   --bundle bundles/edh-core-v1.kyro
# after the device produces parity_device.json:
python -m parity.compare_parity parity/parity_cloud.json parity/parity_device.json
```

> **Measured result (2026-06-21): see [`PARITY_RESULT.md`](PARITY_RESULT.md).** Cross-plane PASS at device **FP16** (19/20 = 95%; Q8_0 fails at ~75-80%). Keep `grounding_threshold = 0.30` (100% tier-0 coverage). Self-retrieval 25/25 chunks + nodes.
