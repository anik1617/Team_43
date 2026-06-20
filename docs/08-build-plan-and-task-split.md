# 08 — Build Plan & Task Split (Kyro v1)

**Purpose:** the working build spec for a **2-person team** (Aniket + Gowrish), side-by-side, building a *real, deployable, end-to-end* Kyro v1. Not the pitch — the engineering plan. Product context: [07-kyro-product-and-pitch.md](07-kyro-product-and-pitch.md). Architecture: [05-architecture.md](05-architecture.md). Stack rationale: [06-tech-stack.md](06-tech-stack.md). Prior art / feasibility: [09-prior-art-and-feasibility.md](09-prior-art-and-feasibility.md).

> **Ownership note:** Gowrish now owns the **whole repo**. The cloud/edge split below is kept as a *work-decomposition* device (two planes, one seam) so the build can still be parallelized, but there is a single owner. Where "Aniket" / "Gowrish" appear they denote the two work-streams, not separate repos.

**Timeline posture:** built to be hammered out in a tight 2-day sprint, fully parallel; extends gracefully over a few weeks for the hardening passes (benchmark numbers, portal polish, escalation). **English only** in v1.

---

## 0. The shape in one paragraph (the INVERSION)

Kyro is **neuro-symbolic**: a deterministic clinical brain that the language model serves, not a model that reasons on its own. **The brain is the L1 reasoning spine** — a hand-authored, mentor-signed **deterministic clinical guidance tree (CGT)** in MedDM "IEET" format, executed by a CDM-style loop where **code** decides traversal (advance / act / ask). The spine sits in **veto position over the model**. **The L2 knowledge layer** is a small, curated, source-cited GraphRAG bundle built offline. **The L3 language layer is I/O only — a mouth, not a brain:** a small on-device model does four narrow jobs (clean ASR text, classify the operator's answer at each node, phrase the next question, synthesize the final cited recommendation from the reached leaf) and **nothing load-bearing on the critical path.** Around the spine lives the **procedure state machine** — the working-memory object `<evidence, hypotheses, trajectory>` — which is the **continuity primitive**: a dropped call loses nothing, and any reconnection auto-generates a pre-briefed expert handoff. The single interface between the cloud build and the edge app is **the bundle** (§1). Nail that contract in hour one and the two halves build independently.

---

## 1. THE SEAM — the knowledge-bundle contract (lock this first, together)

A single signed **SQLite file** — `edh-core-v{N}.kyro`. It is the *entire* interface between cloud and edge. The build pipeline emits it; the app consumes it. Agree on this schema in hour one; both sides code against it.

```sql
-- one row; the app REFUSES a bundle whose embedder/dim/sqlite-vec don't match its own
CREATE TABLE manifest (
  bundle_id TEXT, version INTEGER, scope TEXT,           -- scope = "edh-core"
  embedder_id TEXT, embedder_dim INTEGER,                -- "bge-m3", 1024
  lang TEXT,                                             -- "en" (v1; "ur" is roadmap)
  graphrag_version TEXT, sqlite_vec_version TEXT,
  created_at TEXT, signature TEXT, signer_pubkey TEXT    -- ed25519
);

-- citeable source text = GraphRAG text_units + community_reports
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  kind TEXT,                 -- 'text_unit' | 'community_report'
  text TEXT,
  source_citation TEXT,      -- "WFNS Peshawar Recommendations 2019, p.4"  (RENDERED in-app)
  source_doc_id TEXT,
  trust_tier INTEGER         -- 0 = canonical | 1 = provisional/expert
);
CREATE VIRTUAL TABLE chunk_vec USING vec0(chunk_id TEXT, embedding FLOAT[1024]);

-- GraphRAG entities + description embeddings
CREATE TABLE nodes (id TEXT PRIMARY KEY, name TEXT, type TEXT, description TEXT, trust_tier INTEGER);
CREATE VIRTUAL TABLE node_vec USING vec0(node_id TEXT, embedding FLOAT[1024]);

-- GraphRAG relationships
CREATE TABLE edges (src_id TEXT, dst_id TEXT, relation TEXT, weight REAL, source_chunk_id TEXT);

-- community membership, for local-search expansion + shipped community summaries
CREATE TABLE node_community (node_id TEXT, community_id TEXT, level INTEGER);
```

> The CGT spine (§3, L1) is authored and versioned as its own signed asset and travels alongside / inside the same bundle. The L2 graph above is the **evidence layer the spine and the synthesis step cite** — it does not by itself decide anything.

**The four fields that silently break everything if not pinned in hour one:**
1. **`embedder_id` + `embedder_dim`** — **BGE-M3, 1024-d, BYTE-IDENTICAL model on both planes.** GraphRAG defaults to OpenAI embeddings → **must be overridden to BGE-M3 in `settings.yaml`**, or the cloud index lives in a different vector space than the offline phone and retrieval returns garbage. *This is the #1 project-killing gotcha.*
2. **`source_citation`** — the app renders it as the **provenance** behind a recommendation. *Cited ≠ traceable:* the win is **auditability** — every recommendation traces back to its supporting sources and flags inference — the "glass box, not black box" story. (Use MedGraphRAG's Triple-Graph idea — entity/source/definition — to make citations first-class.)
3. **`trust_tier`** — `0` = canonical guideline-grade (preferred on the critical path), `1` = provisional/expert. Assigned at ingestion by source.
4. **`sqlite_vec_version`** — identical both sides or the vector index won't open.

**Hour-one deliverable:** hand-write a **5–10-chunk mock `edh-core` bundle** matching this schema so the edge work-stream is *never blocked* waiting on the real pipeline.

---

## 2. Ownership

Single repo owner: **Gowrish.** Two parallel work-streams during the sprint:

| Plane | Work-stream | Why |
|---|---|---|
| **Cloud platform** (ingestion → GraphRAG → signed bundles → portal → deploy) | Aniket | Cloud experience; home turf |
| **Edge app + spine + on-device I/O** (RN app, CGT spine executor, on-device model as I/O, embeddings/voice, retrieval, state machine) | Gowrish | ML knowledge; owns on-device runtime; owns the repo |

Asymmetry to manage: **the edge stream holds the riskiest work** (new platform + on-device model + the spine executor). The E0 spike (§4) front-loads that risk; the cloud stream pairs in if E0 wobbles.

---

## 3. Components

### THE FIRST ARTIFACT — L1 Clinical Guidance Tree (do this before any code)

The acute-TBI / EDH **Clinical Guidance Tree** is the **credibility core and the benchmark answer key**, so it is built first and **mentor-signed**.

| # | Component | Stack / Method | Notes |
|---|---|---|---|
| L1a | **Author the CGT** | MedDM **IEET** format; one acute-TBI/EDH triage tree | every node carries a **Peshawar / BTF citation**; covers structured evidence-gathering (GCS, pupils, BP, lucid interval, lateralizing signs, mechanism, time-since-injury) → stabilization + secondary-injury prevention + the **operate-vs-transfer** decision; leaves include explicit **abstain/transfer** terminals |
| L1b | **Tree executor (CDM loop)** | code-driven traversal: **advance / act / ask** | **code decides traversal; the model never does.** The spine is in **veto position over the model.** |
| L1c | **Working-memory object** | `<evidence, hypotheses, trajectory>` | this *is* the procedure state machine (E5) and the continuity primitive |
| L1d | **Mentor sign-off** | physician/neurosurgeon review | guideline-concordance sign-off → doubles as the benchmark key |

This spine is the highest-leverage component in the project. Everything else exists to feed it inputs and to phrase its outputs.

### CLOUD — Aniket (deployed for real)
| # | Component | Stack | Notes |
|---|---|---|---|
| C1 | Ingestion API (upload → parse → chunk) | FastAPI + PyMuPDF | |
| C2 | De-identify | Microsoft Presidio (text) | scrub PHI before content enters KG |
| C3 | **Graph build** | **Microsoft GraphRAG** + strong open LLM (on supercomputer) + **BGE-M3 embeddings** | run indexing on the supercomputer (free, private, fast); **override embeddings to BGE-M3**. A **160-node-class graph is proven sufficient** — do not over-build. |
| C4 | Master store | **Supabase** (Postgres + pgvector) | accounts, provenance, trust-tier, review state |
| C5 | **Bundle compiler** → sign → object storage | custom: GraphRAG parquet → SQLite/sqlite-vec → **ed25519 sign** → Supabase Storage / R2 | the §1 artifact; bundles the L1 CGT + L2 graph |
| C6 | Distribution endpoint (`/bundles/latest?scope=edh-core`) | FastAPI | delta sync is post-MVP; full-bundle download first |
| C7 | **Expert portal** (signup, upload, request board, review queue) | **Next.js on Vercel** + Supabase Auth | the live "neurosurgeon uploads → flows to device" demo (category 3 & 4) |
| C8 | **Synthetic dialogue generator** (Tier-B eval + future fine-tune fuel) | AMIE-style self-play over the GraphRAG corpus → multi-turn `{encounter → traversal → cited recommendation}` + abstain cases | engineering/regression use only (see §5); **cross-stream handoff to Gowrish** |

### EDGE — Gowrish (offline React Native)
| # | Component | Stack | Notes |
|---|---|---|---|
| E0 | **SPIKE (do first):** model runs on the real phone | `llama.rn` + **Qwen-4B-Q4** GGUF | measure tokens/sec + peak RAM; confirm `op-sqlite` loads the **sqlite-vec** extension on Android |
| E1 | Bundle loader (download/sideload, **verify signature**, open) | `op-sqlite` + sqlite-vec | reject on embedder/version mismatch |
| E2 | **Retrieval — GraphRAG local search** over the bundle | BGE-M3 embedding via `llama.rn` (`embedding:true` ctx) + sqlite-vec NN + graph expansion | algorithm below; used to **cite** the spine's nodes and the final synthesis |
| E3 | **Spine executor + L3 I/O** | **code-driven CGT traversal** (L1b) calling **Qwen-4B-Q4 via `llama.rn`** only for the four narrow I/O jobs | the model **fills the tree, it does not reason the tree**: (1) clean ASR text, (2) classify the operator's answer at the current node, (3) phrase the next question, (4) synthesize the final **cited** recommendation from the reached leaf via `response_format: json_schema`. Use **MedRAG discriminability (1/degree-centrality)** to order questions with **no LLM call**. |
| E4 | **Abstention gate** → 🟢/🟡/🔴 | **deterministic rules, NOT model confidence** | gate fires on: (a) the tree reaching a guideline-sanctioned leaf, (b) **hard out-of-bounds rules** (missing required inputs, contradictory vitals, out-of-protocol values, any out-of-tree input), (c) **"cannot terminate while critical evidence is missing."** Model confidence is a **weak secondary flag only** (AUROC ~0.5 — see §5). |
| E5 | **Procedure state machine** + handoff brief | the L1c working-memory object, updated from the input stream | the core innovation ("continuity, not knowledge"); a dropped call loses nothing; reconnect auto-generates a pre-briefed handoff |
| E6 | Voice: ASR in / TTS out | `whisper.cpp`/`whisper.rn` + Piper / OS TTS | hands-free; **read-back confirmation of every critical field** before it enters the tree (anti-sycophancy: "I heard left pupil fixed, correct?"). English only. |
| E7 | Demo UX (HM EDH flow, WiFi-off, gap → abstain → handoff) | React Native | Urdu toggle is **roadmap**, not v1 |

**On-device retrieval (E2, GraphRAG local-search style):**
1. `q = bge_m3.embed(query)` (llama.rn embedding context)
2. nearest **nodes** via `node_vec` (k≈8) + nearest **chunks** via `chunk_vec` (k≈12)
3. **expand**: `edges` of candidate nodes → neighbor nodes → their chunks; + `community_reports` for those nodes' communities (shipped pre-computed = GraphRAG's hierarchical advantage, free on-device)
4. assemble context; **prefer `trust_tier=0` on the critical path**
5. attach **citations** to the spine node currently in play and to the synthesized leaf recommendation
6. the **abstention gate (E4)** is evaluated **by the deterministic rules above** — not by a cite-or-drop heuristic and not by model confidence
7. render with citations + mode banner; update E5 state machine

**RAM budget (8 GB target phone):** Qwen-4B Q4 (~2.7 GB) + BGE-M3 (~0.4 GB) + whisper-small (~0.5 GB) ≈ 3.5–4.5 GB live. Use `llama.rn` quantized KV cache (`cache_type_k/v: 'q8_0'`). On a 6 GB phone, drop to a smaller model. **Final pick decided at E0 by measuring on the real device.**

### Forkable components (verify licenses where noted)
Build on proven work; do not reinvent the spine or the harness.

| Use | Source | License | What to take |
|---|---|---|---|
| **L1 spine** | **MedDM** (IEET + CDM) | (replicate) | the tree format + the traversal loop |
| RL/structured-trajectory harness | **Deep-DxSearch / DiagRL** `github.com/MAGIC-AI4Med/Deep-DxSearch` | Apache-2.0 | the verl GRPO QLoRA harness + the 5-action structured trajectory (for the *roadmap* fine-tune, not v1) |
| **L2 graph + citations** | **MedGraphRAG** `github.com/MedicineToken/Medical-Graph-RAG` | MIT | Triple-Graph (entity/source/definition) + U-Retrieval |
| Triage eval + MIMIC extraction | **medLLMbenchmark** `github.com/BIMSBbioinfo/medLLMbenchmark` | MIT | triage eval harness + MIMIC-IV extraction |
| Question ordering | **MedRAG** | verify | discriminability (1/degree-centrality) question-picker |
| Working memory + abstain rule | **ClinicalAgents** | — | the `<evidence,hypotheses,trajectory>` schema + "can't terminate while critical evidence missing" rule — **drop its MCTS** |
| Output stage + safety net | **Karamanlioglu, Appl. Sci. 2025** | — | 3-pass constrained-prompt output + rule-based herniation-escalate safety net the LLM cannot override |
| Multi-turn harness + ablation chart | **MedKGEval** | — | multi-turn harness + the **spine-ablation chart** |
| "confidence is near-random" argument | **UQ survey** arXiv:2602.05073 | — | cite AGAINST ourselves to justify rule-based abstention |
| Self-play data method | **AMIE** | method only | synthetic-dialogue generation method (do not claim parity with its numbers) |
| Decision-support framing | **Adil / Duke, World Neurosurgery 2022** | — | kilobyte elastic-net prognosis = "simple noninferior to deep learning" armor |

---

## 4. The sprint — ordered blocks (parallel; fits 2 days)

**Block −1 — The first artifact (before any code)**
- **Author + mentor-sign the L1 CGT spine (L1a–L1d).** This is the credibility core and the answer key. Nothing downstream is trustworthy without it.

**Block 0 — Contract + de-risk (first few hours, together)**
- Lock the §1 SQLite contract; write it down.
- **Gowrish: E0 spike** — Qwen-4B-Q4 on the real phone via llama.rn (speed + RAM); sqlite-vec loads on Android. *If it won't fit/perform, change the model/runtime HERE.*
- **Aniket:** scaffold C1 + C4 + C7; get a "hello world" **deployed live**; hand-build the mock bundle (§1).

**Block 1 — Parallel core (the bulk)**
- **Aniket:** C1→C6 — a real signed `edh-core` bundle landing in storage (GraphRAG indexed with BGE-M3 on the supercomputer).
- **Gowrish:** E1→E5 over the **mock bundle** — load → traverse the spine → ask/classify/cite → synthesize the leaf → abstain on boundary → state machine. Neither waits on the other.

**Block 2 — Integration (together)**
- Aniket's **real** bundle → Gowrish's app loads it → end-to-end on real data. Side-by-side = contract mismatches die in minutes. *Milestone: one product, not two demos.*

**Block 3 — Wow + polish + hardening**
- Voice (E6) with read-back confirmation; the **WiFi-off** moment; the **gap → abstain → handoff-brief** demo; portal live for a judge to upload and watch it reach the device.
- Run the validation benchmark (§5) — especially the **spine-ablation collapse chart**.
- Escalation: simulated by default; real masked-WhatsApp (Twilio) only if time remains — **roadmap**.

---

## 5. Validation / benchmark playbook (category 4 — "win with science")

Every metric is a **delta vs a named baseline.** Run all of it on the **supercomputer**, not the phone (the harness is MedKGEval-style multi-turn). **Stock Qwen-4B first — fine-tuning is demoted to roadmap** (a later I/O-behavior swap; the model is never the knowledge source).

**The six headline numbers (each a delta):**
1. **Triage accuracy** on operate-vs-transfer: **≥80% exact / ≥90% within-safe-band**, plus a **directional confusion matrix** (errors must cluster on the safe/transfer side).
2. **Info-gathering completeness ≥0.90** (MedKGEval history-taking 0–2 metric).
3. **Guideline-concordance AND citation-faithfulness ≥90%** on critical-path steps.
4. **Abstention accuracy: ≥95% must-abstain recall** (THE safety number) + an honest **false-abstention rate** + **AUROC vs the ~0.5 confidence baseline**.
5. **vs unaided generalist: +20 to +25 points.**
6. **vs generic LLM = the ablation ladder:** bare Qwen → +graph → +spine → +gate. **The single most persuasive artifact is the SPINE-ABLATION COLLAPSE chart** (Kyro with vs without the spine).

**Three eval tiers:**
- **Tier A — 30–50 mentor-signed EDH vignettes** (the HM case = #1 + the live demo; ~20 operate / ~10 transfer / ~10–20 must-abstain). **This is validation pillar #1.**
- **Tier B — AMIE-style self-play synthetic dialogues** (volume + fine-tune fuel). Reported as **engineering regression metrics ONLY — never headline.**
- **Tier C — MIMIC-IV head-trauma slice.** **START PhysioNet / CITI credentialing NOW** — it has days of lead time.

**Reporting discipline (PROBAST armor):**
- Report **calibration + abstention alongside accuracy.**
- Name **Tier A vs Tier C as two distributions** (don't pool them).
- **Replace BLEU / Jaccard / BERTScore** with concordance / triage / completeness / abstention metrics.
- **Honestly name N≈30 single-rater as a limitation first.**

---

## 6. Deploy targets (all deploy in minutes; cloud stream)

| Piece | Platform |
|---|---|
| Postgres + pgvector + Auth + Storage | **Supabase** |
| FastAPI ingestion + bundle compiler | container on **Railway / Render / Fly / Cloud Run** |
| GraphRAG indexing | **supercomputer** (batch) |
| Expert portal | **Next.js on Vercel** |
| Bundle object storage | Supabase Storage / Cloudflare R2 |

The payoff: a **live URL where a neurosurgeon uploads a protocol and watches it flow to an offline phone** — a thing no competitor can show.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| On-device model too slow / won't fit | **E0 spike first**; smaller-model + Q5/Q4 fallbacks; quantized KV cache |
| **Embedder mismatch** cloud vs edge | manifest pins `embedder_id`/dim; app refuses mismatch; GraphRAG forced to BGE-M3 |
| sqlite-vec won't load in RN | confirm `op-sqlite` extension loading in E0; fallback: bundled native module |
| **Treating the model as a reasoner** | **HARD RULE — the model is I/O only; the deterministic L1 spine reasons and sits in veto position.** A 4B model is not a reliable reasoner (a fine-tuned 8B scored 42% on USMLE; no 4B datapoint exists). |
| **Latency from "smart" inference** | **HARD RULE: NO multi-agent / NO MCTS / NO self-consistency on the critical path.** Multi-round runs ~70s/question on a *server* GPU = minutes/case on a phone. Reserve N=2–3 sampling for the **single operate-vs-transfer checkpoint only.** |
| Abstention gated on confidence (unsafe) | **Gate on the deterministic rules (E4), not model confidence** — confidence AUROC ≈ 0.5. |
| EDH knowledge content quality | start from canonical sources (WHO / WFNS-Peshawar / BTF); mentor-neurosurgeon sign-off; content work runs parallel to code |
| Fine-tune slips the sprint | **stock Qwen-4B is the v1 model**; fine-tune is roadmap, not a dependency |

---

## 8. Validation artifacts (what we actually show the judges)

1. The **spine-ablation collapse chart** (Kyro with vs without the L1 spine) — the single most persuasive artifact.
2. **Abstention accuracy** (≥95% must-abstain recall) + false-abstention rate + AUROC vs the ~0.5 confidence baseline.
3. **Triage accuracy** (operate-vs-transfer) + the **directional confusion matrix**.
4. **Guideline-concordance + citation-faithfulness** on critical-path steps; **mentor-neurosurgeon sign-off** on the `edh-core` bundle + the Tier-A vignettes.
5. **vs unaided generalist (+20–25 pts)** and the **ablation ladder** (bare Qwen → +graph → +spine → +gate).
6. The **WiFi-off** end-to-end demo + the **gap → abstain → pre-briefed handoff** demo (the continuity story, live).

---

## 9. Open items

- **Test phone RAM** → confirms Qwen-4B-Q4 vs a smaller model and Q4 vs Q5 (resolved at E0).
- **PhysioNet / CITI credentialing** for the Tier-C MIMIC-IV slice — start immediately (lead time).
- **Cloud platform** — Supabase recommended for all-in-one speed.
- How aggressively to attempt real masked-WhatsApp escalation vs. simulate it in v1 (escalation is roadmap).
- Delta sync vs. full-bundle download (full first; delta is post-MVP).
- Open-source KB lever — lean **hybrid** (open the Tier-0 canonical core; keep the contribution platform + provenance + gap-log as the moat); tied to the business model.
