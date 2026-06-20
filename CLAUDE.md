# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It is the **auto-loaded orientation doc** — read it first; it is meant to be self-sufficient.

> **Handoff note (2026-06-20):** **Gowrish now owns this whole repo.** (Previously: Aniket = cloud, Gowrish = edge.) This file and the `docs/` set were consolidated so a fresh agent inherits full, coherent, contradiction-free context with no drift.

## What this repository is

This is **Team 43's** project repo for the **Mission:Brain Global Neurosurgery Hackathon 2026**. It is **not a conventional software codebase** — it is a competition workspace. The deliverable is a **5-minute business pitch** (plus optional MVP/prototype and validation evidence) for a solution that improves traumatic brain injury (TBI) / neurosurgical care for patients in **low- and middle-income countries (LMICs)**, grounded in a specific clinical case.

The repo is still **pre-implementation** (no build system, test suite, or application code yet — do not invent build/lint/test commands; the Python `.gitignore` signals one anticipated language is **Python**, though the on-device app is **React Native** — see `docs/06-tech-stack.md`). But it now holds substantial **research and strategy work**, not just the raw case:

- `Case Report and Hackathon Challenge/` — the case, instructions, and rubric (PDFs).
- `TBI Resources/` — 12 provided research papers / fact sheets (the evidence base).
- `docs/` — **the team's synthesized working docs; start here.** Case brief + neuro glossary, the distilled evidence base, the judging strategy, the technical architecture, the tech stack, the canonical product context/pitch, the build plan, and the prior-art/feasibility analysis. Index: `docs/README.md`.
- `brainstorm with gowrish.txt` — raw transcript of the founding brainstorm.

## Current direction — Kyro (FINALIZED)

**Pain point:** **#6 Surgical Task-Shifting**, anchored on the case moment where the GMO's teleconsult to a distant neurosurgeon kept dropping mid-emergency.

**Product: Kyro** (for Chiron, who taught the healer Asclepius) — an **offline, on-device emergency clinical *decision* co-pilot** for acute TBI in low-resource settings. The user is a **general medical officer / general surgeon, not a neurosurgeon**. Beachhead: **Namibia**.

### The re-aim (read this — it supersedes any "guide the drilling" framing)

Kyro does **not** guide the burr-hole drilling. The **imaging wall** is real and fatal to that claim: without a CT you cannot know where to drill, and software cannot supply imaging. Instead Kyro is a **decision co-pilot** that:

1. **Decisively drives structured evidence-gathering** (GCS, pupils, BP, lucid interval, lateralizing signs, mechanism, time-since-injury).
2. **Walks a guideline decision tree** to a guideline-sanctioned conclusion.
3. **Recommends** stabilization + secondary-injury prevention + the **operate-vs-transfer** decision, **with cited sources**.
4. **Abstains and connects a live human expert** on the irreducible surgical/localization step.
5. **Captures the encounter by voice** to grow a community knowledge base.

### Hero / thesis: "Continuity, not knowledge"

The true differentiator is the **dropped-call procedure state machine**: Kyro captures encounter/operative state so a dropped call **loses nothing**, and any reconnection **auto-generates a pre-briefed expert handoff**. Lead the pitch with: **continuity + structured evidence-gathering discipline + hands-free voice + auditable citations.**

**Do NOT pitch "the AI decides better than a flowchart."** On the actual operate-vs-transfer decision a simple elastic-net was non-inferior to deep learning — a laminated card rivals the AI there. The win is continuity, discipline, and auditability, not superhuman reasoning.

### Architecture — 3-layer neuro-symbolic (the inversion)

**The inversion (this supersedes any earlier "the model reasons/extrapolates, gated by its confidence" framing in docs 05/08): code and a deterministic tree reason; the model only talks.**

- **L1 — Reasoning spine (the brain; the credibility core).** A hand-authored **deterministic clinical guidance tree (CGT)** in MedDM "IEET" format — one acute-TBI/EDH triage tree, each node carrying a Peshawar/BTF citation — executed by a CDM-style loop where **code decides traversal** (advance / act / ask). **The spine sits in veto position over the model.** Plus the working-memory object `<evidence, hypotheses, trajectory>` = the procedure state machine = the continuity primitive.
- **L2 — Knowledge.** A small, curated, source-cited **GraphRAG** graph (a ~160-node-class graph is proven sufficient), built **offline on the supercomputer**, shipped as a **signed SQLite bundle** (`edh-core-v{N}.kyro`). Uses MedGraphRAG's Triple-Graph idea (entity/source/definition) for citations and MedRAG discriminability (1/degree-centrality) to order questions with **no LLM call**.
- **L3 — Language I/O only (a mouth, not a brain).** A **stock Qwen-4B-Q4** model via llama.rn + whisper.cpp (ASR) + Piper/OS-TTS. **English first; Urdu = roadmap** (on-device Urdu ASR is an unsolved research problem). The model does **four narrow jobs only**: clean ASR text, classify the operator's answer at each node, phrase the next question, and assemble the final cited recommendation **from the leaf the deterministic tree reached**. **Nothing load-bearing sits on the critical path.**

Full engineering detail: **`docs/05-architecture.md`** (design), **`docs/06-tech-stack.md`** (stack), **`docs/08-build-plan-and-task-split.md`** (build), **`docs/09-prior-art-and-feasibility.md`** (feasibility/evaluation). The seam: the signed bundle `edh-core-v{N}.kyro` (manifest + chunks + chunk_vec + nodes + node_vec + edges); **BGE-M3 1024-d embeddings pinned byte-identical on both the build and device planes** (a mismatch here is the #1 project-killer).

### Safety model — abstention is NOT gated on model confidence (the inversion)

Kyro abstains based on the **deterministic structure**, not on the model's self-reported confidence:

- (a) The deterministic tree must reach a **guideline-sanctioned leaf**.
- (b) **Hard out-of-bounds rules** fire on missing required inputs, contradictory vitals, out-of-protocol values, or **any out-of-tree input**.
- (c) **Cannot terminate while critical evidence is missing.**

Model confidence is **near-random** at predicting correctness (AUROC ~0.5 — we cite the UQ survey *against ourselves*); it is a weak **secondary** flag only. Every critical field gets **read-back confirmation** before it enters the tree (anti-sycophancy: "I heard left pupil fixed, correct?").

**Hard rule:** **no multi-agent, no MCTS, no self-consistency on the critical path** (multi-round latency is ~70s/question on a *server* GPU = minutes/case on a phone). Reserve N=2-3 sampling for the **single operate-vs-transfer checkpoint** only.

### The audience constraint that overrides aesthetics

The **judges are mostly/all MDs, several are world-class neurosurgeons, and they are skeptical of AI.** Therefore:

- **Never frame anything as AI "replicating a surgeon's intuition/reasoning."** A 4B model is **not** a reliable reasoner (a fine-tuned 8B scored 42% on USMLE; there is no 4B datapoint anywhere) — so it **must not reason on the critical path.** Reposition Kyro as a **"Verifiable Workflow Automator + Grounded Synthesizer"** (the lowest clinical-risk corner of the field taxonomy) and explicitly disclaim the free-reasoning "Latent Space Clinician" the judges fear. Frame as *task-sharing decision support* that *extends* a neurosurgeon's reach and *defers when unsure* — the neurosurgeon is the hero/author; the deterministic tree reasons (auditable, guideline-concordant); the model talks. **Cited ≠ traceable: the win is auditability** (it shows its sources and flags inference), not parroting.
- Ground every claim in **their own literature** (esp. the Pakistan-written **Peshawar Recommendations**, which explicitly endorse supervised non-specialist EDH evacuation).
- **Win with science** (mentor's words): bring concrete, guideline-based validation — not "AI magic."

### Validation / win condition (every metric is a delta vs a named baseline)

Six headline numbers:

1. **Triage accuracy** (operate-vs-transfer) ≥80% exact / ≥90% within-safe-band, plus a **directional confusion matrix** (errors must cluster on the safe / transfer side).
2. **Info-gathering completeness** ≥0.90 (MedKGEval history-taking 0-2 metric).
3. **Guideline-concordance AND citation-faithfulness** ≥90% on critical-path steps.
4. **Abstention accuracy** ≥95% must-abstain recall (**the** safety number) + honest false-abstention rate + AUROC vs the ~0.5 baseline.
5. **vs unaided generalist:** +20 to +25 points.
6. **vs generic LLM:** the **ablation ladder** (bare Qwen → +graph → +spine → +gate).

**The single most persuasive artifact = the spine-ablation collapse chart** (Kyro with vs without the L1 spine).

Eval tiers: **A** = 30-50 mentor-signed EDH vignettes (the HM case is #1 + the live demo; ~20 operate / ~10 transfer / ~10-20 must-abstain) — validation pillar #1; **B** = AMIE-style self-play synthetic dialogues (volume + fine-tune fuel, reported as engineering regression metrics **only**, never headline); **C** = MIMIC-IV head-trauma slice (**start PhysioNet/CITI credentialing now** — days of lead time). Harness = MedKGEval-style multi-turn, **run on the supercomputer, not the phone.** Reporting discipline (PROBAST armor): report calibration + abstention alongside accuracy; name Tier A vs Tier C as two distributions; honestly name N~30 single-rater as a limitation first. Full plan in **`docs/09-prior-art-and-feasibility.md`** and **`docs/08-build-plan-and-task-split.md`**.

### Scope, keystones, business

- **Scope (v1):** acute-TBI emergency pathway, deepest on **EDH**, **English only**. **In:** L1 CGT spine + L2 small GraphRAG bundle + L3 voice I/O + abstention-on-boundaries + the state machine + a ~30-vignette benchmark + the spine-ablation chart. **Roadmap (cut from v1):** Urdu, fine-tuning (use **stock Qwen-4B first**; fine-tune is a later swap), multi-agent, real masked-WhatsApp escalation, broader neuro/TBI coverage, the full community-contribution flywheel/portal.
- **Keystone principles:** knowledge = versioned **signed data bundles**, never retrained weights (the model may be re-trained for **I/O behavior only** — format/parsing/phrasing — never as the knowledge source); **PHI stays on-device** (offline = data never leaves the room); the pre-loaded canonical core is always sufficient (sync only enriches).
- **Business:** Kyro = the **philanthropic wing of Exo**; funding via NGO licensing (MSF/PIH) + ministry procurement + Gates/Wellcome/Fogarty grants; beachhead **Namibia**; the **cost/accessibility wedge** (runs offline on 8-10-year-old phones) is central. KB licensing leans **hybrid** (open the Tier-0 canonical core for trust/adoption; keep the contribution platform + provenance + gap-log/flywheel as the moat). Full product context + pitch in **`docs/07-kyro-product-and-pitch.md`**.

> **Exo footnote:** **Exo** (repo at `C:\Personal_Coding\Exo`) — TRHN temporal procedure tracking, the DDM, the identity manifold — is the **post-hackathon scaling substrate**, a roadmap footnote only, **not** the MVP architecture. Starlink/hardware = future roadmap, not core.

> **First artifact to build:** the acute-TBI/EDH **Clinical Guidance Tree** (the L1 spine), mentor-signed — it is both the credibility core and the benchmark answer key. Then the **E0 spike**: measure Qwen-4B-Q4 tokens/sec + peak RAM on the real phone, and confirm op-sqlite loads sqlite-vec on Android.

## Source-of-truth documents (read these before proposing anything)

All three live in `Case Report and Hackathon Challenge/` (PDFs):

- **`Hackathon Case Report - InstantImpact LastingDisability.pdf`** — the clinical case vignette. Large (~26 MB) because of embedded images; the text is only ~9 pages. To read it, extract text with PyMuPDF rather than the Read tool (which rejects >20 MB):
  ```bash
  python -c "import fitz; d=fitz.open('Case Report and Hackathon Challenge/Hackathon Case Report - InstantImpact LastingDisability.pdf'); print('\n'.join(p.get_text() for p in d))"
  ```
- **`Instructions.pdf`** — scope, what to build, what NOT to do.
- **`Judging Criteria & Rubric.pdf`** — the six scoring categories. Optimize the pitch and any build against these.

A Participant Access Drive with extra resources is linked in `Instructions.pdf`.

**Also in the repo:** `TBI Resources/` (12 research papers — the evidence base, distilled in `docs/02-evidence-base.md`) and `docs/` (the team's synthesized briefs — **start with `docs/README.md`**).

## The case in one paragraph (so any solution stays grounded)

**HM**, a 31-year-old subsistence farmer in rural **Gilgit-Baltistan, Pakistan**, has years of unrecognized repetitive head impacts (recreational soccer) plus 3–4 years of behavioral/cognitive decline his family attributes to stress. A road-traffic rollover causes an acute head injury with a textbook **lucid interval → uncal herniation** (blown left pupil, contralateral weakness, GCS dropping 14 → 7). There is **no ambulance, no imaging, no neurosurgeon** nearby — nearest Basic Health Unit is nurse-led with no labs/imaging; nearest GMO 45 km away; nearest trauma center 200 km away. A general medical officer (GMO) with **general surgical training but no neurosurgery experience** performs an **improvised emergency burr-hole** (hand-crank Hudson brace, phone guidance that keeps dropping) and evacuates an epidural hematoma, saving HM's life. HM survives but is left with **permanent cognitive, motor, behavioral, and psychiatric deficits**, **no rehabilitation services** within 200 km, an untrained family caregiver, social stigma, medical debt, and a first seizure six months later.

The journey spans **prevention → prehospital recognition → transport/triage → diagnosis without imaging → surgical task-shifting → perioperative monitoring → postoperative management → rehabilitation → systems/policy**.

## The 11 candidate pain points (from the case)

Pick **one (at most two)** — a narrow, deep solution beats a broad, shallow one. (We chose **#6.**)

1. **Prehospital Recognition** — help family/bystanders distinguish a neuro emergency from "he just needs rest."
2. **Prevention & Education** — community TBI/concussion awareness, "invisible symptoms" messaging.
3. **Early Detection of Chronic Mild TBI** — surface cumulative sports brain injury where there's no medical infrastructure.
4. **Diagnosis Without Imaging** — diagnose an epidural hematoma without CT (point-of-care tool / decision aid / portable imaging alternative).
5. **Transport & Triage** — operate locally vs. transfer when there's no imaging and long transfer times.
6. **Surgical Task-Shifting** — train/guide a non-neurosurgeon through a life-saving procedure in real time (training model, sim, or live guidance).
7. **Perioperative Monitoring** — monitor a post-neurosurgical patient with no ICP monitor, CT, or ICU.
8. **"ROR" / Frugal Surgical Technology** — low-cost, power-independent instrument/kit improving emergency surgery safety.
9. **Postoperative Management** — detect complications, prevent infection, manage meds with minimal resources.
10. **Rehabilitation** — deliver cognitive/physical/psychological rehab with no rehab professionals (telehealth, CHWs, family training).
11. **Systems & Policy** — referral networks, data systems, financial protection, advocacy.

(We may also define our own pain point if we can justify it.)

## Hard design constraints (a solution that ignores these loses)

Every idea built or pitched here must survive the case's real-world setting:

- **Unreliable/absent internet** and **intermittent electricity** — cannot depend on reliable high-speed connectivity or continuous power. Offline-first / power-independent is strongly favored. Any cloud/sync dependency must justify how it's met.
- **Minimal trained personnel** — nurse-led units, GMOs, untrained family caregivers; design for non-specialists.
- **Extreme poverty & no safety net** — an $8 transfer is a hardship; no insurance, no social welfare. Cost and financing matter.
- **Geographic & cultural barriers** — mountainous terrain, long distances, stigma, no local concept of "concussion."
- Solutions should be **scalable/adaptable** to other rural settings, other LMICs, or other neurological emergencies, and reflect **human/cultural context**, not just technical feasibility.

## How work here is judged (optimize for this rubric)

5-min pitch + 2-min Q&A. Six categories, 5 points each (30 total):

1. **Problem Identification & Clarity** — focused pain point tied to the case; stakeholders named; complexity understood.
2. **Innovation** — directly addresses the pain point; novel; improves outcomes vs. status quo; feasible; good UX.
3. **Business Model, Market Analysis, Launch Strategy** — sustainable model; competitors & market; launch plan + beachhead.
4. **Validation** — prototype / MVP / experiment; can it scale and impact lives.
5. **Presentation** — clear, on-time, strong Q&A, credible team.
6. **Inspiration** — "how disappointed would you be if this never existed?"

**Implication for anything we build:** prioritize a demonstrable **MVP/prototype** (category 4) and keep it **evidence-informed** (cite TBI/global-surgery/LMIC-health literature). When in doubt, build the smallest thing that makes the pitch's core claim tangible.

## Working conventions for this repo

- **Don't try to solve the whole case.** Scope to the chosen pain point (#6).
- Keep large source PDFs in `Case Report and Hackathon Challenge/`; reference them rather than duplicating their content.
- **Doc set (after the 2026-06-20 consolidation):** `CLAUDE.md` (this orientation) + `docs/README.md` (index) + `docs/01` case + `docs/02` evidence + `docs/04` judging-strategy + `docs/05` architecture + `docs/06` tech-stack + `docs/07` product-and-pitch + `docs/08` build-plan + `docs/09` prior-art-and-feasibility. **`docs/03` has been deleted — do not reference "03" anywhere; for its old content point to `docs/07` (product) or `docs/09` (evaluation/feasibility).**
- When scaffolding the app, follow `docs/06-tech-stack.md` (React Native on-device; offline build pipeline) and **update this file** with the real build/run/test commands at that point.
