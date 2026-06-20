# 06 — Tech Stack

Concrete tooling for the architecture in [05-architecture.md](05-architecture.md), organized by the three neuro-symbolic layers (**L1 reasoning spine** / **L2 knowledge** / **L3 language I/O**) plus the cloud build plane, the bridge, and the (roadmap) expert portal. **MVP-first:** each layer lists a primary pick, a fallback, and what we actually build this weekend. Currency checked mid-2026 (see Sources); **validate exact model versions at build time** — this space moves monthly.

**Guiding principles (from doc 05):**
- **The deterministic spine reasons; the model only talks.** L1 (a hand-authored clinical guidance tree, executed by code) sits in *veto* position over the model. L3 (the LLM) does four narrow I/O jobs and nothing load-bearing on the critical path.
- **The cloud does the heavy lifting** (graph build, de-ID); the device stays small and offline.
- **Knowledge ships as signed *data bundles*, not retrained weights.** The model may be re-trained for I/O *behavior* only (parsing/phrasing), never as the knowledge source.

---

## L1 — REASONING SPINE (the brain; the credibility core)

This is the cheapest, lowest-risk, highest-credibility component, and the first artifact we build. **No model runs here.** A hand-authored **deterministic clinical guidance tree (CGT)** drives the encounter; **code** decides traversal.

| Component | Pick | Why |
|---|---|---|
| **Tree format** | **MedDM "IEET"** clinical-guidance-tree format | each node carries a Peshawar/BTF citation; auditable, guideline-concordant; replicate the structure |
| **Traversal engine** | **CDM-style loop** (advance / act / ask) implemented in plain app code (TypeScript) | code decides the next move; the spine vetoes the model; deterministic and testable |
| **Working memory** | the `<evidence, hypotheses, trajectory>` object = the **procedure state machine** | the continuity primitive — survives a dropped call and auto-generates a pre-briefed handoff on reconnect |
| **Question ordering** | **MedRAG** discriminability (1 / degree-centrality) | order the evidence-gathering questions with **no LLM call** |
| **Safety gate** | rule-based: tree must reach a guideline-sanctioned leaf; hard out-of-bounds rules; "cannot terminate while critical evidence is missing" | **abstention is gated on the deterministic tree and hard rules — NOT on model confidence** (model confidence AUROC ≈ 0.5; weak secondary flag only) |
| **Read-back confirm** | app logic: confirm every critical field before it enters the tree | anti-sycophancy ("I heard left pupil fixed, correct?") |

The CGT is also the **benchmark answer key** (see doc 08). It is mentor-signed before anything else is built.

---

## L2 — KNOWLEDGE (the curated, source-cited graph)

A small curated GraphRAG graph, built on the **cloud build plane** (a cloud LLM API + light compute — **no supercomputer needed**), shipped as a **signed SQLite bundle**. A 160-node-class graph is proven sufficient for the EDH core.

| Layer | Primary pick | Why | Fallback |
|---|---|---|---|
| **Graph construction** | **Microsoft GraphRAG** (LOCKED) | LLM-built entities/relations + community summaries; do it once, cloud-side, where cost/size don't matter | — (this is the locked choice; do not substitute LightRAG) |
| **Citation model** | **MedGraphRAG** Triple-Graph (entity / source / definition) + U-Retrieval | gives every answer a traceable source; the auditability win | — |
| **Embeddings** | **BGE-M3** (1024-d) | **must be BYTE-IDENTICAL on both the build plane and the device** — the #1 project-killer if mismatched | — (consistency is non-negotiable) |
| **Vector + graph store** | **sqlite-vec** (vectors) + SQLite tables for nodes/edges | one embedded file, zero-server, ships in the bundle | — |
| **Bundle format** | signed SQLite: `edh-core-v{N}.kyro` (manifest + chunks + chunk_vec + nodes + node_vec + edges) | immutable, versioned, signed releases | — |

---

## L3 — LANGUAGE I/O ONLY (a mouth, not a brain)

The model does **four narrow jobs only**: (1) clean ASR text, (2) classify the operator's answer at each node, (3) phrase the next question, (4) synthesize the final cited recommendation from the reached leaf. **Nothing load-bearing on the critical path.**

| Layer | Primary pick | Why | Fallback |
|---|---|---|---|
| **App shell** | **React Native** (TypeScript) | one codebase Android+iOS; the on-device LLM/SQLite native modules below target RN | — |
| **LLM runtime** | **llama.rn** (llama.cpp for React Native, GGUF/Q4) | mature RN binding to llama.cpp; broadest hardware support | MLC-LLM, Cactus |
| **On-device LLM** | **Qwen-4B**, Q4 quant (`Qwen-4B-Q4`) | strong small-model coverage; **use STOCK Qwen-4B first** (fine-tuning is roadmap, a later swap) | Gemma 3 4B, Llama 3.2 3B, Phi-3 |
| **ASR (voice in)** | **whisper.cpp** | offline, mature | Voxtral Mini Transcribe; Vosk/Moonshine if footprint-critical |
| **TTS (voice out, hands-free)** | **Piper** / OS-native TTS | tiny, fast, fully offline — essential for sterile-hands OR use | Coqui-TTS |
| **SQLite bridge** | **op-sqlite** (React Native) loading **sqlite-vec** | high-performance on-device SQLite that can load the sqlite-vec extension; confirm on real Android in the E0 spike | — |

**Language scope:** **English FIRST.** Urdu is **roadmap** — on-device Urdu ASR is an unsolved research problem; do not promise it in v1.

**The model is I/O, not knowledge.** It is never the knowledge source: the graph (L2) holds knowledge, the spine (L1) holds reasoning. The flywheel improves *coverage* (the bundle), not the model.

**RAM budget (Q4):** Qwen-4B ≈ 2.5–3 GB · Whisper-small ≈ 0.5 GB · BGE-M3 ≈ 0.5 GB · Piper ≈ tiny · KG/vector bundle (sliceable). Fits an 8 GB device; runs on 8–10-year-old phones is the cost wedge — measure real tokens/sec + peak RAM in the E0 spike before committing.

---

## Forkable components (what to take, and the license)

Verify licenses before vendoring. These are the building blocks we adapt rather than write from scratch.

| Component | Repo / source | What to take | License |
|---|---|---|---|
| **MedDM (IEET + CDM)** | MedDM | the tree format + the traversal loop = the **L1 spine** | verify |
| **Deep-DxSearch / DiagRL** | github.com/MAGIC-AI4Med/Deep-DxSearch | the verl GRPO QLoRA harness + the 5-action structured trajectory | **Apache-2.0** |
| **MedGraphRAG** | github.com/MedicineToken/Medical-Graph-RAG | Triple-Graph (entity/source/definition) + U-Retrieval for **L2** | **MIT** |
| **medLLMbenchmark** | github.com/BIMSBbioinfo/medLLMbenchmark | the **triage eval harness** + MIMIC extraction | **MIT** |
| **MedRAG** | MedRAG | the **discriminability question-picker** (no-LLM question ordering) | verify |
| **ClinicalAgents** | ClinicalAgents | the working-memory schema + "can't terminate while critical evidence missing" abstain rule — **DROP the MCTS** | verify |
| **MedKGEval** | MedKGEval | the **multi-turn eval harness** + the **spine-ablation chart** | verify |
| **Karamanlioglu (Appl. Sci. 2025)** | paper | 3-pass constrained-prompt output stage + rule-based herniation-escalate safety net the LLM cannot override | n/a (method) |
| **UQ survey** | arXiv:2602.05073 | the "model confidence is near-random" argument (cited *against ourselves*) | n/a (citation) |
| **AMIE** | paper | the self-play **data-generation method only** (do not claim parity) | n/a (method) |
| **Adil / Duke (World Neurosurgery 2022)** | paper | the kilobyte elastic-net "simple is noninferior to deep learning" armor | n/a (citation) |

---

## CLOUD — the build plane (ingestion → graph → signed bundle)

Online and **light** — runs on normal cloud compute + a **cloud LLM API** for indexing; a ~160-node build needs **no supercomputer** (that's Gowrish's, reserved for the heavy evals/MIMIC/fine-tune). Owned by Aniket. Python (matches the repo's `.gitignore`).

| Layer | Primary pick | Why |
|---|---|---|
| **Backend** | **FastAPI** (Python) | fast, typed, standard for ML-adjacent services |
| **Doc ingestion** | **unstructured** + **PyMuPDF** | parse PDFs/DOCX/slides/images into clean chunks |
| **Graph construction** | **Microsoft GraphRAG** | LLM-built entities/relations + community summaries; do it once, cloud-side |
| **Embeddings (index)** | **BGE-M3** (1024-d, same as device) | consistency is mandatory — index and query embedder must be byte-identical |
| **De-identification** | **Microsoft Presidio** (PHI text) + face/printed-text redaction for images/scans | strips the 18 Safe-Harbor identifiers before content enters the KG (doc 05 privacy) |
| **Bundle compiler** | custom: export KG slice + sqlite-vec index → **signed, versioned** `edh-core-v{N}.kyro` | immutable releases; sign with ed25519 (e.g., minisign) |

---

## Benchmark harness (Aniket-built; runs on Gowrish's supercomputer, not the phone)

Validation is the win condition (doc 08). The harness is offline tooling, not shipped to the device.

| Concern | Tool / approach |
|---|---|
| **Multi-turn eval harness** | **MedKGEval**-style; produces the **spine-ablation collapse chart** (the single most persuasive artifact) |
| **Triage eval + MIMIC extraction** | **medLLMbenchmark** (MIT) over the MIMIC-IV head-trauma slice |
| **Synthetic dialogue generation** | **AMIE**-style self-play (Tier B — volume + fine-tune fuel; reported as engineering regression metrics only, never headline) |
| **Credentialing** | **Gowrish already holds PhysioNet / CITI** — the MIMIC-IV slice runs on his creds + supercomputer (per-user DUA; keep data in-project) |

---

## BRIDGE — cloud → edge distribution

| Concern | Approach |
|---|---|
| **Packaging** | signed, versioned, **sliceable** bundles (a clinic pulls only the EDH core if storage is tight) |
| **Delta sync** | opportunistic, HTTPS, content-addressed diffs when the device sees any connectivity (git-pull-for-knowledge) |
| **Object storage** | Cloudflare R2 / S3 / GCS (cheap, edge-cached) |
| **Sneakernet fallback** | bundle exportable to SD card / USB / a health-worker's phone — the "any room, any country" path |
| **Rule** | the pre-loaded canonical core is always sufficient; sync only *enriches* (doc 05) |

---

## EXPERT PORTAL & ESCALATION — ROADMAP (cut from v1)

The contribution flywheel + human-escalation backend. **Not in the weekend MVP** — escalation is *simulated* in the demo; the portal is slides/stub. Listed here for the roadmap.

| Layer | Pick | Why |
|---|---|---|
| **Web app** | **Next.js / React** | the expert upload UI + the "knowledge request" board |
| **Auth + credential verify** | **Supabase Auth** / Clerk + manual license check | verified-contributor accounts = the trust backbone |
| **App DB** | **Postgres** (Supabase) | accounts, contributions, provenance, review state, requests |
| **Comms relay (masked)** | **WhatsApp Business API** via **Twilio** (number masking) | the LMIC-appropriate channel, without exposing personal numbers |
| **Review pipeline** | provisional → multi-reviewer → canonical | "pull request, not push to `main`" (doc 05) |

---

## The weekend MVP — the minimal subset to actually build

Build **only** the edge app deeply; mock/storyboard the rest.

- **First artifact:** the acute-TBI/EDH **Clinical Guidance Tree (the L1 spine)**, mentor-signed — the credibility core *and* the benchmark answer key.
- **E0 spike:** measure Qwen-4B-Q4 tokens/sec + peak RAM on the real phone; confirm **op-sqlite loads sqlite-vec on Android**.
- **One React Native Android app**, fully offline: the **L1 CGT spine** (deterministic) + **L2 small GraphRAG bundle** (`edh-core-v{N}.kyro`) + **L3 voice I/O** (**stock Qwen-4B-Q4 via llama.rn** + **whisper.cpp** in + **Piper** out) over a hand-built EDH knowledge bundle (canonical core: WHO/WFNS/Peshawar/BTF).
- **Demo flow (English):** HM's case → voice/text → structured evidence-gathering (read-back confirm) → walk the deterministic tree → **cited** operate-vs-transfer recommendation → **ABSTAIN + simulated expert connect** on the irreducible surgical/localization step → **kill the call mid-encounter** to prove the state machine loses nothing → **turn WiFi off** to prove offline.
- **Mock:** the cloud portal, sync, and escalation (a thin Next.js stub or slides; escalation simulated — "matched Dr. X — connecting…").
- **Validation (cat 4):** ~30-vignette EDH benchmark (mentor-signed) + the **spine-ablation chart**; guideline-concordance + abstention numbers (doc 08). Framed as guideline-concordant, not "clinically validated."

---

## Engineering gotchas (don't get caught by these)

1. **Embedding consistency** — the build-plane index embedder and the on-device query embedder must be **byte-identical** (BGE-M3 1024-d both places), or retrieval silently degrades. **This is the #1 project-killer.**
2. **op-sqlite + sqlite-vec on Android** — confirm the sqlite-vec extension actually loads under op-sqlite on the real device *before* building on it (E0 spike).
3. **Model-size vs. RAM** — budget Q4 sizes against the *cheapest* target device (8–10-year-old phones), not a flagship.
4. **The model is I/O, not the knowledge source** — the flywheel improves *coverage* (the bundle), not the model. A 4B model is **not a reliable reasoner** (a fine-tuned 8B scored 42% on USMLE; no 4B datapoint exists) — keep it off the critical path.
5. **NO multi-agent / NO MCTS / NO self-consistency on the critical path** — multi-round inference is ~70s/question on a *server GPU* = minutes/case on a phone. Reserve N=2–3 sampling only for the single operate-vs-transfer checkpoint.
6. **Abstention is NOT gated on model confidence** — gate on the deterministic tree + hard out-of-bounds rules. Model confidence (AUROC ≈ 0.5) is a weak secondary flag only.
7. **English only for v1** — Urdu (on-device ASR especially) is an unsolved research problem; honest scope.
8. **Fine-tuning is roadmap** — ship **stock Qwen-4B-Q4** first; a fine-tune is a later drop-in swap for I/O *behavior* only.
9. **Don't index on-device** — graph construction is **build-plane only** (cloud LLM API; not the supercomputer); the phone just retrieves over a pre-built bundle.

---

## Sources (mid-2026)
- On-device LLMs / SLMs: [SiliconFlow — Best Quantized LLMs for Edge 2026](https://www.siliconflow.com/articles/en/best-quantized-llms-for-edge-deployment), [On-Device LLMs: State of the Union 2026](https://v-chandra.github.io/on-device-llms/), [BentoML — Best Open-Source SLMs 2026](https://www.bentoml.com/blog/the-best-open-source-small-language-models)
- On-device runtimes: [llama.rn](https://github.com/mybigday/llama.rn), [op-sqlite](https://github.com/OP-Engineering/op-sqlite), [sqlite-vec](https://github.com/asg017/sqlite-vec), [Cactus — Best On-Device LLM Framework 2026](https://cactuscompute.com/compare/best-on-device-llm-framework)
- ASR: [Northflank — Best open-source STT 2026](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)
- GraphRAG: [Microsoft GraphRAG](https://www.microsoft.com/en-us/research/project/graphrag/), [MedGraphRAG](https://github.com/MedicineToken/Medical-Graph-RAG)
- Forkable harnesses: [Deep-DxSearch / DiagRL](https://github.com/MAGIC-AI4Med/Deep-DxSearch), [medLLMbenchmark](https://github.com/BIMSBbioinfo/medLLMbenchmark)
