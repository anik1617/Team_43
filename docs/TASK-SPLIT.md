# Kyro — Task Split (Gowrish ⇄ Aniket)
*Shareable "who-does-what" so we're on the same page. Engineering detail lives in [08-build-plan-and-task-split.md](08-build-plan-and-task-split.md); this is the skim version + live status.*

## The shape: 2 streams, 1 seam
- **Gowrish — EDGE** (offline RN app + spine executor + on-device model I/O + voice + state machine). Also **repo owner.**
- **Aniket — CLOUD** (ingestion → GraphRAG → signed bundle → portal → deploy).
- **The seam = the signed SQLite bundle `edh-core-v{N}.kyro`.** Lock its schema hour one; then both halves build independently.

---

## ⏱️ Hour one — TOGETHER (do before the streams split)
1. **Lock the bundle contract** — the doc 08 §1 schema **+ the `cgt_*` block** (cgt_nodes / cgt_edges / cgt_strings) for the L1 spine. Pin the 4 killers: **`embedder_id="bge-m3"`, `embedder_dim=1024` byte-identical on both planes**, `source_citation`, `trust_tier`, `sqlite_vec_version`.
2. **Aniket:** hand-build the **5–10-chunk mock bundle** to that schema → unblocks Gowrish's E1–E5 immediately (no waiting on the real pipeline).
3. **CGT spine** (the first artifact) — *being authored now (multi-agent workflow); lands mentor-ready.* Mentor signs it → it's the credibility core **and** the benchmark answer key.

---

## 🟦 GOWRISH — EDGE stream
| # | Step | What it is |
|---|---|---|
| **E0a** | **Emulator spike (now, functional)** | App builds; `llama.rn` loads Qwen-4B-Q4 GGUF; `op-sqlite` loads sqlite-vec; pipeline runs. Build `arm64-v8a` too. |
| **E0b** | **Perf gate — real ARM device (no phone on hand yet)** | **tok/s + peak RAM on real hardware** — decides 4B-vs-2B, Q4-vs-Q5. *(Emulator numbers are invalid for this.)* No phone right now → use a **cloud device farm (Firebase Test Lab / AWS Device Farm)** or **borrow any cheap Android (~20 min)**. **Develop against 4B-Q4 with a 2B-Q4 fallback so this never blocks the build.** |
| E1 | Bundle loader | download/sideload, **verify ed25519 signature**, open via op-sqlite+sqlite-vec, reject on embedder/version mismatch |
| E2 | Retrieval (GraphRAG local-search) | BGE-M3 embed → sqlite-vec NN (nodes+chunks) → graph expansion + community reports → cited context, prefer trust_tier 0 |
| E3 | Spine executor + L3 I/O | **code-driven CGT traversal**; Qwen does ONLY 4 jobs: clean ASR, classify answer, phrase question, synthesize cited leaf. Code decides traversal; model never does. |
| E4 | Abstention gate 🟢/🟡/🔴 | **deterministic rules** (sanctioned-leaf / hard out-of-bounds / can't-terminate-while-critical-evidence-missing). NOT model confidence. |
| E5 | **Procedure state machine** + handoff brief | `<evidence,hypotheses,trajectory>` — the continuity primitive; dropped call loses nothing; reconnect → pre-briefed handoff. **The differentiator.** |
| E6 | Voice | whisper.cpp ASR + Piper/OS-TTS; **read-back confirm every critical field**. English only. |
| E7 | Demo UX | HM EDH flow → WiFi-off → gap → abstain → handoff (React Native) |

## 🟩 ANIKET — CLOUD stream
| # | Step | What it is |
|---|---|---|
| C1 | Ingestion API | upload → parse → chunk (FastAPI + PyMuPDF) |
| C2 | De-identify | Presidio scrubs PHI before content enters the KG |
| C3 | **Graph build** | Microsoft GraphRAG via a **cloud LLM API** + **BGE-M3 embed** (CPU/cheap GPU) — **no supercomputer** (a ~160-node graph is small). **Force BGE-M3** (overrides the OpenAI default — or retrieval = garbage). |
| C4 | Master store | Supabase (Postgres + pgvector) — accounts, provenance, trust-tier, review state |
| C5 | Bundle compiler | GraphRAG parquet → SQLite/sqlite-vec → **ed25519 sign** → object storage (bundles L1 CGT + L2 graph) |
| C6 | Distribution endpoint | `/bundles/latest?scope=edh-core` (full download first; delta = post-MVP) |
| C7 | **Expert portal** | signup + upload + request board + review queue (Next.js/Vercel + Supabase Auth) — the live "neurosurgeon uploads → flows to phone" demo (Cat 3 & 4) |
| C8 | Synthetic dialogue generator | AMIE-style self-play → Tier-B eval data → **hands to Gowrish** |

---

## 🟪 Shared / cross-cutting
- **Integration (together):** Aniket's *real* bundle → Gowrish's app loads it → end-to-end. *Milestone: one product, not two demos.*
- **Validation — compute split:** **Aniket builds the harness** (forks `medLLMbenchmark`); **Gowrish runs all evals on his supercomputer** (he alone has it + MIMIC). 6 headline deltas + the **spine-ablation collapse chart** (the hero artifact).
  - Tier A = 30–50 **mentor-signed** EDH vignettes (HM = #1) — *content from the spine workflow + mentor.*
  - Tier B = Aniket's C8 synthetic dialogues (regression only).
  - Tier C = **MIMIC-IV head-trauma slice — ✅ PhysioNet creds in hand, ready to pull.**

## 🔗 Critical path (what blocks what)
- **E0b** gates the model → gates E1–E7. **Run it on a real phone early.**
- **The contract** gates both streams → lock hour one.
- **The mock bundle** (Aniket, hour one) unblocks Gowrish's E1–E5.
- **The CGT spine** (workflow + mentor) gates E3, E2 citations, and the Tier-A answer key.
- **Mentor's window** gates Tier-A + the credibility sign-off → batch everything for it.

## 🧰 Resources confirmed
- ✅ **Supercomputer + MIMIC/PhysioNet — Gowrish ONLY** (Aniket has neither; his stream is built not to need them). **C3 indexing runs on a cloud LLM API, NOT the supercomputer.** Heavy **evals, MIMIC-IV Tier-C, synthetic gen, any fine-tune run on Gowrish's supercomputer.**
- ✅ **Tier-C MIMIC-IV unblocked** — Gowrish holds PhysioNet + CITI; keep the slice inside the project (per-user DUA).
- 🖥️ **Android emulator** → functional dev only (use now). **Perf gate needs real ARM hardware** — no phone on hand → **cloud device farm (Firebase Test Lab / AWS Device Farm)** or borrow one; keep a **2B-Q4 fallback** so the model choice never blocks the build.

## 📌 Live status
- CGT spine: **in progress** (multi-agent workflow) → arrives mentor-ready with a `[VERIFY]` list + seed Tier-A vignettes.
- Next for Gowrish: **E0a now**, **E0b ASAP**, lock the contract + mentor window.
- Next for Aniket: mock bundle (hour one), then C1→C6.
