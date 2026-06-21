# Handoff → Gowrish: BGE-M3 real bundle · embedding parity · MIMIC-IV Tier-C (+ GPU)

> **From:** Aniket (cloud stream) · **To:** Gowrish (edge + heavy-compute) · **Branch:** lands on `aniket/knowledge-bundle-pipeline`.
> **Merge note:** our changes are *additive within a shared `cloud/` subtree* (e.g. `cloud/kyro_engine/retrieval.py` is new; `edge/` + `KyroApp/` are yours and untouched). Expected clean, but **confirm with a dry run** — `git merge --no-commit --no-ff aniket/knowledge-bundle-pipeline` (or `git diff origin/gowrish/edge-app HEAD -- cloud/`) — before relying on it.
>
> **Why this doc:** three things are unbuilt and all on your side: (1) the **real `edh-core-v1.kyro`** bundle, (2) closing the **#1 project-killer** (embedding parity between build plane and device), and (3) the **MIMIC-IV Tier-C** eval. Every claim below was verified against the repo by an adversarial review pass; where the repo and an earlier draft disagreed, this version is corrected.

---

## TL;DR

| Job | State | Effort |
|---|---|---|
| **A. Build real `edh-core-v1.kyro`** (mock → BGE-M3) | Pipeline proven end-to-end with the mock embedder (v99 dry-run, **graphrag 3.1.0**). Flipping to BGE-M3 = a **dependency + a flag + one fp16→fp32 fix**. **But the corpus + parquet are NOT in the repo** (gitignored) — a fresh pod re-fetches + re-indexes, or I hand you a tarball. | Low–Med |
| **B. Embedding parity (#1 killer)** | Byte-identity across planes is **impossible** (fp16 GPU ≠ device). Real bar = **NN-order stability**. Needs on-device BGE-M3 wiring (today the device `embed()` returns a zero vector) + a cross-plane test. | Medium |
| **C. MIMIC-IV Tier-C eval** | **Net-new — no extraction code exists.** Credentialing done; the ETL + harness mapping is the build. The harness now takes `--cases <csv>` (added for this). | High |
| **D. GPU** | Single **H100 80 GB** (or A100 80 GB for value). Honestly v1 doesn't *need* it — it's for speed + a possible fine-tune. | — |

**Do these in order. Part A first** (it produces the bundle B and C both depend on).

---

## Part A — Build the real `edh-core-v1.kyro`

### What already works — and what's only on Aniket's disk
The pipeline is proven: `fetch_corpus → graphrag index (3.1.0) → graphrag_io parse → build_bundle → sign → verify`. The **v99 dry-run** (419 chunks / 1495 nodes / 2223 edges) was built this way with the mock embedder and passed `verify`. The only thing between v99 and v1 is **real embeddings**.

⚠️ **But three artifacts are gitignored — a fresh pod does NOT have them:**
- `cloud/graphrag/input/*.txt` (the fetched corpus) — gitignored → **re-fetch** (step 1, needs network) or get a tarball from me.
- `cloud/graphrag_dry/output/*.parquet` (the v99 parquet) — this is where the *real* GraphRAG output lives (NOT `cloud/graphrag/output/`, which doesn't exist). Untracked, local to me.
- `cloud/bundles/edh-core-v99.kyro` (18 MB) — local only. **Only `edh-core-v0-mock.kyro` is committed** (that's the mock asset currently in the APK; v99 is a separate full-corpus dry-run bundle).

➡️ **So the "reuse the parquet, skip re-index" shortcut only worked on my machine.** On a fresh pod you either (a) run the full index from scratch (steps 1–3 below), or (b) I hand you a tarball of `graphrag/input/` + `graphrag_dry/output/` and you skip to `build_bundle`. **Ask me for the tarball — it removes the network-fetch fragility entirely.**

**The embedder is a one-flag swap** (`cloud/kyro_bundle/build_bundle.py`): default is `BgeM3Embedder()`; `--mock-embed` selects `HashEmbedder()`. Per **Approach A**, `graphrag_io.py` keeps the graph and **discards GraphRAG's vectors**; `build_bundle` re-embeds chunk text + node descriptions with BGE-M3. So **graph extraction is embedder-independent** — given the parquet, producing v1 is `build_bundle` alone.

### ⚠️ Two correctness fixes BEFORE you build
1. **fp16 → fp32 on the build plane.** `cloud/kyro_bundle/embedders.py` → `BgeM3Embedder` loads `BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)`. Change to **`use_fp16=False`**. fp16 GPU inference isn't bit-reproducible; the corpus is tiny so speed is irrelevant; determinism matters. (Part B: even fp32 won't byte-match the device — that's fine.)
2. **Pin the model revision** — but do it carefully. Pass an explicit HF revision to `BGEM3FlagModel`. **Recording it in the manifest is a SEAM change, not a passing note:** the manifest's signed digest is a fixed 9-column `SELECT` mirrored on both planes (`cloud/kyro_bundle/signing.py` ≈ line 139 **and** device `canonicalDigest.ts` ≈ line 101). Adding a column to one digest list and not the other **silently breaks the byte-parity we just closed.** So either record the revision **outside the signed columns** (a side metadata field / README), **or** treat it as a coordinated change: update the schema DDL + the `INSERT` + **both** digest `SELECT`s in lockstep, then re-verify parity.

### Build steps (from `cloud/`)
```bash
# 0. one-time deps. Build + corpus-fetch + retrieval:
.venv/Scripts/pip install pymupdf trafilatura requests pyyaml     # corpus fetch (gitignored input)
.venv/Scripts/pip install "FlagEmbedding>=1.2" "graphrag>=3.1" litellm   # BGE-M3 + GraphRAG 3.1

# 1. corpus → graphrag/input/*.txt   (NEEDS OUTBOUND NETWORK: --core-only = 15 sources, 11 of them
#    live fetch_html/fetch_pdf; some may be JS-gated/blocked. Skip this entirely if Aniket gave you
#    the input tarball.) Drop --core-only for the full demo corpus (incl. textbooks — gitignored, demo-only).
.venv/Scripts/python -m ingest.fetch_corpus --core-only

# 2. GraphRAG index — use the COMMITTED proven config (NOT settings.starter.yaml, which is a stale
#    v2 OpenAI skeleton). graphrag/settings.dryrun.yaml is the exact 3.1.0 config that built v99:
cp graphrag/settings.dryrun.yaml graphrag/settings.yaml
graphrag init --root graphrag                 # writes prompts/ ; keep the settings.yaml above
export KYRO_LLM_KEY=<your Anthropic key>       # the config calls Claude natively via litellm
graphrag index --root graphrag --skip-validation
#   --skip-validation: 3.1 preflight-validates even the declared-but-unused OpenAI embed model.
#   → graphrag/output/*.parquet

# 3. build the REAL bundle (NO --mock-embed → BgeM3Embedder; embeds ~419 chunks + ~1495 nodes)
.venv/Scripts/python -m kyro_bundle.build_bundle --root graphrag --version 1
#   → bundles/edh-core-v1.kyro   (manifest: embedder_id=bge-m3, embedder_dim=1024)
#   NOTE: build_bundle still stamps graphrag_version='2.x' by default — cosmetic, but fix it to stamp
#   the real version (3.1.0) so the manifest provenance is honest.

# 4. verify (ed25519 manifest + cgt sigs, schema)
.venv/Scripts/python -m kyro_bundle.verify bundles/edh-core-v1.kyro
```

### Hand-back
`edh-core-v1.kyro` + the committed signer pubkey (`cloud/keys/dev_signer.pub`). Swap it into `KyroApp/android/app/src/main/assets/sqlite/`, **replacing `edh-core-v0-mock.kyro`**. The device loader will reject the new bundle until its `embedderId` config flips `mock-hash-1024` → `bge-m3` — that rejection is correct and expected.

---

## Part B — Embedding parity (the #1 project-killer)

### The byte-identity fallacy — read this first
The docs say "BGE-M3 1024-d **byte-identical** on both planes." Literally that's **impossible**: fp16 GPU inference isn't bit-reproducible across architectures — the cloud GPU and the phone's `llama.rn` (Qualcomm/ARM) execute the same weights with different low-bit rounding. Chasing byte-identity burns the sprint for nothing.

### The real bar: **NN-order stability**
What must hold: for the same query, **both planes return the same nearest chunks in the same order**. Retrieval correctness depends only on the *ordering* of L2-normalized vectors, not their raw bytes.

### What you must wire on-device (it's genuinely net-new)
Today the device `embed()` returns a **1024-d zero vector** (stub — `KyroApp/.../useKyroEncounter.ts`, `retrieval.ts`). You must:
1. Stand up a **BGE-M3 embedding context in `llama.rn`** returning **L2-normalized `float32[1024]`**, matching `BgeM3Embedder.embed`'s rule (`v / ‖v‖`). Same model, same dim, same normalization as the build plane.
2. Feed it into the retrieval `makeVec0Knn` (serialize `float32` → `sqlite-vec MATCH`).
3. **Fix the portability bug in the SHIPPING copy.** There are **two** device retrieval files: `edge/e2/retrieval.ts` *and* **`KyroApp/engine/e2/retrieval.ts`** — and **`KyroApp/engine/e2/` is the one that ships** (it owns the APK's sqlite asset). Both use the bare-`LIMIT` knn form that **sqlite-vec v0.1.9 rejects** ("a LIMIT or 'k = ?' constraint is required"). Change to `... WHERE embedding MATCH ? AND k = ?` — our `cloud/kyro_engine/retrieval.py` already uses the portable form (see the comment there). **Fix `KyroApp/engine/e2/` at minimum**, and confirm whether `edge/e2/` is a reference copy or also ships.

### The cross-plane parity test (the deliverable)
- **Mechanics (already green our side):** self-retrieval on the *real* v1 bundle — `cloud/tests/test_retrieval.py` **and** `edge/e2/conformance.py` both pass (ch03/n_edh top-1, graph expansion, coverage). Proves `make_vec0_knn` + encoding + distance→similarity are identical.
- **Semantics (net-new — the real test):** a shared query set (~20 clinical strings: *"lucid interval after injury"*, *"blown left pupil"*, …). Embed on cloud (Python `BgeM3Embedder`) and on device (`llama.rn`), run `retrieve()` each side, compare.
  **Acceptance (one unambiguous bar):** on **≥95 % of queries, the top-3 chunk SET is identical AND there is no swap within the top-3**; top-4/5 may reorder freely. Below that → re-check normalization, quantization, or model revision. (Pick the model that owns the shared-harness so both planes call the same query set — propose I own the cloud side, you own the device side, shared `queries.json`.)

### Also: recalibrate the coverage threshold
`grounding_threshold = 0.30` (in `cloud/kyro_engine/retrieval.py` **and** the device `retrieval.ts`) was tuned on the *mock, non-semantic* embedder. Real BGE-M3 similarity distributions differ — **sweep {0.25, 0.30, 0.40}** on the real bundle, pick from the Tier-C data, log coverage decisions, and set it in **both** planes.

---

## Part C — MIMIC-IV head-trauma slice (Tier-C)

### Status: net-new — no extraction code exists
Credentialing (PhysioNet DUA + CITI) is **done**. The work is the **ETL + harness mapping**. Build it version-controlled (suggest `cloud/mimic_extract/`) with the ICD list + itemid map + derivation rule documented.

### Map INTO this format (the harness contract — verified)
`cloud/kyro_harness/vignettes.csv` rows: `id, evidence_json, expected_action, expected_mode, must_abstain`.
- `expected_action ∈ {GUIDE, OBSERVE, STABILIZE_TRANSFER, ABSTAIN_STOP}`; `expected_mode ∈ {🟢, 🟡, 🔴}`; `must_abstain ∈ {true,false}`.
- **`evidence_json` MUST carry all 22 raw fields** (see `cloud/kyro_engine/derive.py`): `age_yr, mechanism, mechanism_class, gcs_e/v/m, lucid_interval, pupil_react_l/r, pupil_size_l/r_mm, focal_weakness_side, posturing, sbp_mmhg, spo2_available, spo2_pct, glucose_available, blood_glucose, anticoag_antiplatelet, known_coagulopathy, seizure_status, time_since_injury_hr`.
  ⚠️ **`derive.py` reads `age_yr, sbp_mmhg, spo2_available, spo2_pct, glucose_available, blood_glucose, posturing` WITHOUT `.get()` — a missing key is a hard `KeyError` crash, not a silent default.** Every row must populate **all 22** (the two operational fields `transfer_feasible_within_window`/`teleconsult_available` *are* safely defaulted, so those are optional).

### ETL pipeline
1. **Cohort:** `diagnoses_icd` for head-trauma ICD-10 — **S06.\*** (intracranial injury; EDH-specific **S06.4\***); filter `admissions` to emergency/urgent.
2. **Evidence (extract ALL of these):** `chartevents` itemids for GCS e/v/m, pupil size + reactivity L/R, systolic BP, SpO2 (+ availability flag), **glucose (+ `glucose_available`)**, posturing, seizure status; `age_yr` from `patients`; `anticoag_antiplatelet`/`known_coagulopathy` from meds/diagnoses; `lucid_interval`/`time_since_injury_hr` from notes/timestamps. Take earliest post-admit values; set `*_available='no'` + a sentinel (e.g. `blood_glucose=0`) on missing data. (Exact itemids → from the MIMIC-IV dictionary; **open question** — you have the data.)
3. **Procedures:** `procedures_icd` (burr-hole / craniotomy codes) — informs the label.
4. **Mechanism:** infer from external-cause V-codes / admission type (fall / RTA / assault); default `unknown` if uncodable.
5. **Label (`expected_action`) — derive from the actual trajectory, then mentor-sign the RULE (not each case):**
   - neurosurgical evacuation **+** herniation signs → **GUIDE**
   - transferred to a neuro center, or EDH without urgent herniation → **STABILIZE_TRANSFER**
   - small/stable, conservative, improving → **OBSERVE**
   - out-of-scope (DAI / SAH / SDH-only / penetrating / pediatric / uncorrected coagulopathy) → **ABSTAIN_STOP** + `must_abstain=true`
6. **Serialize** to a CSV matching `vignettes.csv`.

### Run + report
The harness now takes a `--cases` flag (added for this — `load_cases(path)`):
```bash
.venv/Scripts/python -m kyro_harness --bundle bundles/edh-core-v1.kyro --cases mimic_slice.csv --out out/tier_c
```
- Spine arms (3, 4) always run; model arms (1, 2) run if `KYRO_QWEN_GGUF` + the v1 bundle are on the pod.
- **Report Tier-A (N≈10) and Tier-C (N≈100–200) as TWO distributions — never pool.** Side-by-side confusion matrices, harm rate, must-abstain recall, coverage, safe-band accuracy.
- **PROBAST discipline:** state the single-rater / programmatic-label limitation up front; mentor-review the derivation rule; sensitivity-sweep a subset under an alternative rule; report calibration + abstention alongside accuracy.

### Honest caveat to say out loud
MIMIC labels = *"what the ICU did,"* which assumes the ICU was right and skews toward operative/transfer trajectories. Tier-C validates **generalization to real data**, not ground truth. Name it.

---

## Part D — GPU + RunPod

### The pick
A single **H100 80 GB** (or **A100 80 GB** at ~⅓ the price). **One GPU** — nothing here parallelizes across GPUs (single embed batch + single-model llama.cpp inference + a single-GPU QLoRA all fit one card).

### Honest sizing — so you know what you're paying for
| Workload | Model | ~VRAM | Needs a big GPU? |
|---|---|---|---|
| BGE-M3 build (fp32; ~419 chunks + ~1495 nodes — *v99 actual*; the ~160-node curated core is a roadmap target) | BGE-M3 (560 M) | ~4 GB | **No** — seconds; CPU-fine |
| Harness arms 1 + 2 | Qwen2.5-3B-**Q4** (llama.cpp) | ~3 GB | **No** — minutes |
| MIMIC Tier-C inference (3B × ~100–200 multi-turn) | Qwen 3B | ~6–8 GB | Somewhat — faster, not bottleneck |
| Tier-B AMIE self-play (volume gen) | 3B batched | scales w/ VRAM | **Yes** (throughput) |
| **Roadmap QLoRA fine-tune** (3B/8B) | — | 24–80 GB | **Yes — the only thing that justifies 80 GB** |

**Verdict:** the 80 GB card is "buy once, never think about it, fine-tune-ready." Skip the fine-tune and want value? An **A40 / RTX 4090 (24 GB)** finishes v1's build + eval in minutes. Honest pitch line: *the entire v1 build + eval runs on one consumer GPU (the bundle build even on CPU)* — reinforces the offline / minimal-footprint story.

### Precision note (ties to Part B)
Build BGE-M3 in **fp32 / deterministic**, not fp16-for-speed. (And remember: fp32 still won't byte-match the device — **NN-order stability is the bar**.)

### Pod setup
- **Image:** `pytorch/pytorch:2.x-cuda12.1-cudnn8-devel` (torch + nvcc).
- **Deps:** `pip install -r cloud/requirements.txt` then the opt-in heavies (now pinned correctly in that file): `pymupdf trafilatura requests pyyaml` (corpus), `llama-cpp-python` (CUDA build), `FlagEmbedding>=1.2 graphrag>=3.1 litellm`.
- **Models (cache on a volume):** **`Qwen2.5-3B-Instruct-Q4_K_M.gguf`** (~2 GB — `cloud/models/download_qwen.py` fetches it) → `KYRO_QWEN_GGUF=/path/...gguf`; `BAAI/bge-m3` (~0.4 GB, auto-cached — **pin the revision**). *(Heads-up: a couple of `Qwen-4B` strings in older comments are stale — the model is 3B.)*
- **Env:** `KYRO_QWEN_GGUF`; `KYRO_LLM_KEY` (the Anthropic key the GraphRAG 3.1 build reads, per `settings.dryrun.yaml`).
- **Disk:** ~20 GB volume (models + parquet + bundles).

---

## Open decisions (need a human call)
- [ ] **BGE-M3 HF revision** to pin — and **how** to record it (outside the signed digest, or a coordinated seam change to both `signing.py` + `canonicalDigest.ts`).
- [ ] Confirm **`use_fp16=True` → `False`** in `embedders.py` (recommended).
- [ ] **Corpus delivery:** re-fetch on the pod (needs network, some sources may block) vs. Aniket hands over the `graphrag/input/` + `graphrag_dry/output/` tarball (recommended — skips fetch + index).
- [ ] MIMIC: exact **itemid map + ICD list + `expected_action` derivation rule** → **mentor-sign** before the final Tier-C run.
- [ ] Tier-C **N + stratification** target.
- [ ] **Fine-tune: in or out** for the sprint? Default per scope: **out** (stock Qwen first).
- [ ] Minor cleanup: `build_bundle.py` stamps `graphrag_version='2.x'` → fix to the real version; settings.starter.yaml (v2 skeleton) → retire in favor of `settings.dryrun.yaml`.

---

*Cross-plane parity is "verify, don't assume." The cloud side (retrieval.py, the parity tests, the proven config, the build pipeline) is green and pushed; the device embed wiring + the semantic parity test + the MIMIC ETL are yours. Ping me the moment v1 is built — I'll re-run the cloud-side retrieval tests against it so we catch a seam break before it reaches the phone.*
