# Team 43 — Mission:Brain Hackathon working docs

These docs capture everything the team has worked out so far, so anyone can get up to speed fast. Written 2026-06-19.

## Read in this order

1. **[01-case-brief.md](01-case-brief.md)** — the clinical case (patient "HM") distilled, plus a plain-English neuro glossary for non-medical teammates.
2. **[02-evidence-base.md](02-evidence-base.md)** — all 12 provided TBI research resources summarized, with key stats and how each connects to our case. This is our citation library for the pitch.
3. **[03-solution-idea-and-evaluation.md](03-solution-idea-and-evaluation.md)** — our leading idea (an offline, GraphRAG-based surgical co-pilot, enriched by a curated expert-upload network) and an honest evaluation of its strengths and risks.
4. **[04-judging-strategy-and-reframe.md](04-judging-strategy-and-reframe.md)** — the most important strategic doc: the judges are MDs / top neurosurgeons who are skeptical of AI, what that means for us, and how to reframe so we win the room instead of losing it.
5. **[05-architecture.md](05-architecture.md)** — the technical architecture: the offline on-device GraphRAG stack, the cloud→edge sync, privacy, speech/translation, and the MVP-vs-vision split.
6. **[06-tech-stack.md](06-tech-stack.md)** — the concrete 2026 tooling per layer (on-device LLM, ASR, TTS, MT, GraphRAG, mobile runtime, cloud build plane, escalation), with the weekend-MVP subset.
7. **[07-kyro-product-and-pitch.md](07-kyro-product-and-pitch.md)** — **the product, now named "Kyro": context & current framing** — the name, the *"continuity, not knowledge"* thesis, the procedure state machine, validation, business model, competitors, and the demo. (A context doc, not a locked pitch.)

## Where we are right now (status)

- **Phase:** converging on a named product (**Kyro**); MVP scoped, not yet built.
- **Leading pain point:** Surgical Task-Shifting (case pain point #6) — specifically the moment the GMO's teleconsult call kept dropping during HM's emergency burr-hole.
- **Leading idea — "Kyro":** an offline, on-device **GraphRAG** surgical co-pilot whose core innovation is a **procedure state machine** that never loses its place — so *the call can drop and nothing is lost*. Source-cited; ships with a canonical core; grows via a curated expert network. Sharpened thesis: **the problem isn't knowledge, it's continuity.**
- **Architecture:** specified in [05-architecture.md](05-architecture.md) — offline-first; "knowledge as versioned data, not model weights"; one provenance-tagged KG; sneakernet-friendly sync; patient data never leaves the device.
- **Edge-of-knowledge behavior** (doc 05): when the KB has a gap the product degrades gracefully (stabilize-and-transfer, never invents), self-heals via expert "knowledge requests" (open-source-issues-style), and escalates *critical* cases to a live matched expert over WhatsApp. This is arguably our strongest trust signal for the AI-skeptic panel.
- **Validation:** mentor neurosurgeon sign-off (this weekend) + MIMIC-4 concordance study + Namibia GMO design partners.
- **Business:** Kyro = Exo's philanthropic wing; NGO/ministry/grant funding; beachhead Namibia; Mission:Brain's 130 chapters as the contributor seed. (Starlink/hardware = future roadmap, not core.)
- **Open decision (whole team):** how hard to lean on the "AI" framing given an AI-skeptic neurosurgeon judging panel (doc 04's three paths), and how tightly to gate expert uploads (doc 05).

## Deliverable & judging (quick reminder)

- **5-minute pitch** + 2 min Q&A. Six categories × 5 pts = 30: (1) problem clarity, (2) innovation, (3) business model/launch, (4) validation/MVP, (5) presentation, (6) inspiration.
- **Hard constraints from the case:** unreliable internet, intermittent electricity, minimal trained staff, extreme poverty, geographic/cultural barriers.
- Source PDFs: `../Case Report and Hackathon Challenge/` (case, instructions, rubric) and `../TBI Resources/` (the 12 research papers).
