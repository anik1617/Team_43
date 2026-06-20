# 07 — Kyro: product context & current framing

**A context doc — not the final pitch.** The current synthesis of where the product stands, integrated with docs 01–06 and 08–09. The pitch line, "why we win," and business model here are working drafts, not locked. Note up front: **Starlink and any connectivity/hardware provisioning are future/roadmap — the core product is the offline phone app that stands alone.**

## The name

Chiron taught Asclepius the art of healing. Asclepius went on to cure the sick, the dying, and the dead — *without* Chiron in the room. He had what Chiron gave him. **Kyro is that knowledge — in every room, offline, when the call drops.**

## The thesis: it's not knowledge, it's *continuity*

The case GMO actually *succeeded* — he had fragments of guidance and held it together. The fatal risk wasn't missing knowledge; it was that the lifeline **broke mid-emergency**: the teleconsult call dropped, twice. Every existing tool — teleconsult, tele-proctoring, rural-surgery guidelines — assumes connectivity *at the exact moment it doesn't exist.*

> **The problem isn't knowledge. It's continuity.** Kyro is the guidance that never loses its place.

This is also our strongest move with the AI-skeptic panel (see [04-judging-strategy-and-reframe.md](04-judging-strategy-and-reframe.md)): the pitch isn't "an AI that knows surgery better than a flowchart," it's "the guidance that survives the dropped call" — a failure mode every clinician in the room has lived. We do **not** claim the AI decides better than an experienced surgeon or a laminated card; on the raw operate-vs-transfer decision, a simple model is non-inferior to deep learning (see [09-prior-art-and-feasibility.md](09-prior-art-and-feasibility.md)). The win is **continuity + evidence-gathering discipline + hands-free voice + auditable citations**, not smarter reasoning.

## What Kyro is — the RE-AIM

An **offline, on-device emergency clinical *decision* co-pilot for acute TBI**, running entirely on a cheap Android phone. No internet, no neurosurgeon in the room required. The user is a general medical officer / general surgeon.

**It is explicitly NOT "guide the burr-hole drilling."** That claim dies on the imaging wall: without a CT you cannot know *where* to drill, and no software can supply imaging. We acknowledge that wall and route around it. Kyro instead:

1. **Decisively drives structured evidence-gathering** — GCS, pupils, BP, lucid interval, lateralizing signs, mechanism, time-since-injury. The discipline of asking the right questions in the right order is itself the intervention.
2. **Walks a guideline decision tree** — a deterministic, hand-authored clinical guidance tree, each node citing Peshawar / BTF.
3. **Recommends stabilization, secondary-injury prevention, and the operate-vs-transfer decision** — with cited sources the GMO can audit.
4. **Abstains and connects a live human expert** on the irreducible surgical/localization step it cannot safely own.
5. **Captures the encounter by voice** to grow a community knowledge base.

- **Voice-navigated end to end** — hands-free, sterile-safe; the GMO operates it without touching the screen.
- **Every step is cited** to canonical guidelines (WFNS Peshawar, Brain Trauma Foundation, WHO). Nothing on the critical path is invented; every recommendation shows its source.

## The core innovation — the procedure state machine

The differentiator is the dropped-call **procedure state machine**: a working-memory object `<evidence, hypotheses, trajectory>` that *is* the continuity primitive. It runs continuously, capturing from voice: the structured evidence gathered so far (GCS, pupils, BP, drugs, time-since-injury), the current position in the decision tree, the last decision point, and exactly where uncertainty arose.

So **when the call drops, the state is already captured — nothing is lost.** When any connectivity returns (even 30s of 2G), Kyro can push a compressed state packet and auto-generate a **pre-briefed handoff brief**; the next available expert picks up *mid-emergency in ~10 seconds, not from zero*:

> *Acute EDH, suspected. 23 min elapsed. Patient: GCS 6, left pupil fixed dilated, BP 160/90, mannitol given 18 min ago, lucid interval reported, right-sided weakness. Decision tree reached operate-vs-transfer checkpoint; GMO flagged uncertainty. Needs: expert confirmation on operate-vs-transfer and surgical localization.*

Full design (incl. abstention, the safety model, and the self-healing flywheel) is in [05-architecture.md](05-architecture.md) → "At the edge of knowledge."

## The architecture in one breath — the model is a mouth, the tree reasons

Three neuro-symbolic layers (full detail in [05-architecture.md](05-architecture.md)):

- **L1 — Reasoning spine (the brain).** A hand-authored **deterministic** clinical guidance tree (MedDM "IEET" format) for acute TBI / EDH triage, each node carrying a Peshawar/BTF citation, executed by a code-driven loop that decides traversal (advance / act / ask). The spine sits in **veto position over the model.** It carries the working-memory object — the procedure state machine.
- **L2 — Knowledge.** A small, curated, source-cited **GraphRAG** graph, built offline on the supercomputer and shipped as a signed SQLite bundle (`edh-core-v{N}.kyro`). Citations and question-ordering come from the graph with no LLM call.
- **L3 — Language I/O only (a mouth, not a brain).** **Qwen-4B-Q4** via llama.rn, plus whisper.cpp (ASR) and Piper/OS-TTS. The model does four narrow jobs only: clean ASR text, classify the operator's answer at each node, phrase the next question, and synthesize the *final cited recommendation from the leaf the tree already reached.* Nothing load-bearing sits on the critical path.

Why this is safe and wins the room: a 4B model is **not** a reliable clinical reasoner, so it must not reason on the critical path. The deterministic tree reasons (auditable, guideline-concordant); the model talks. We reposition Kyro as a **"Verifiable Workflow Automator + Grounded Synthesizer"** — the lowest clinical-risk corner of the field — and explicitly disclaim the free-reasoning "AI clinician" the judges fear.

## The safety system — abstain on boundaries (not on confidence)

Knowing when *not* to act is the headline safety feature. Critically, **abstention is NOT gated on the model's confidence** — model confidence is near-random at predicting its own correctness (AUROC ~0.5; we cite this *against ourselves*). Instead Kyro abstains on **deterministic boundaries**:

- the tree has **not** reached a guideline-sanctioned leaf;
- a **hard out-of-bounds rule** fires (missing required inputs, contradictory vitals, out-of-protocol values, any out-of-tree input);
- **critical evidence is still missing** — the system cannot terminate.

Every critical field is **read back for confirmation** before it enters the tree ("I heard left pupil fixed, correct?") — anti-sycophancy by design. On the irreducible surgical/localization step, Kyro **abstains and connects a live human expert** rather than inventing procedure. Model confidence is, at most, a weak secondary flag.

## Connectivity & hardware — future / roadmap (not core)

The **core product is the offline phone app** — it stands alone with zero connectivity, because that's the case's reality.
- **Near-term:** opportunistic sync (even 30s of 2G) is enough to fire the queued handoff brief.
- **Future:** Starlink / facility connectivity (and any dedicated hardware) would make the warm handoff real-time where available — a deployment *upgrade*, not part of the MVP or the core pitch.

## The knowledge layer & the open commons

Kyro's knowledge is **versioned, signed data — never retrained model weights.** Updates ship as signed SQLite bundles, not new models. Tiered trust:
- **Tier 0 — Canonical core** (WFNS Peshawar, BTF, WHO). The critical path (acute TBI / EDH) lives here and is **never crowdsourced.** The pre-loaded core is always sufficient; sync only enriches.
- **Tier 1 — Verified expert contributions** — attributed, credential-checked, peer-reviewed; enriches edge cases, never overrides Tier 0 on the critical path.

The long-term vision is **the first peer-reviewed open-source surgical knowledge commons for LMIC emergency neurosurgery** — surgeons contribute structured field notes, cross-linked to canonical guidelines, permanently attributed and citable. *Note: the full community-contribution flywheel/portal is roadmap, cut from v1.* The open-vs-closed KB is an undecided business lever; current lean is **hybrid** — open the Tier-0 canonical core for trust/adoption, keep the contribution platform, provenance, and gap-log as the moat.

## The flywheel (roadmap)

Every deployment generates structured logs of real TBI uncertainty moments — data that exists nowhere in the literature. Gap signals cluster at exact decision points; the gap log is simultaneously the product roadmap, the research dataset, and the fundable artifact, and no competitor can replicate it without being deployed first. (Mechanics in [05-architecture.md](05-architecture.md); the contribution portal itself is post-v1.)

## Validation — win with science

Every metric is a **delta vs a named baseline.** Six headline numbers (full plan in [09-prior-art-and-feasibility.md](09-prior-art-and-feasibility.md) and [08-build-plan-and-task-split.md](08-build-plan-and-task-split.md)):

1. **Triage accuracy** (operate-vs-transfer) ≥80% exact / ≥90% within-safe-band, with a directional confusion matrix (errors cluster on the safe/transfer side).
2. **Info-gathering completeness** ≥0.90.
3. **Guideline-concordance & citation-faithfulness** ≥90% on critical-path steps.
4. **Abstention accuracy** ≥95% must-abstain recall (the safety number) + honest false-abstention rate + AUROC vs the ~0.5 confidence baseline.
5. **Vs unaided generalist:** +20 to +25 points.
6. **Vs generic LLM:** the ablation ladder (bare Qwen → +graph → +spine → +gate).

Evidence tiers: **A** = 30–50 mentor-signed EDH vignettes (the HM case is #1 and the live demo) — validation pillar #1; **B** = AMIE-style self-play synthetic dialogues (engineering regression only, never headline); **C** = MIMIC-IV head-trauma slice (PhysioNet/CITI credentialing started now). **The single most persuasive artifact is the spine-ablation collapse chart** — Kyro with vs without the deterministic spine. We report calibration and abstention alongside accuracy, name Tier A vs Tier C as two distributions, and honestly flag N≈30 single-rater as a limitation first.

- **Mentor neurosurgeon sign-off** — the EDH guidance tree + knowledge bundle validated against the Peshawar guideline by a practicing neurosurgeon. This is the credibility core *and* the benchmark answer key.
- **Namibia design partners** — active GMO contacts; real users in a real LMIC deployment context.

## Architecture (build vs roadmap)

- **MVP (this weekend):** React Native Android app · Qwen-4B-Q4 via llama.rn · whisper.cpp (voice in) · Piper/OS-TTS (voice out) · op-sqlite + sqlite-vec retrieval · BGE-M3 1024-d embeddings (byte-identical on both planes) · hand-built EDH guidance tree + GraphRAG bundle. Full stack in [06-tech-stack.md](06-tech-stack.md).
- **Post-hackathon:** built on **Exo's cognitive substrate** — TRHN for temporal procedure tracking, the DDM under the gate, identity manifold for state continuity. A roadmap footnote, not a judge-facing claim.
- *Pitch note:* lead with the **auditable, deterministic-spine + cited GraphRAG** story (it's what wins skeptical MDs); Exo is the scaling architecture.

## The business

**Kyro operates as Exo's philanthropic wing.** Exo builds the architecture; Kyro deploys it where it matters most; data and credibility flow back upstream.
- **The wedge — cost & accessibility.** Kyro runs offline on 8–10-year-old Android phones. Our mentor named cost as the single biggest challenge; running on hardware GMOs already own, with zero connectivity dependency, is the central commercial and humanitarian argument.
- **Funding:** NGO licensing (MSF, Partners in Health), government ministry procurement at scale, Gates / Wellcome / Fogarty grants, academic data partnerships.
- **Beachhead:** **Namibia** — one country, one procedure, prove it, expand. *(We pitch the universal problem through the Pakistan vignette; we deploy first where we have partners.)*
- **Scale:** Mission:Brain's chapter network is the contributor-network seed.
- **Competitors:** SurgiAI, the AI Virtual Operative Assistant, Indonesia tele-proctoring — **all assume connectivity, all fail at the moment Kyro is designed for.**

## The demo

One React Native Android app, fully offline. HM's exact scenario (lucid interval, blown left pupil, GCS dropping, no CT, ~23 min elapsed) → voice-driven structured evidence-gathering with read-back confirmation → walk the cited decision tree to the operate-vs-transfer recommendation → hit an out-of-bounds / out-of-scope input, watch it **abstain and refuse to invent**, routing to connect-an-expert → simulate a connection drop mid-encounter (state captured) → reconnect, the handoff brief auto-generates → **turn WiFi off, still running.** *The WiFi-off moment is the demo.*

## The pitch line

> *The call dropped twice. Ours doesn't.*

## Why we win

A working offline demo, a deterministic guideline spine with mentor sign-off, a science-grade benchmark anchored by the spine-ablation chart, real Namibia design partners, a cost wedge that runs on phones GMOs already own, a philanthropic structure, and a knowledge commons that compounds. It's built for the exact room we present in, for judges who know exactly what a dropped call costs.

*Kyro. Named for Chiron. Built for Asclepius.*
