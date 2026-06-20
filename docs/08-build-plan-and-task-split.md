# 08 — Build Plan & Task Split (Kyro v1)

**Purpose:** the working build spec for a **2-person team** (Aniket + Gowrish), side-by-side, building a *real, deployable, end-to-end* Kyro v1. Not the pitch — the engineering plan. Product context: [07-kyro-product-and-pitch.md](07-kyro-product-and-pitch.md). Architecture: [05-architecture.md](05-architecture.md). Stack rationale: [06-tech-stack.md](06-tech-stack.md).

**Timeline posture:** built to be hammered out in a tight 2-day sprint, fully parallel; extends gracefully over a few weeks for the hardening passes (fine-tune metrics, portal polish, escalation).

---

## 0. The shape in one paragraph

Two planes that meet at exactly one interface. **Cloud (Aniket):** experts upload knowledge → de-identify → **Microsoft GraphRAG** builds a provenance-tagged knowledge graph → compile + **sign** a versioned **knowledge bundle** → serve it. **Edge (Gowrish):** an **offline React Native** app loads the signed bundle, runs **local-search retrieval** over it, and a small **on-device LLM** *reasons over* the bundle to produce **traceable, abstaining** guidance — every recommendation shows its supporting sources, flags what's established guideline vs. model inference, reports confidence, and **abstains/defers when out of its depth** — with a **procedure state machine** that never loses its place when the call drops. The single interface between them is **the bundle** (§1). Nail that contract in hour one and the two halves build independently.

---

## 1. THE SEAM — the knowledge-bundle contract (lock this first, together)

A single signed **SQLite file** — `edh-core-v{N}.kyro`. It is the *entire* interface between cloud and edge. Cloud emits it; the app consumes it. Agree on this schema in hour one; both sides code against it.

```sql
-- one row; the app REFUSES a bundle whose embedder/dim/sqlite-vec don't match its own
CREATE TABLE manifest (
  bundle_id TEXT, version INTEGER, scope TEXT,           -- scope = "edh-core"
  embedder_id TEXT, embedder_dim INTEGER,                -- "bge-m3", 1024
  lang TEXT,                                             -- "en" | "ur"
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

**The four fields that silently break everything if not pinned in hour one:**
1. **`embedder_id` + `embedder_dim`** — **BGE-M3, 1024-d, byte-identical model on both planes.** GraphRAG defaults to OpenAI embeddings → **must be overridden to BGE-M3 in `settings.yaml`**, or the cloud index lives in a different vector space than the offline phone and retrieval returns garbage. *This is the #1 project-killing gotcha.*
2. **`source_citation`** — the app renders it as the **provenance** behind a recommendation. *Cited ≠ traceable:* the goal isn't to quote the KG verbatim, it's that every recommendation is **auditable** back to its supporting sources — the "glass box, not black box" story.
3. **`trust_tier`** — `0` gates 🟢 Protocol mode, `1` gates 🟡 Principles. Assigned at ingestion by source (canonical guideline vs. expert upload).
4. **`sqlite_vec_version`** — identical both sides or the vector index won't open.

**Hour-one deliverable:** Aniket hand-writes a **5–10-chunk mock `edh-core` bundle** matching this schema so Gowrish is *never blocked* waiting on the real pipeline.

---

## 2. Ownership

| Plane | Owner | Why |
|---|---|---|
| **Cloud platform** (ingestion → GraphRAG → signed bundles → portal → deploy) | **Aniket** | Cloud experience; home turf |
| **Edge app + on-device ML** (RN app, on-device LLM/embeddings/voice, retrieval, state machine, fine-tune) | **Gowrish** | ML knowledge; owns on-device model |

Asymmetry to manage: **Gowrish holds the riskiest work** (new platform + on-device ML). The E0 spike (§4) front-loads that risk; Aniket pairs in if E0 wobbles.

---

## 3. Components

### CLOUD — Aniket (deployed for real)
| # | Component | Stack | Notes |
|---|---|---|---|
| C1 | Ingestion API (upload → parse → chunk) | FastAPI + PyMuPDF | |
| C2 | De-identify | Microsoft Presidio (text) | scrub PHI before content enters KG |
| C3 | **Graph build** | **Microsoft GraphRAG** + strong open LLM (on supercomputer) + **BGE-M3 embeddings** | run indexing on the supercomputer (free, private, fast); **override embeddings to BGE-M3** |
| C4 | Master store | **Supabase** (Postgres + pgvector) | accounts, provenance, trust-tier, review state |
| C5 | **Bundle compiler** → sign → object storage | custom: GraphRAG parquet → SQLite/sqlite-vec → **ed25519 sign** → Supabase Storage / R2 | the §1 artifact |
| C6 | Distribution endpoint (`/bundles/latest?scope=edh-core`) | FastAPI | delta sync is post-MVP; full-bundle download first |
| C7 | **Expert portal** (signup, upload, request board, review queue) | **Next.js on Vercel** + Supabase Auth | the live "neurosurgeon uploads → flows to device" demo (category 3 & 4) |
| C8 | **Synthetic-data generator** (for the fine-tune) | script: strong LLM over the GraphRAG corpus → `{context → ideal cited-JSON}` + gap/refusal cases | **cross-team handoff to Gowrish** |

### EDGE — Gowrish (offline React Native)
| # | Component | Stack | Notes |
|---|---|---|---|
| E0 | **SPIKE (do first):** model runs on the real phone | `llama.rn` + Qwen GGUF | measure tokens/sec + peak RAM; confirm `op-sqlite` loads the **sqlite-vec** extension on Android |
| E1 | Bundle loader (download/sideload, **verify signature**, open) | `op-sqlite` + sqlite-vec | reject on embedder/version mismatch |
| E2 | **Retrieval — GraphRAG local search** over the bundle | BGE-M3 embedding via `llama.rn` (`embedding:true` ctx) + sqlite-vec NN + graph expansion | algorithm below |
| E3 | **Synthesis (reasoning + provenance)** | Qwen-4B Q4 via `llama.rn` `completion()` with **`response_format: json_schema`** | structured JSON: `{mode, confidence, reasoning, steps:[{text, basis:'guideline'\|'inference', sources:[chunk_id], trust_tier}]}` — model may reason/extrapolate, but each step is **labeled** sourced-vs-inferred |
| E4 | **Abstention gate** → 🟢/🟡/🔴 | confidence × grounding × **stakes/reversibility** (doc 05) | the "knows when it doesn't know" feature; governs *whether it's safe to act on* the model's reasoning |
| E5 | **Procedure state machine** + handoff brief | local state object updated from input stream | the core innovation (doc 05 §5) |
| E6 | Voice: ASR in / TTS out | `whisper.rn` + OS TTS (Piper-RN as stretch) | hands-free; can land in Block 3 |
| E7 | Demo UX (HM EDH flow, WiFi-off, Urdu toggle, gap case) | React Native | |
| E8 | **Fine-tune track** (see §5) | **Unsloth** QLoRA → GGUF | swap stock Qwen for custom model + produce the validation numbers |

**On-device retrieval (E2, GraphRAG local-search style):**
1. `q = bge_m3.embed(query)` (llama.rn embedding context)
2. nearest **nodes** via `node_vec` (k≈8) + nearest **chunks** via `chunk_vec` (k≈12)
3. **expand**: `edges` of candidate nodes → neighbor nodes → their chunks; + `community_reports` for those nodes' communities (shipped pre-computed = GraphRAG's hierarchical advantage, free on-device)
4. assemble context; **prefer `trust_tier=0` on the critical path**
5. **gap check (E4):** entity coverage (do retrieved nodes cover the query's key entities?) + max similarity + grounding → sets 🟢/🟡/🔴
6. `completion(json_schema)` → reasoned steps, each **labeled `guideline` (sourced) or `inference` (model reasoning)** with supporting `sources`
7. **attach provenance + gate by stakes**: link each step to its supporting chunks; the **abstention gate (E4)** — *not* a cite-or-drop rule — decides safety: extrapolation is allowed for low-stakes reversible advice; **abstain on irreversible high-stakes actions when grounding/confidence is weak**
8. render with citations + mode banner; update E5 state machine

**RAM budget (8 GB target phone):** Qwen-4B Q4 (~2.7 GB) + BGE-M3 (~0.4 GB) + whisper-small (~0.5 GB) ≈ 3.5–4.5 GB live. Use `llama.rn` quantized KV cache (`cache_type_k/v: 'q8_0'`). On a 6 GB phone, drop to a 2B LLM. **Final pick decided at E0 by measuring on the real device.**

---

## 4. The sprint — ordered blocks (parallel; fits 2 days)

**Block 0 — Contract + de-risk (first few hours, together)**
- Lock the §1 SQLite contract; write it down.
- **Gowrish: E0 spike** — Qwen on the real phone via llama.rn (speed + RAM); sqlite-vec loads on Android. *If it won't fit/perform, change the model/runtime HERE.*
- **Aniket:** scaffold C1 + C4 + C7; get a "hello world" **deployed live**; hand-build the mock bundle (§1).

**Block 1 — Parallel core (the bulk)**
- **Aniket:** C1→C6 — a real signed `edh-core` bundle landing in storage (GraphRAG indexed with BGE-M3 on the supercomputer).
- **Gowrish:** E1→E5 over the **mock bundle** — load → retrieve → cite → synthesize → defer → state machine. Neither waits on the other.

**Block 2 — Integration (together)**
- Aniket's **real** bundle → Gowrish's app loads it → end-to-end on real data. Side-by-side = contract mismatches die in minutes. *Milestone: one product, not two demos.*

**Block 3 — Wow + polish + hardening**
- Voice (E6); the **WiFi-off** moment; Urdu toggle; the **gap → defer → handoff-brief** demo; portal live for a judge to upload and watch it reach the device.
- **Swap in the fine-tuned model (E8)** + run the validation benchmark (§5).
- Escalation: simulated by default; real masked-WhatsApp (Twilio) only if time remains.

---

## 5. The fine-tune track (Gowrish; supercomputer + Unsloth)

Train the model into a **competent, abstaining, transparent reasoner.** Domain competence is fine — the model **may reason and extrapolate** (2026 small models are good enough). Safety is relocated from rigid cite-or-drop to the real triad: **abstention** (defers when out of depth or on irreversible actions with weak grounding), **traceability** (every recommendation shows supporting sources + flags inference vs. guideline), **transparency** (exposes confidence + reasoning). The KG's job is **currency, provenance, and traceability** — *and it stays the update path + the moat* (you ship knowledge as signed data bundles, not retrained models, because guidelines change and weights can't cite themselves). Each fine-tune below produces a number MD judges respect.

| # | Target | Fixes | The number | Data | Priority |
|---|---|---|---|---|---|
| 1 | **Generator SFT — domain reasoning + provenance + abstention** (Qwen-4B) | competent reasoning that **labels inference vs. guideline**, attaches sources, and **abstains on weak grounding / irreversible actions** | **abstention accuracy**, attribution/grounding accuracy, JSON-valid % | synthetic `{context→reasoned-JSON}` + gap/abstention cases (C8) | **HIGH — first** |
| 2 | **Confidence / gap classifier** | replaces heuristic thresholds; calibration on small models is hard | **calibration / AUROC** | labeled covered/uncovered (C8) | **HIGH** |
| 3 | **BGE-M3 domain fine-tune** | sharper EDH retrieval | **recall@k** vs stock | synthetic query↔passage | MED — *must re-index cloud with the same fine-tuned embedder* |
| 4 | **Urdu-medical whisper fine-tune** | code-switched medical Urdu ASR | **WER** | TTS-bootstrapped audio | MED / roadmap |

**Pipeline:** Unsloth QLoRA → merge → **GGUF export (`q4_k_m`)** with **imatrix computed on the medical corpus** → load in `llama.rn`.
**Quantization rule:** **benchmark the shipped Q4 GGUF on-device**, not the bf16 checkpoint — 4-bit quantization can erode the refusal/format behaviors you just trained in. Consider **Q5_K_M** if RAM allows.
**Sprint posture:** ship **stock Qwen-4B + JSON-schema constraint** first (safe baseline); swap the fine-tuned model in Block 3. The before/after on the quantized artifact *is* the category-4 evidence.

---

## 6. Deploy targets (all deploy in minutes; Aniket's wheelhouse)

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
| On-device LLM too slow / won't fit | **E0 spike first**; 2B + Q5/Q4 fallbacks; quantized KV cache |
| **Embedder mismatch** cloud vs edge | manifest pins `embedder_id`/dim; app refuses mismatch; GraphRAG forced to BGE-M3 |
| sqlite-vec won't load in RN | confirm `op-sqlite` extension loading in E0; fallback: pure-Dart/JS ANN or bundled native module |
| Quantization erodes safety behavior | benchmark the **shipped GGUF on-device**; imatrix on medical corpus |
| EDH knowledge content quality | start from canonical sources (WHO / WFNS-Peshawar / BTF); mentor-neurosurgeon sign-off; content work runs parallel to code |
| Fine-tune slips the sprint | stock model is the baseline; fine-tune is a swap, not a dependency |

---

## 8. Validation artifacts (category 4 — what we show the judges)

1. **Abstention accuracy** on held-out gap / out-of-scope cases (the confident-but-wrong machine, solved — with a number).
2. **Attribution / grounding accuracy** + JSON-valid % (every recommendation is traceable to supporting sources; inference is labeled, not hidden).
3. **Before/after** stock vs fine-tuned, **on the quantized on-device artifact**.
4. **Retrieval recall@k** on EDH queries.
5. **Mentor-neurosurgeon guideline-concordance sign-off** on the `edh-core` bundle.
6. The **WiFi-off** end-to-end demo + the **gap → defer → pre-briefed handoff** demo.

---

## 9. Open items

- **Test phone RAM** → picks 2B vs 4B and Q4 vs Q5 (resolved at E0).
- **Cloud platform** — Supabase recommended for all-in-one speed; Aniket's call.
- How aggressively to attempt real masked-WhatsApp escalation vs. simulate it in v1.
- Delta sync vs. full-bundle download (full first; delta is post-MVP).
