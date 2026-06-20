# 07 — Kyro: product context & current framing

**A context doc — not the final pitch.** The current synthesis of where the product stands, captured from the team's "GR_case" narrative and integrated with docs 01–06. The pitch line, "why we win," and business model here are working drafts, not locked. And note up front: **Starlink and any connectivity/hardware provisioning are future/roadmap — the core product is the offline phone app that stands alone.**

## The name

Chiron taught Asclepius the art of healing. Asclepius went on to cure the sick, the dying, and the dead — *without* Chiron in the room. He had what Chiron gave him. **Kyro is that knowledge — in every room, offline, when the call drops.**

## The thesis: it's not knowledge, it's *continuity*

The case GMO actually *succeeded* — he had fragments of guidance and held it together. The fatal risk wasn't missing knowledge; it was that the lifeline **broke mid-procedure**: the teleconsult call dropped, twice. Every existing tool — teleconsult, tele-proctoring, rural-surgery guidelines — assumes connectivity *at the exact moment it doesn't exist.*

> **The problem isn't knowledge. It's continuity.** Kyro is the guidance that never loses its place.

This reframe is also our strongest move with the AI-skeptic panel (see [04-judging-strategy-and-reframe.md](04-judging-strategy-and-reframe.md)): the pitch isn't "an AI that knows surgery," it's "the guidance that survives the dropped call" — a failure mode every clinician in the room has lived.

## What Kyro is

An **offline, TBI-focused emergency co-pilot that never loses its place**, running entirely on a cheap Android phone. No internet, no CT, no neurosurgeon in the room required.

- **Voice-navigated end to end** — hands-free, sterile-safe; a GMO operates it with bloody gloves, never touching the screen.
- **Walks the GMO through EDH burr-hole evacuation step by step**, every step **cited** to canonical guidelines (WHO, WFNS Peshawar, Brain Trauma Foundation). Nothing generated from thin air; every answer shows its source.
- **Covers the full acute TBI window:** operate-vs-transfer decision, secondary-injury prevention, the procedure, post-procedure monitoring, seizure-prophylaxis flagging, equipment-substitution queries.

## The core innovation — the procedure state machine

Runs continuously in the background, **passively, from voice alone** (no extra input from the GMO), capturing: every completed step (timestamped); current patient state (GCS, pupils, BP, drugs, time-since-injury); the last decision point + confidence-gate status; and exactly where uncertainty arose.

So **when the call drops, the state is already captured — nothing is lost.** When any connectivity returns (even 30s of 2G), Kyro pushes a compressed state packet and auto-generates a **pre-briefed handoff brief**; the next available expert picks up *mid-procedure in ~10 seconds, not from zero*:

> *EDH evacuation, 23 min elapsed. Steps 1–4 complete. Currently at landmark identification for the second burr hole. Patient: GCS 6, left pupil fixed dilated, BP 160/90, mannitol given 18 min ago. GMO flagged uncertainty on drill angle. Needs: confirmation on posterior burr-hole placement.*

Full design (incl. gap-detection, the safety modes, and the self-healing flywheel) is in [05-architecture.md](05-architecture.md) → "At the edge of knowledge."

## The safety system (three modes)

Gated by **evidence strength × action reversibility**:
- 🟢 **Protocol** — strong retrieval, full citation, act on it. *Irreversible high-stakes actions (drilling) happen only here.*
- 🟡 **Principles** — weak match → general stabilization guidance, labeled as such. Informs, doesn't direct surgery.
- 🔴 **Stop** — no safe guidance → stabilize, transfer, escalate. The system refuses to invent procedure. **Knowing when *not* to act is the headline safety feature.**

## Connectivity & hardware — future / roadmap (not core)

The **core product is the offline phone app** — it must stand alone with zero connectivity, because that's the case's reality.
- **Near-term:** opportunistic sync (even 30s of 2G) is enough to fire the queued handoff brief.
- **Future:** Starlink / facility connectivity (and any dedicated hardware) would make the warm handoff real-time where it's available — but that's a deployment *upgrade*, not part of the MVP or the core pitch. The offline core is the product.

## The knowledge layer & the open commons

Kyro runs on a **GraphRAG** stack (not a black-box LLM), with **tiered trust**:
- **Tier 0 — Canonical core** (WHO, WFNS, BTF, Peshawar). The critical path (EDH) lives here and is **never crowdsourced**.
- **Tier 1 — Verified expert contributions** — attributed, credential-checked, peer-reviewed; enriches edge cases, never overrides Tier 0 on the critical path.

Behind Kyro is **the first peer-reviewed open-source surgical knowledge commons for LMIC emergency neurosurgery.** Surgeons contribute field notes and regional adaptations — structured against procedure templates, entity-extracted into the graph, cross-linked to canonical guidelines, flagged where they diverge and why, peer-upvoted, permanently attributed. LMIC surgeons have the most relevant procedural experience for this context and are chronically *undercited*; Kyro makes every contribution citable, searchable, and impact-tracked — a new kind of academic credit. **The knowledge is open; the deployment is Kyro.**

## The flywheel

Every deployment generates structured logs of real TBI uncertainty moments in real procedures — data that exists nowhere in the literature. Gap signals cluster at exact decision points (when 50 GMOs hit 🟡 at posterior burr-hole placement, that becomes a targeted enrichment request to matched neurosurgeons). **The gap log is simultaneously the product roadmap, the research dataset, and the fundable artifact — and no competitor can replicate it without being deployed first.** (Mechanics in [05-architecture.md](05-architecture.md).)

## Validation

- **Mentor neurosurgeon sign-off** — the EDH knowledge bundle validated against the Peshawar guideline by a practicing neurosurgeon, this weekend.
- **MIMIC-4 concordance study** — Kyro's guidance concordance checked against real TBI clinical trajectories (a real dataset, not a prototype claim). *(Concordance, not an outcome RCT — say it that way.)*
- **Namibia design partners** — active GMO contacts in the field; real users in a real LMIC deployment context from day one.

## Architecture

- **MVP (this weekend):** Flutter Android app · Qwen3.5-2B Q4 via llama.cpp · Whisper (voice in) · Piper (voice out) · sqlite-vec + SQLite retrieval · hand-built EDH knowledge bundle. Full stack in [06-tech-stack.md](06-tech-stack.md).
- **Post-hackathon:** built on **Exo's cognitive substrate** — TRHN for temporal procedure tracking (the state machine), the DDM under the confidence gate for principled evidence accumulation, identity manifold for stable state across dropped connections.
- *Pitch note:* lead with the **auditable GraphRAG** story (it's what wins skeptical MDs); Exo is the scaling architecture, not a judge-facing claim.

## The business

**Kyro operates as Exo's philanthropic wing.** Exo builds the architecture; Kyro deploys it where it matters most; data and credibility flow back upstream.
- **Funding:** NGO licensing (MSF, Partners in Health), government ministry procurement at scale, Gates / Wellcome / Fogarty grants, academic data partnerships.
- **Beachhead:** **Namibia** — one country, one procedure, prove it, expand. *(We pitch the universal problem through the Pakistan vignette; we deploy first where we have partners.)*
- **Scale:** Mission:Brain's **130 chapters in 27 countries** is the contributor-network seed — every chapter a potential deployment + contributor node.
- **Competitors:** SurgiAI, the AI Virtual Operative Assistant, Indonesia tele-proctoring — **all assume connectivity, all fail at the moment Kyro is designed for.**

## The demo

One Flutter Android app, fully offline. HM's exact scenario (blown pupil, GCS 7, no CT, 23 min elapsed) → voice-navigate the EDH steps, each cited → hit an out-of-scope input, watch it gate to 🔴 and refuse to invent → simulate a connection drop mid-procedure (state captured) → reconnect, the handoff brief auto-generates → **turn WiFi off, still running.** *The WiFi-off moment is the demo.*

## The pitch line

> *The call dropped twice. Ours doesn't.*

## Why we win

A working demo, MIMIC-4 concordance, real design partners, a philanthropic structure, a defensible architecture, and a knowledge commons that compounds. It's built for the exact room we present in, for judges who know exactly what a dropped call costs.

*Kyro. Named for Chiron. Built for Asclepius.*
