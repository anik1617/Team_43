# 04 — Judging Strategy & The Reframe (most important doc)

**The judging panel is mostly/all MDs, several are top neurosurgeons, and they are skeptical of AI.** This single fact should shape every decision we make. A teammate raised the alarm that an "AI that copies a surgeon's intuition and reasoning" goes against the grain of this audience and would demand concrete proof we can't produce in a weekend. That alarm is correct and important.

## What the concern gets right (don't argue this)

Pitching *"we replicate a surgeon's intuition/reasoning"* to this panel is a losing move:
1. **It attacks their identity.** A neurosurgeon spent 15+ years building that intuition; an app claiming to bottle it reads as naïve, even insulting.
2. **The proof burden becomes impossible.** Claim *judgment* → "validated on how many patients, with what outcomes?" → we have no answer → vaporware to the exact people trained to spot it.
3. **AI-skeptic clinicians pattern-match "intuition-replicating AI" to hype** before we say anything real.

→ **The "intuition/reasoning replication" framing must die.**

## The distinction the concern misses

"The framing is fatal" ≠ "the pain point is fatal." The underlying problem is **endorsed by the field itself**:
- The **organizers — neurosurgeons — put "real-time guidance system for a non-neurosurgeon" on the sanctioned pain-point list** (case p.9). They invited it.
- The **Peshawar Recommendations** (written in Pakistan, by the WFNS neurotrauma chair) explicitly endorse a **supervised non-specialist evacuating an EDH**, and call task-sharing the answer to the global access gap. This is *their* literature, *their* solution — it's the Lancet Commission on Global Surgery's agenda.

**The gradient already points our way — as long as the tool serves neurosurgeons' mission (extending their reach), not replaces them.** Same tool, opposite reception, decided entirely by framing.

## The judo move: make a neurosurgeon the hero

Reframe so the **expert is the author and the AI is a humble delivery mechanism:**

> "A world-class neurosurgeon's protocol, made available offline in a clinic 200km away — when the phone call drops. It delivers *their* validated steps, enforces the checklist, and **knows its limits: when uncertain, it says STOP and transfer.** It doesn't think for the surgeon. It carries the surgeon's knowledge to where the surgeon can't be."

What this fixes:
- **No "intuition" claim.** Intelligence = retrieval, sequencing, checklist enforcement, confidence gating — not invented judgment. Defensible, not threatening.
- **Proof burden collapses** from "did you replicate surgical judgment?" (impossible) to "did you faithfully encode the established guideline?" (a mentor neurosurgeon verifies it in the room).
- **Provenance + a confidence/defer gate become the safety story:** every recommendation shows its source (GraphRAG), and below a confidence threshold the tool says *"STOP and transfer"* instead of guessing. The headline is *"the AI that knows when NOT to act."* Neurosurgeons love a junior who knows when to call for help.
- **The ultimate fallback is a human, not the AI:** on a critical case it can't safely cover, the system finds the best *available* expert and connects them (the case's dropped call, fixed). To this panel, *"the AI's job is to summon one of you for the hardest cases"* is the strongest trust signal you can send — and it makes the experts the heroes. See `docs/05-architecture.md` → "At the edge of knowledge."

## Vocabulary: ban vs. use

| ❌ Loses the room | ✅ Wins the room |
|---|---|
| "replicates a surgeon's intuition/reasoning" | "task-sharing decision support" |
| "AI neurosurgeon" / "perfect surgeon" | "expert-authored, guideline-concordant, offline" |
| "autonomous" / "replaces" | "expert-in-the-loop," "knows when to defer" |
| "trained on lectures/podcasts" | "encodes the Peshawar / Brain Trauma Foundation protocol" |

## Concrete proof & testing (weekend-achievable, MD-respectable)

We can't run a clinical trial, but we can bring data this panel respects:

| Validation | How (weekend-doable) | What it proves to an MD |
|---|---|---|
| **Guideline concordance** | Encode the EDH protocol; a mentor neurosurgeon signs off step-by-step | "It says what we say" — authority respected |
| **Decision benchmark** | Run N clinical vignettes (operate vs transfer, EDH vs not) → % guideline-correct vs a generic LLM and vs unaided GMO | A number, on their turf |
| **Safety / refusal test** | Feed out-of-scope cases → show it correctly says **STOP/transfer** instead of guessing | "It fails safe" — the thing they fear most, handled |
| **Mentor-in-the-loop** | Use a hackathon mentor neurosurgeon to validate live; quote them | Social proof from one of their own |

**The safety/refusal test is the secret weapon.** A demo where the AI *declines* and routes to transfer will win AI-skeptic neurosurgeons more than any accuracy stat — it shows we understand the real danger is a confident-but-wrong machine, and we built against exactly that.

## The three paths (whole-team decision)

The reframe lowers risk but doesn't erase it — some clinicians have a "no AI near my patient" reflex no framing penetrates. Weigh team appetite:

1. **Reframe (recommended).** Keep the endorsed pain point; ship the humble, offline, defers-when-unsure, guideline-concordant co-pilot; lead with the clinical problem + evidence, reveal the GraphRAG engine only if asked. Highest ceiling, uses our real asset, *with* the gradient — *if* we nail framing + bring the validation table.
2. **De-AI the front of the pitch.** Same problem; the hero is an offline guideline-delivery + training tool / decision aid; the GraphRAG engine runs underneath but we barely say "AI." Safer with allergic judges; slightly less differentiated.
3. **Pivot the pain point.** If the read is that *any* OR-adjacent AI sinks with this panel, equally strong lanes that still use our software edge and dodge the allergy: **prevention/education** (community TBI/concussion awareness), **rehabilitation** (offline family-as-therapist coaching — huge unmet need, zero OR-AI threat), or **diagnosis-without-imaging triage** (lower stakes than the OR).

## Bottom line

The teammates are right that the current framing would get torn apart — and that should change the design now. But the pain point itself is the one the organizers and the neurosurgery establishment explicitly asked for. The winning version isn't "abandon it" or "defend it as-is" — it's the **humble, expert-in-the-loop, knows-when-to-stop reframe, carried in with a guideline-validation table and a mentor's blessing.** That isn't against their gradient. That *is* their gradient.

The most valuable thing to build is exactly what makes the reframe safe: **source-cited retrieval plus the confidence gate / "STOP and transfer" behavior as a first-class, demonstrable feature** — not buried internals. (Architecture in `docs/05-architecture.md`.)
