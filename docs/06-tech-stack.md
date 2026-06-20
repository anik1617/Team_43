# 06 — Tech Stack

Concrete tooling for the architecture in [05-architecture.md](05-architecture.md), organized by the same three planes (edge / cloud-build / bridge) plus the expert portal. **MVP-first:** each layer lists a primary pick, a fallback, and what we actually build this weekend. Currency checked mid-2026 (see Sources); **validate exact model versions at build time** — this space moves monthly.

**Guiding principle (from doc 05):** the cloud does the heavy lifting (graph build, translation, de-ID); the device stays small and offline. Knowledge ships as *data bundles*, not retrained weights.

---

## EDGE — the offline on-device app (the thing that runs in the room)

Target device: mid-range **Android** phone (cheapest, most common in the setting), ~6–8 GB RAM, no grid/network assumed. Everything below runs locally.

| Layer | Primary pick | Why | Fallback |
|---|---|---|---|
| **App shell** | **Flutter** (Dart) | one codebase Android+iOS, fast to build, good native bindings | React Native |
| **LLM runtime** | **llama.cpp** (GGUF, Q4) via a Flutter binding (`fllama` / `llama_cpp_dart`) | broadest hardware support, huge community, simplest cross-platform path | **MLC-LLM** (compiled, faster) or **Cactus** (cross-platform on-device SDK) |
| **On-device LLM** | **Qwen3.5-2B/4B-Instruct**, Q4 quant | best small-model **multilingual** coverage (200+ langs incl. Urdu) — decisive for us | **Gemma 3 4B** (very fast on mobile), **Llama 3.2 3B**, **Phi-3** |
| **Embeddings (query)** | **BGE-M3** (multilingual, ~560M) | multilingual dense+sparse; **must be the SAME embedder used to index in the cloud** | smaller multilingual E5 / distilled BGE |
| **Vector + graph store** | **sqlite-vec** (vectors) + SQLite tables for graph edges | one embedded file, zero-server, ships in the bundle, trivial on mobile | Kùzu (embedded graph DB) |
| **Retrieval** | **LightRAG**-style hybrid (vector + graph traversal) over the shipped bundle | lightweight, local, KG+vector dual-layer | nano-graphrag patterns |
| **ASR (voice in)** | **whisper.cpp** (Whisper small/medium GGUF) | offline, 99 languages incl. Urdu, mature | **Voxtral Mini Transcribe V2** (Mistral, 2026); **Vosk/Moonshine** if footprint-critical |
| **TTS (voice out, hands-free)** | **Piper** | tiny, fast, fully offline, many languages — essential for sterile-hands OR use | Coqui-TTS |
| **On-device MT** | mostly **avoid** — let Qwen generate **directly** in the target language | removes a translation hop; corpus is pre-translated cloud-side | **NLLB-200-distilled-600M** for user free-text input only |
| **Gap detection / confidence** | custom: retrieval-score + entity-coverage + grounding checks (doc 05 §1) | the "knows when it doesn't know" safety gate | — |

**RAM budget (Q4):** LLM 2–4B ≈ 1.5–3 GB · Whisper-small ≈ 0.5 GB · BGE-M3 ≈ 0.5 GB · Piper ≈ tiny · KG/vector bundle (sliceable). Fits an 8 GB device; on 6 GB, drop to a 2B LLM + Whisper-tiny.

---

## CLOUD — the build plane (ingestion → graph → signed bundle)

Heavy, online, runs on a server. Python (matches the repo's `.gitignore`).

| Layer | Primary pick | Why |
|---|---|---|
| **Backend** | **FastAPI** (Python) | fast, typed, standard for ML-adjacent services |
| **Doc ingestion** | **unstructured** + **PyMuPDF** | parse PDFs/DOCX/slides/images into clean chunks |
| **Graph construction** | **Microsoft GraphRAG** *or* **LightRAG** indexing, driven by a strong LLM (Claude / GPT-class) | LLM-built entities/relations + community summaries; do it once, cloud-side, where cost/size don't matter |
| **Embeddings (index)** | **BGE-M3** (same as device) | consistency is mandatory — index and query embedder must match |
| **De-identification** | **Microsoft Presidio** (PHI text) + face/printed-text redaction for images/scans | strips the 18 Safe-Harbor identifiers before content enters the KG (doc 05 privacy) |
| **Corpus translation** | **SeamlessM4T-v2** / **NLLB-200** (zero-shot Urdu) | pre-translate to per-language bundles in the cloud, not on-device |
| **Master graph store** | **Neo4j** (or Postgres + **pgvector** / **Kùzu**) | canonical KG with provenance + trust-tier metadata on every node/edge |
| **Bundle compiler** | custom: export KG slice + sqlite-vec index → **signed, versioned** archive | immutable releases; sign with standard crypto (e.g., minisign/ed25519) |

---

## BRIDGE — cloud → edge distribution

| Concern | Approach |
|---|---|
| **Packaging** | signed, versioned, **sliceable** bundles (a clinic pulls only "emergency neurotrauma core" if storage is tight) |
| **Delta sync** | opportunistic, HTTPS, content-addressed diffs when the device sees any connectivity (git-pull-for-knowledge) |
| **Object storage** | Cloudflare R2 / S3 / GCS (cheap, edge-cached) |
| **Sneakernet fallback** | bundle exportable to SD card / USB / a health-worker's phone — the "any room, any country" path |
| **Rule** | the pre-loaded canonical core is always sufficient; sync only *enriches* (doc 05) |

---

## EXPERT PORTAL & ESCALATION (cloud, online)

The contribution flywheel + human-escalation backend (doc 05 §3–4).

| Layer | Primary pick | Why |
|---|---|---|
| **Web app** | **Next.js / React** | the expert upload UI + the "knowledge request" board |
| **Auth + credential verify** | **Supabase Auth** / Clerk + manual license check (MVP) | verified-contributor accounts = the trust backbone |
| **App DB** | **Postgres** (Supabase) | accounts, contributions, provenance, review state, requests |
| **Request clustering** | embeddings + Postgres `pgvector` | dedupe similar "knowledge requests" into ranked needs |
| **Escalation matching** | semantic match (BGE-M3) × availability/on-call/timezone/language | route to best *reachable* expert, ranked fallback |
| **Comms relay (masked)** | **WhatsApp Business API** via **Twilio** (number masking / proxy) | the LMIC-appropriate channel, without exposing personal numbers |
| **Review pipeline** | app logic: provisional (Tier-1) → multi-reviewer → canonical | "pull request, not push to `main`" (doc 05) |

---

## The weekend MVP — the minimal subset to actually build

Build **only** the edge app deeply; mock/storyboard the rest.

- **One Flutter Android app**, fully offline: **Qwen3.5-2B (Q4) via llama.cpp** + **whisper.cpp** (voice in) + **Piper** (voice out) + **sqlite-vec** retrieval over a **hand-built EDH knowledge bundle** (canonical core: WHO/WFNS/Peshawar/BTF, ~a few dozen vetted chunks).
- **Demo flow:** HM's case → voice/text input → retrieve → **cite** → synthesize step-by-step → **defer/STOP** on an out-of-scope case → **turn WiFi off** to prove offline → Urdu toggle.
- **Mock:** the cloud portal, sync, and escalation (a thin Next.js stub or slides). Escalation can be *simulated* ("matched Dr. X — connecting…") without the live Twilio/WhatsApp integration.
- **Validation (cat 4):** guideline-concordance of the EDH bundle, signed off by a mentor neurosurgeon (not "clinically validated").

---

## Engineering gotchas (don't get caught by these)

1. **Embedding consistency** — the cloud index embedder and the on-device query embedder must be identical (BGE-M3 both places), or retrieval silently degrades.
2. **Model-size vs. RAM** — budget Q4 sizes against the *cheapest* target device, not a flagship; have a 2B fallback.
3. **The model is a fixed floor** — the flywheel improves *coverage* (the KG), not synthesis *quality* (the shipped LLM). Pick the LLM carefully; it can't be upgraded by sync.
4. **Urdu is fine; Shina/Balti/Wakhi are not** — Urdu + English for MVP; tiny local languages have ~no model support (honest scope).
5. **Don't index on-device** — graph construction is cloud-only; the phone just retrieves over a pre-built bundle.

---

## Sources (mid-2026)
- On-device LLMs / SLMs: [SiliconFlow — Best Quantized LLMs for Edge 2026](https://www.siliconflow.com/articles/en/best-quantized-llms-for-edge-deployment), [On-Device LLMs: State of the Union 2026](https://v-chandra.github.io/on-device-llms/), [BentoML — Best Open-Source SLMs 2026](https://www.bentoml.com/blog/the-best-open-source-small-language-models)
- On-device runtimes: [Cactus — Best On-Device LLM Framework 2026](https://cactuscompute.com/compare/best-on-device-llm-framework), [Running Llama on Phone 2026](https://www.buildmvpfast.com/blog/on-device-llm-mobile-llama-ios-android-2026)
- ASR: [Northflank — Best open-source STT 2026](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks), [Voxtral vs Whisper 2026](https://weesperneonflow.ai/en/blog/2026-03-31-voxtral-whisper-open-source-speech-models-comparison-2026/)
- Translation: [Picovoice — Open-Source Translation for Mobile/Embedded](https://picovoice.ai/blog/open-source-translation/), [Meta — SeamlessM4T](https://ai.meta.com/blog/seamless-m4t/)
- GraphRAG: [LightRAG (HKUDS, EMNLP2025)](https://github.com/hkuds/lightrag), [GraphRAG & LightRAG in 2026](https://callsphere.ai/blog/vw6g-microsoft-graphrag-knowledge-graph-2026), [Microsoft GraphRAG](https://www.microsoft.com/en-us/research/project/graphrag/)
