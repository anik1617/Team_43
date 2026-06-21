# Handoff → Gowrish: device-side BGE-M3 embedding parity (Part B, device half)

> Completes the device half of `docs/HANDOFF-bge-m3-and-mimic.md` Part B. The cloud half
> (real `edh-core-v1.kyro` + parity harness + measured result) landed on
> `aniket/knowledge-bundle-pipeline` @ `a097dec` (`cloud/parity/PARITY_RESULT.md`).
>
> **Status: code-complete, inspection-verified, NOT compiled/run** (authored on a pod with no
> Node and no Android). The two things left are yours and need real hardware — see "What's left".

## Commits on this branch
- `73f4c70` — feat(e2): on-device BGE-M3 embedding parity (real query embedder + portable knn)
- `ac6423c` — fix(e2): stable knn tiebreak + ship FP16 bge-m3 (measured: FP16 PASS, Q8 fails)

## What changed
| File | Change |
|---|---|
| `KyroApp/src/bgeEmbed.ts` *(new)* | Real BGE-M3 query embedder via `llama.rn` (`initLlama({embedding:true, pooling_type:CLS})` → `ctx.embedding()`), **L2-normalized float32[1024]** to match the cloud `BgeM3Embedder`. |
| `KyroApp/src/retrievalDeps.ts` *(new)* | Resolves the real path (BGE-M3 + `makeVec0Knn`) vs the deterministic stub, keyed on `manifest.embedder_id === 'bge-m3'` + GGUF availability. The locked mock-bundle demo is preserved byte-for-byte. |
| `KyroApp/src/useKyroEncounter.ts`, `engine.ts` | Wired: query embed is async on device, so we precompute the vector and pass `() => qv` into the sync `retrieve()`. |
| `KyroApp/engine/e2/retrieval.ts`, `edge/e2/retrieval.ts` | **Portability fix**: `... MATCH ? AND k = ?` (sqlite-vec ≥0.1.9 rejects the bare `LIMIT` form). **Stable tiebreak**: sort `(tier, -score, id)` so equal-scored graph chunks order identically across planes. |
| `edge/e2/parityDevice.ts` *(new)* | On-device parity harness — emits the same schema `cloud/parity/compare_parity.py` consumes. |

## Three artifacts to load on the device (matched set)
| # | Artifact | Source | Action |
|---|---|---|---|
| 1 | **`bge-m3-FP16.gguf`** (~1.1 GB) | `gpustack/bge-m3-GGUF` (or `/workspace/`) | `adb push … /sdcard/Android/data/com.kyroapp/files/bge-m3.gguf` |
| 2 | **`edh-core-v1.kyro`** (~70 MB) | `cloud/bundles/` on `aniket/...` @ `a097dec` | replace `KyroApp/android/app/src/main/assets/sqlite/edh-core-v0-mock.kyro` |
| 3 | Qwen2.5-3B GGUF | you already have it | unchanged (L3 "mouth") |

⚠️ **#1 and #2 are a matched set** — both BGE-M3 1024-d. Ship **FP16**, not Q8_0.

## Measured parity result (cloud `PARITY_RESULT.md`)
A llama.cpp device proxy (same engine `llama.rn` wraps) vs the fp32-built cloud bundle:

| device precision | top-3 set + no-swap | coverage agreement | verdict |
|---|---|---|---|
| **FP16** | **19/20 = 95%** | 20/20 | **PASS** |
| Q8_0 | 15–16/20 = 75–80% | 20/20 | FAIL |

Quantization noise shifts near-tie graph-chunk boundaries → **ship FP16**. Keep
`groundingThreshold = 0.30` (100% tier-0 coverage on real BGE-M3).

## What's left (yours — needs hardware)
1. **Compile**: `tsc --noEmit` over `KyroApp/`. Confirm the `llama.rn@0.12.4` embedding API
   (`initLlama({embedding:true})`, `ctx.embedding()`, `pooling_type`) matches what's wired in
   `bgeEmbed.ts` — patch the call if the installed shape differs.
2. **On-device parity**: after loading #1 + #2, run `edge/e2/parityDevice.ts` over the shared
   `cloud/parity/queries.json` → emit `parity_device.json` → `python -m parity.compare_parity
   parity/parity_cloud.json parity_device.json`. Confirms the residual ARM-fp delta holds the
   95% bar (the x86 proxy strongly suggests it will at FP16).

## Parity-critical invariants (don't drift without re-running compare_parity)
- model `BAAI/bge-m3`, **dim 1024**, **CLS pooling**, **explicit L2-normalize** (`v/‖v‖`).
- HF revision the bundle was built on: `5617a9f61b028005a4858fdac845db406aefb181`.
- portable knn `WHERE embedding MATCH ? AND k = ?`; sort `(tier, -score, id)` — both planes.
