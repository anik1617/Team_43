# Design Spec — Cloud Knowledge Bundle + Benchmark Harness (Kyro v1)

**Date:** 2026-06-20  **Owner:** Aniket (cloud stream)  **Status:** approved design, pre-implementation
**Scope of this spec:** the two cloud-stream subsystems that produce the **validation/science slide** — the real signed knowledge bundle (`edh-core-v1.kyro`) and the benchmark harness — plus the **shared Python reference executor (`kyro_engine`)** they both require.
**Out of scope:** the React-Native app, on-device model integration, voice (Gowrish/edge); the E8 `/escalate` endpoint and C7 portal (later cloud passes).

---

## 1. Goal & success criteria

Produce, by end of sprint, **evidence a skeptical-MD panel will believe**:

1. A **real, signed `edh-core-v1.kyro`** built from the in-repo corpus via GraphRAG (Claude extraction) + BGE-M3 — not the mock.
2. A **harness** that emits Kyro's six headline numbers + the new **coverage/helpfulness** metric + the **spine-ablation collapse chart**, where:
   - the **deterministic arms run GPU-free** (no supercomputer, not blocked on Gowrish), and
   - the LLM-baseline arms are a clean hand-off to a GPU (Gowrish or a small local Qwen).

**Definition of done (MUST):** `kyro_engine` traverses the real bundle; the harness scores the 38 vignettes on the deterministic arms (metrics 1–4 + coverage) and renders the ablation collapse chart for arms 3–4. SHOULD/STRETCH in §9.

**The honest framing baked into the design** (this *is* the win condition): the deterministic arm scoring well is **by construction** — the spine encodes the guideline, so a faithful evidence-encoding *must* reach the sanctioned leaf. The persuasive result is therefore **the delta**: the LLM-only arms collapse (lower action-accuracy, non-zero harm) when the L1 spine is removed. We claim *"structure guarantees safety,"* never *"our model reasons well."*

---

## 2. Architecture — 3 pieces, 1 shared core

```
cloud/
  kyro_bundle/   [EXISTS]  build pipeline → edh-core-v{N}.kyro  (schema.py is the seam)
  kyro_engine/   [NEW]     deterministic executor — shared by harness AND = spec for RN E3
  kyro_harness/  [NEW]     drives the engine over the vignettes → metrics + charts
```

**Pivotal property (the inversion):** `kyro_engine` decides the clinical **action with no model** — the deterministic spine + safety rules produce `{leaf, action, mode}`. The model (L3) is a **pluggable narrator**, needed only for I/O phrasing and the LLM ablation arms. Consequences:

- The hero metrics (triage accuracy, abstention, concordance) and the **spine-ablation chart** are produced by pure Python → **GPU-free, on Aniket's laptop**.
- The same engine, given the same bundle + same vignettes, is the **executable parity spec** for Gowrish's RN executor (E3): identical leaves ⇒ the two planes agree.

**Compute split:** Aniket builds all three pieces and runs the deterministic arms. LLM arms (bare Qwen, +graph) run on Gowrish's GPU or a small local Qwen.

---

## 3. Component — `kyro_engine` (the deterministic executor; the credibility core)

```
kyro_engine/
  loader.py      open + verify a .kyro bundle; expose cgt_*, graph, vectors, manifest
  evidence.py    the <evidence, hypotheses, trajectory> working-memory object
  executor.py    advance / act / ask loop over cgt_nodes + cgt_edges
  safety.py      S1–S6 meta-rules as code that can VETO a leaf
  retrieval.py   L2 GraphRAG local-search → citations (reuses BGE-M3 embed of the query)
  narrator.py    abstract Narrator: NullNarrator (deterministic) | QwenNarrator (I/O)
  result.py      KyroResult{leaf_id, action, mode, citations, trajectory, asked, abstained}
```

**Traversal semantics** (transcribed from `docs/20-edh-cgt-spine.md` + the spine SQL header — *not invented*): starting at `cgt_meta.root_id` (N00), at each node:
- **ask** — node `kind='gather'` and a `required` field is absent from evidence → emit the node's `cgt_strings.prompt`; halt awaiting that field.
- **advance** — evidence satisfies the node → follow the `cgt_edge` whose `condition` matches the classified value.
- **act** — node `kind='leaf'` → emit `action` (`GUIDE|OBSERVE|STABILIZE_TRANSFER|ABSTAIN_STOP`) + `cgt_strings.recommendation` + citations.

**Safety meta-rules `safety.py` (S1–S6)** — enforced as code, can override a leaf:
S1 completeness gate (cannot terminate while a `required` critical field is missing) · S2 contradiction guard (incl. cross-time pupil/GCS reversal) · S3 out-of-tree guard (any out-of-protocol/out-of-range input → ABSTAIN) · S4 monotonic escalation (never downgrade severity mid-encounter) · S5 unmeasured ≠ excluded (e.g. mannitol withheld if extracranial causes not excluded) · S6 pediatric scope gate (age < 15 → L98 abstain, adult thresholds void).

**Graduated-assistance mode badge (🟢/🟡/🔴)** — computed from **structure + coverage, never model confidence**:
- 🟢 reached a guideline-sanctioned leaf AND retrieval covers it;
- 🟡 exact leaf not reached / partly out-of-tree BUT related cited knowledge exists → grounded principles, labeled extrapolated;
- 🔴 only the two irreducible cases: where-to-cut/localization (needs imaging) or invalid/contradictory input.
Badge confidence = `retrieval_match × source_trust_tier` (data, not the model).

**Narrator plug:** `NullNarrator` returns the raw leaf/citations (used for all deterministic scoring — classification of an operator answer is done by a deterministic value-parser for vignettes, since vignette inputs are already structured). `QwenNarrator` does the four I/O jobs (clean ASR, classify free-text answer, phrase question, synthesize cited recommendation) — used only for I/O-quality scoring + LLM arms.

**Bundle load + verify (the seam):** `loader.py` verifies via `signing.verify` against the **`kyro-canon-v1`** canonical-digest rule (row-walk byte stream, embeddings excluded / vec-id "belt" signed; Python↔JS portable — mirrors Gowrish's `bundleLoader.ts`) and refuses on signature failure or embedder/dim/sqlite-vec mismatch.

---

## 4. Component — bundle pipeline ④ (mostly built; finish for real corpus)

Existing (`cloud/kyro_bundle/`): `schema.py`, `embedders.py` (Hash | BGE-M3), `signing.py` (kyro-canon-v1), `graphrag_io.py`, `sources.py`, `build_bundle.py` (C5), `verify.py`, `bundle_writer.py`. Remaining work:

1. **Corpus prep** → `cloud/graphrag/input/` as `.txt` whose **filename stems match `sources.py`** keys. Sources (per readiness recon): docs `09–14` (academic / clinical-management / context / LMIC / Peshawar — ~12k lines cited prose), the Peshawar Recommendations PDF, Wilson 2012 (CC-BY burr-hole), open companions. **Must include the general-stabilization frameworks** (trauma ABCs, raised-ICP, secondary-injury prevention) so 🟡 has knowledge to retrieve.
2. **Extraction** = GraphRAG with **Claude via a LiteLLM OpenAI-compatible gateway** (`settings.yaml` `api_base` → gateway; embeddings discarded — we embed with BGE-M3 in C5).
3. **Compile** = existing `build_bundle.py` → BGE-M3 1024-d → ingest `spine/edh-cgt.sql` → `kyro-canon-v1` sign → `edh-core-v1.kyro`.
4. **Trust-tier discipline:** NICE-NG232 / BTF-4th-Ed-derived content stays **tier-1 `[VERIFY]`** (the spine already flags it; the badge weights tier). `sources.py` registry completed with page-level citations as corpus lands.

---

## 5. Component — `kyro_harness`

```
kyro_harness/
  vignettes.py   docs/19 (38) + docs/21 (TA-1..8) → structured Case objects
  score.py       6 metrics + coverage/helpfulness + directional confusion matrix
  ablation.py    the 4-arm ladder runner
  report.py      render charts (spine-ablation collapse, confusion matrix) + a JSON results dump
```

**Case schema** (`vignettes.py`): `{id, prose, evidence{gcs_e/v/m, pupils, sbp, age, mechanism, lucid, …}, expected_action, expected_mode, must_abstain: bool, source_node_path?}`. **Methodological safeguard — blind encoding:** the `evidence` object is transcribed from the vignette's *clinical facts only*, never from its expected answer; the spine then decides. (Prevents the circularity of hand-fitting evidence to the target leaf.)

**Metrics** (`score.py`), each a delta vs a named baseline:
1. Triage accuracy (operate-vs-transfer) ≥80% exact / ≥90% within-safe-band + **directional confusion matrix** (errors must cluster safe/transfer).
2. Info-gathering completeness ≥0.90 (MedKGEval history-taking 0–2).
3. Guideline-concordance + citation-faithfulness ≥90% on critical-path steps.
4. **Abstention accuracy + coverage** — ≥95% must-abstain recall **on the irreducible set** (where-to-cut / invalid input) PAIRED with **coverage/helpfulness** = % of cases given grounded 🟢/🟡 vs forwarded empty-handed; + false-abstention rate + AUROC vs the ~0.5 confidence baseline.
5. vs unaided generalist: +20–25 pts.
6. vs generic LLM = the ablation ladder.

**Ablation ladder** (`ablation.py`), all on the 38 vignettes:

| Arm | Config | Runs where |
|---|---|---|
| 1 | bare Qwen, no bundle/spine | GPU (Gowrish / small local Qwen) |
| 2 | Qwen + graph retrieval, no spine | GPU |
| 3 | **spine executor (NullNarrator)** | **Aniket, no GPU** |
| 4 | **spine + safety gate** | **Aniket, no GPU** |

`report.py` emits the **spine-ablation collapse chart** (action-accuracy + harm-rate across arms) and the confusion matrix. Forkable scoring scaffolding: **medLLMbenchmark (MIT)**.

---

## 6. Data flow

```
corpus(.txt) ──GraphRAG+Claude──▶ parquet ──build_bundle(BGE-M3, sign)──▶ edh-core-v1.kyro
                                                                              │
vignettes(docs/19,21) ──vignettes.py──▶ Case[ ] ──▶ kyro_harness ──drives──▶ kyro_engine.loader→executor
                                                          │                          │
                                                          ▼                          ▼
                                              score.py (metrics) ◀──KyroResult──── (leaf, action, mode, cites)
                                                          │
                                                          ▼
                                        report.py → collapse chart + confusion matrix + results.json
```

**Parity loop (Gowrish):** same `edh-core-v1.kyro` + same `Case[]` → his RN E3 → assert identical `leaf_id`/`action` per case. Divergence = a spine-executor bug on one plane.

---

## 7. Error handling & edge cases

- **Bundle invalid** (signature fail / embedder-dim / sqlite-vec mismatch) → `loader.py` refuses, hard error (never silently run on an unverified bundle).
- **Engine:** missing required field → ask (halt); contradiction → S2 abstain; out-of-range/out-of-tree → S3 abstain; can't-terminate-while-critical-missing → S1.
- **Known answer-key gaps (from recon):** C11 (spinal-cord injury) currently routes OBSERVE instead of immobilize-abstain — **mark expected-as-authored + flag in the report** (do not silently "fix" the spine; mentor decision). Borderline B/D calls flagged for mentor sign-off.
- **BGE-M3 runtime parity (the #1 killer):** a fixture test asserts cosine ≈ 1.0 between our `BgeM3Embedder` and llama.rn's BGE-M3 on identical strings; ship the fixture to Gowrish (E0/E2).
- **No silent caps:** if any arm is skipped (e.g. LLM arms pending GPU), `report.py` states it explicitly so "deterministic-only" never reads as "full ladder."

---

## 8. Testing strategy

- **engine unit tests:** one per safety rule (S1–S6 fire on crafted evidence); golden-path traversal asserts TA-1…TA-8 reach their `docs/21` leaves.
- **bundle:** existing `--selftest` (fabricated parquet) + `verify` round-trip under kyro-canon-v1 (green today).
- **harness regression:** run all 38; assert the deterministic arm reproduces the `docs/21` coverage table (**37/38 safe leaves, 0 harm**). A deviation = an encoding or executor bug.
- **parity:** the same 38 through Gowrish's RN engine → identical leaves.

---

## 9. Scope / cut-lines (2-day commit)

- **MUST (Aniket, GPU-free):** `kyro_engine` + deterministic harness (metrics 1–4 + coverage) + ablation arms 3–4 + real `edh-core-v1.kyro`.
- **SHOULD:** LLM arms 1–2 (Gowrish GPU / small local Qwen) → completes the ladder + the "vs generic LLM" number + citation-faithfulness with a real narrator.
- **STRETCH:** MedKGEval-style multi-turn dialogue sim (model plays the operator) + Tier-B synthetic generation.

---

## 10. Ownership & compute

Aniket owns `kyro_engine`, `kyro_harness`, and the **real** `edh-core-v1.kyro`. Per the agreed split, **Gowrish owns mock-bundle rebuilds** (`edh-core-v0-mock.kyro`) — different filename, no collision. Deterministic arms run on Aniket's laptop; LLM arms hand off to Gowrish's supercomputer (he also runs Tier-C MIMIC). The harness *code* is Aniket's deliverable; the GPU *runs* are Gowrish's.

---

## 11. Risks / open questions

- **BGE-M3 FlagEmbedding ↔ llama.rn parity** (pooling/normalization) — retire early via the cosine fixture.
- **Corpus gaps** — NICE NG232 / BTF-4th full text absent; build with present sources, those nodes stay tier-1 `[VERIFY]`.
- **Mentor sign-off** — borderline B/D vignettes + the C11 spinal gap need a neurosurgeon's confirmation before the numbers are "signed."
- **LLM-arm model choice** — small local Qwen (Aniket can run, slower) vs Gowrish's GPU; decided when arms 1–2 are scheduled.
- **Single-rater N≈38** — name it as a limitation first (PROBAST discipline); Tier-A vs Tier-C reported as two distributions, never pooled.

---

## 12. Forkable components

medLLMbenchmark (MIT — scoring/triage scaffolding + MIMIC extraction), MedKGEval (multi-turn harness + ablation-chart pattern, stretch), MedRAG (1/degree-centrality question ordering), UQ survey (cite *against ourselves* for the AUROC≈0.5 argument).
