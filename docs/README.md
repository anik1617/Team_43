# Team 43 — Mission:Brain Hackathon working docs

These docs capture everything the team has worked out, so anyone (especially a fresh agent) can get up to speed fast. The single source of truth is the FINALIZED STATE block in `../CLAUDE.md` — every doc here is reconciled to it. Last reconciliation: 2026-06-20.

## Read in this order

A fresh agent should walk the docs in this flow — orientation, then the problem, then the evidence, then feasibility, then the design, then how we build it, then the stack, then how we win the room, then the product/pitch:

1. **[../CLAUDE.md](../CLAUDE.md)** — orientation + the FINALIZED STATE block (authoritative). Start here.
2. **[01-case-brief.md](01-case-brief.md)** — the clinical case (patient "HM") distilled, plus a plain-English neuro glossary for non-medical teammates.
3. **[02-evidence-base.md](02-evidence-base.md)** — all 12 provided TBI research resources summarized, with key stats and how each connects to our case. Our citation library for the pitch.
4. **[09-prior-art-and-feasibility.md](09-prior-art-and-feasibility.md)** — what already exists, what's hard, and the honest evaluation of the idea (the imaging wall, the 4B-model limits, what we can and cannot claim). Read before the design.
5. **[05-architecture.md](05-architecture.md)** — the 3-layer neuro-symbolic architecture: the deterministic reasoning spine (L1) in veto position over a small source-cited GraphRAG knowledge bundle (L2) and a narrow voice/language I/O model (L3); the procedure state machine; the abstention model.
6. **[08-build-plan-and-task-split.md](08-build-plan-and-task-split.md)** — what we actually build this weekend, in what order, who owns what, and the validation/benchmark plan.
7. **[06-tech-stack.md](06-tech-stack.md)** — the concrete mid-2026 tooling per layer (Qwen-4B-Q4 via llama.rn, whisper.cpp, Piper/OS-TTS, Microsoft GraphRAG build, BGE-M3 1024-d, sqlite-vec/op-sqlite on React Native, the signed SQLite bundle), with the weekend-MVP subset.
8. **[04-judging-strategy-and-reframe.md](04-judging-strategy-and-reframe.md)** — the judges are MDs / top neurosurgeons skeptical of AI; how to reframe Kyro as a verifiable workflow automator + grounded synthesizer (not a free-reasoning "latent-space clinician") so we win the room.
9. **[07-kyro-product-and-pitch.md](07-kyro-product-and-pitch.md)** — the product context & current framing: the name, the *"continuity, not knowledge"* thesis, the demo, business model, and competitors. (A context doc, not a locked pitch.)

> Note: `03-solution-idea-and-evaluation.md` has been **deleted**. Do not reference "03" anywhere. Its old content now lives in **07** (product) and **09** (evaluation/feasibility).

## Current finalized state (status)

The authoritative version is the FINALIZED STATE block in `../CLAUDE.md`. In brief:

- **The re-aim:** Kyro is an **offline, on-device emergency clinical *decision* co-pilot** for acute TBI (EDH-deepest) used by a GMO / general surgeon, *not* a neurosurgeon. It does **not** guide the burr-hole drilling — the imaging wall is real and fatal to that claim (without a CT you can't know where to drill, and software can't supply imaging). It drives structured evidence-gathering (GCS, pupils, BP, lucid interval, lateralizing signs, mechanism, time-since-injury), walks a guideline decision tree, recommends stabilization + the operate-vs-transfer decision with cited sources, and **abstains + connects a live human expert** on the irreducible surgical/localization step.
- **Architecture — 3 layers, neuro-symbolic, with THE INVERSION:** a hand-authored **deterministic clinical guidance tree** (L1 spine, MedDM IEET format, each node Peshawar/BTF-cited) sits in **veto position over the model** — *code* decides traversal; the model never reasons on the critical path. L2 = a small curated source-cited **GraphRAG** bundle (signed SQLite). L3 = a narrow **voice/language I/O model** (a mouth, not a brain) that only cleans ASR, classifies answers, phrases questions, and synthesizes the cited recommendation from the reached leaf.
- **The hero — "continuity, not knowledge":** the differentiator is the dropped-call **procedure state machine** (working memory `<evidence, hypotheses, trajectory>`) — a dropped call loses nothing and any reconnection auto-generates a pre-briefed expert handoff. We do **not** pitch "the AI decides better than a flowchart" (an elastic-net was non-inferior to deep learning on the actual decision).
- **Safety = the inversion:** abstention is **not** gated on model confidence (model confidence is near-random, AUROC ~0.5). It's gated on the deterministic tree reaching a guideline-sanctioned leaf, hard out-of-bounds rules, and "can't terminate while critical evidence is missing," with read-back confirmation of every critical field. **No** multi-agent / MCTS / self-consistency on the critical path.
- **Win condition — "win with science":** every metric is a delta vs a named baseline. Six headline numbers (triage accuracy, info-gathering completeness, guideline-concordance + citation-faithfulness, abstention recall, vs unaided generalist, vs generic LLM ablation ladder). The single most persuasive artifact is the **spine-ablation collapse chart** (Kyro with vs without the spine). Eval Tier A = ~30 mentor-signed EDH vignettes (the HM case is #1 and the live demo).
- **Scope & handoff:** v1 is **English only** (Urdu = roadmap; on-device Urdu ASR is unsolved), stock Qwen-4B (fine-tune later), EDH-deepest acute-TBI pathway. Cut from v1: Urdu, fine-tuning, multi-agent, real WhatsApp escalation, the full contribution flywheel. **Gowrish now owns the whole repo** — these docs exist so the fresh agent inherits coherent, contradiction-free context with no drift.

## Deliverable & judging (quick reminder)

- **5-minute pitch** + 2 min Q&A. Six categories × 5 pts = 30: (1) problem clarity, (2) innovation, (3) business model/launch, (4) validation/MVP, (5) presentation, (6) inspiration.
- **Hard constraints from the case:** unreliable internet, intermittent electricity, minimal trained staff, extreme poverty, geographic/cultural barriers. Offline-first / power-independent is mandatory; the cost wedge (runs offline on 8–10-year-old phones) is central.
- **Source PDFs:** `../Case Report and Hackathon Challenge/` (case, instructions, rubric) and `../TBI Resources/` (the 12 research papers).
