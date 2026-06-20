# 04 — Judging Strategy & The Reframe (most important doc)

**The judging panel is mostly/all MDs, several are top neurosurgeons, and they are skeptical of AI.** This single fact should shape every decision we make. A teammate raised the alarm that an "AI that copies a surgeon's intuition and reasoning" goes against the grain of this audience and would demand concrete proof we can't produce in a weekend. That alarm is correct and important — and the FINALIZED architecture is built to make it moot.

## What the concern gets right (don't argue this)

Pitching *"we replicate a surgeon's intuition/reasoning"* to this panel is a losing move:
1. **It attacks their identity.** A neurosurgeon spent 15+ years building that intuition; an app claiming to bottle it reads as naïve, even insulting.
2. **The proof burden becomes impossible.** Claim *judgment* → "validated on how many patients, with what outcomes?" → we have no answer → vaporware to the exact people trained to spot it.
3. **AI-skeptic clinicians pattern-match "intuition-replicating AI" to hype** before we say anything real.

→ **The "intuition/reasoning replication" framing must die. So must the architecture that would have invited it.** Our small model does *not* reason on the critical path. A hand-authored, guideline-cited **deterministic clinical guidance tree** reasons; the model only listens, classifies the operator's answer, phrases the next question, and reads back the cited recommendation. The thing the panel fears — a free-reasoning "latent-space clinician" — is not what we built, and we say so out loud.

## The distinction the concern misses

"The framing is fatal" ≠ "the pain point is fatal." The underlying problem is **endorsed by the field itself**:
- The **organizers — neurosurgeons — put "real-time guidance system for a non-neurosurgeon" on the sanctioned pain-point list** (case p.9). They invited it.
- The **Peshawar Recommendations** (written in Pakistan, by the WFNS neurotrauma chair) explicitly endorse a **supervised non-specialist evacuating an EDH**, and call task-sharing the answer to the global access gap. This is *their* literature, *their* solution — it's the Lancet Commission on Global Surgery's agenda.

**The gradient already points our way — as long as the tool serves neurosurgeons' mission (extending their reach), not replaces them.** Same tool, opposite reception, decided entirely by framing.

**The sharper framing that sidesteps the AI fight entirely — and is the hero of the whole pitch:** the problem isn't *knowledge* — the case GMO had guidance and succeeded — it's **continuity**: the call dropped, twice. So the product (now named **Kyro**) isn't pitched as "an AI that knows surgery"; it's "the guidance that *never loses its place* when the call drops," powered by a **procedure state machine** that captures the encounter/operative state passively from voice, so a dropped call loses nothing and any reconnection auto-generates a pre-briefed expert handoff. That reframes everything around a failure mode every clinician in the room has lived, not around AI competence.

> **Do not pitch "the AI decides better than a flowchart."** On the actual operate-vs-transfer decision, a simple elastic-net was non-inferior to deep learning (Adil/Duke 2022) — a laminated card rivals an LLM there, and the panel knows it. Lead instead with **continuity + structured evidence-gathering discipline + hands-free voice + auditable citations.** That is the defensible ground. (Full product context: [07-kyro-product-and-pitch.md](07-kyro-product-and-pitch.md).)

## The judo move: make a neurosurgeon the hero

Reframe so the **expert is the author and the AI is a humble delivery mechanism:**

> "A world-class neurosurgeon's protocol — encoded as a guideline-cited decision tree — made available offline in a clinic 200km away, when the phone call drops. It drives a disciplined intake of the evidence (GCS, pupils, BP, lucid interval, lateralizing signs, mechanism, time-since-injury), walks *their* validated decision tree, recommends stabilization and the operate-vs-transfer call with the sources shown, and **knows its limits: on the irreducible surgical step it abstains and connects a live human expert.** It doesn't think for the surgeon. It carries the surgeon's protocol — and the surgeon's place in the conversation — to where the surgeon can't be."

What this fixes:
- **No "intuition" claim.** Intelligence = a deterministic tree (retrieval, sequencing, checklist enforcement) plus auditable citations — not invented judgment. Defensible, not threatening.
- **Proof burden collapses** from "did you replicate surgical judgment?" (impossible) to "did you faithfully encode the established guideline?" (a mentor neurosurgeon verifies the tree node-by-node, in the room).
- **The imaging wall is respected, not papered over.** We do **not** claim to guide the drilling — without a CT you cannot know where to drill, and software cannot supply imaging. Kyro decides *operate-vs-transfer*, stabilizes, and prevents secondary injury; the localization/surgical step is exactly where it abstains to a human.
- **Provenance + a guideline-boundary abstain gate become the safety story:** every recommendation shows its source (the cited graph), and when the tree cannot reach a guideline-sanctioned leaf — or an input is out of bounds — the tool says *"STOP and transfer / get an expert"* instead of guessing. The headline is *"the AI that knows when NOT to act."* Neurosurgeons love a junior who knows when to call for help.
- **The ultimate fallback is a human, not the AI:** on a critical case it can't safely cover, the system abstains and routes to the best *available* expert, handing them the pre-briefed state (the case's dropped call, fixed). To this panel, *"the AI's job is to summon one of you for the hardest cases"* is the strongest trust signal you can send — and it makes the experts the heroes. See [05-architecture.md](05-architecture.md).

## The one-line positioning (say this verbatim)

> **Kyro is a Verifiable Workflow Automator and Grounded Synthesizer — not a Latent-Space Clinician.**

This places us in the lowest-clinical-risk corner of the field taxonomy and explicitly disclaims the free-reasoning AI the judges fear. The deterministic tree reasons and is auditable; the model automates the workflow (voice intake, classification, phrasing) and synthesizes the *already-decided, already-cited* recommendation. "Cited" is not the point — **auditability** is: it shows its sources and flags any inference.

## Vocabulary: ban vs. use

| ❌ Loses the room | ✅ Wins the room |
|---|---|
| "replicates a surgeon's intuition/reasoning" | "task-sharing decision support" |
| "the AI reasons / extrapolates / decides" | "a deterministic, guideline-cited decision tree decides; the model only does voice I/O" |
| "AI neurosurgeon" / "perfect surgeon" | "Verifiable Workflow Automator + Grounded Synthesizer" |
| "guides the burr-hole / where to drill" | "drives evidence-gathering and the operate-vs-transfer decision; abstains on the surgical step" |
| "autonomous" / "replaces" | "expert-in-the-loop," "knows when to abstain" |
| "we trust the model when it's confident" | "we don't trust model confidence; we gate on the guideline" |
| "trained on lectures/podcasts" | "encodes the Peshawar / Brain Trauma Foundation protocol" |

## The win condition: validation as a set of deltas

We can't run a clinical trial, but we can **"win with science"** (the mentor's words): every headline metric is a **delta vs. a named baseline**, reported with calibration and abstention alongside accuracy (PROBAST armor), and honestly caveated (N≈30, single-rater, named first as a limitation).

| Validation | How (weekend-achievable on the supercomputer, not the phone) | What it proves to an MD |
|---|---|---|
| **Triage accuracy** | Operate-vs-transfer ≥80% exact / ≥90% within-safe-band, with a **directional confusion matrix** (errors cluster on the safe/transfer side) | "It's right, and when wrong it errs safe" |
| **Info-gathering completeness** | ≥0.90 (MedKGEval history-taking 0–2 metric) — proves the *discipline*, our real edge | "It asks what we'd ask" |
| **Guideline concordance + citation faithfulness** | ≥90% on critical-path steps; mentor neurosurgeon signs the tree node-by-node | "It says what we say, and shows its source" |
| **Abstention accuracy (THE safety number)** | ≥95% must-abstain recall, plus an honest false-abstention rate, plus AUROC vs the ~0.5 model-confidence baseline | "It fails safe — the thing they fear most, measured" |
| **vs. unaided generalist** | +20 to +25 points | A number, on their turf |
| **vs. generic LLM (the ablation ladder)** | bare Qwen → +graph → +spine → +gate | "The credibility comes from the structure, not the model" |

**The single most persuasive artifact is the spine-ablation collapse chart** — Kyro *with* the deterministic spine vs. *without* it. It shows, on stage, that the safety and accuracy live in the auditable guideline tree, not in an opaque model. The **safety/abstention demo** is the secret weapon: a live case where Kyro *declines* and routes to transfer will win AI-skeptic neurosurgeons more than any accuracy stat.

Eval tiers (name them as distinct distributions, never blended): **A** = 30–50 mentor-signed EDH vignettes (the HM case is #1 and the live demo; ~20 operate / ~10 transfer / ~10–20 must-abstain) — validation pillar #1; **B** = AMIE-style self-play synthetic dialogues (volume + fine-tune fuel, reported as engineering regression only, never headline); **C** = MIMIC-IV head-trauma slice (start PhysioNet/CITI credentialing **now** — it has days of lead time). Replace BLEU/Jaccard/BERTScore with concordance/triage/completeness/abstention.

## The Q&A answer to rehearse cold

> **"How does it know when it's wrong?"**
> "We don't trust the model's confidence — research shows a small model's confidence is near-random at predicting its own correctness (AUROC ~0.5; we cite that survey *against ourselves*). So we don't gate on confidence. We gate on the **guideline**: the deterministic tree either reaches a guideline-sanctioned leaf or it doesn't. If a required input is missing, if vitals contradict, if a value is out of protocol, or if any input falls outside the tree, it abstains and escalates to a human. The model never overrides that."

## The three paths (whole-team decision)

The reframe lowers risk but doesn't erase it — some clinicians have a "no AI near my patient" reflex no framing penetrates. Weigh team appetite:

1. **Reframe (recommended).** Keep the endorsed pain point; ship the humble, offline, abstains-on-the-guideline-boundary, citation-auditable co-pilot; lead with continuity + the clinical problem + the evidence, and reveal the neuro-symbolic engine (deterministic spine + cited graph + voice-only model) only if asked. Highest ceiling, uses our real asset, *with* the gradient — *if* we nail framing + bring the validation deltas and the spine-ablation chart.
2. **De-AI the front of the pitch.** Same problem; the hero is an offline guideline-delivery + continuity tool / decision aid; the engine runs underneath but we barely say "AI." Safer with allergic judges; slightly less differentiated.
3. **Pivot the pain point.** If the read is that *any* OR-adjacent AI sinks with this panel, equally strong lanes that still use our software edge and dodge the allergy: **prevention/education** (community TBI/concussion awareness), **rehabilitation** (offline family-as-therapist coaching — huge unmet need, zero OR-AI threat), or **diagnosis-without-imaging triage** (lower stakes than the OR).

## Bottom line

The teammates are right that the *old* framing — and the old "model reasons, gated by its confidence" architecture — would get torn apart. So we changed both. The pain point itself is the one the organizers and the neurosurgery establishment explicitly asked for. The winning version is the **humble, expert-in-the-loop, knows-when-to-abstain reframe, where a deterministic guideline tree does the reasoning and a small model only handles voice** — carried in with continuity as the hero, a guideline-validation delta table, the spine-ablation chart, and a mentor's blessing. That isn't against their gradient. That *is* their gradient.

The most valuable thing to build is exactly what makes the reframe safe and demonstrable: the **deterministic guideline spine, the source-cited graph behind every recommendation, and the abstain-on-guideline-boundary / "STOP and transfer" behavior as a first-class, demonstrable feature** — plus the dropped-call state machine that proves the continuity thesis. Not buried internals. (Architecture in [05-architecture.md](05-architecture.md).)
