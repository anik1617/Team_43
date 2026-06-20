# 03 — Solution Idea & Honest Evaluation

Origin: the brainstorm between Aniket & Gowrish (`../brainstorm with gowrish.txt`), evaluated against the case + evidence base. Yash flagged framing concerns (correctly — see doc 04).

## The idea

An **offline, "expert-in-the-loop" surgical co-pilot** — an "institutional twin" — that delivers a neurosurgeon's validated procedure to a non-neurosurgeon in real time, **narrowed to epidural-hematoma (EDH) burr-hole evacuation** (the case's exact procedure). It replaces the failure point in the case: the GMO's teleconsult to a distant neurosurgeon that **connected briefly, then dropped — twice.** Built as a **GraphRAG** stack — the team's earlier plan to use their product *Exo* was dropped (GraphRAG is simpler for an MVP and its source-provenance is a credibility upgrade with skeptical MD judges). An offline, on-device quantized model synthesizes answers from a local, **source-cited** knowledge graph that ships pre-loaded with canonical neurosurgery/surgery/triage knowledge and is grown by a **curated network of verified expert contributors** (the moat). Full design in [05-architecture.md](05-architecture.md).

**Important fact the team debated:** the case GMO had **general surgical training but no neurosurgery experience** (case p.5). So the target user is a *trained surgeon missing neuro-specific knowledge* — not a layperson. That makes the product far more defensible: it supplies the missing neuro knowledge + decision support, leveraging hands that can already cut.

## Why the instinct is right (strengths)

- **It's the most winnable pain point in the case.** Aniket's read nails it: *"the surgeon would have had no idea what to do if the neurosurgeon didn't give him specifics."* The case hands us the failure mode (the dropped call); HM survived on luck.
- **Endorsed by the field itself.** The organizers (neurosurgeons) put "real-time guidance system for non-neurosurgeons" on the **sanctioned pain-point list** (case p.9). The **Peshawar Recommendations** (Pakistan, WFNS) explicitly bless supervised non-specialist EDH evacuation. **Clark 2022** admits this exact task-shifting reality is invisible to global data.
- **"Works when the network/grid doesn't" is genuine white space.** Every comparable tool (Indonesia tele-proctoring, AI Virtual Operative Assistant, Australia rural guidelines) assumes connectivity. HM's case *is the proof* that connectivity fails when you need it most.
- **The differentiator is real** — not bolt-on GPT. The "institutional twin" framing (capture a top institution's approach, translate to local constraints) is novel and on-brand — now realized as a *curated expert-knowledge network* (the moat) rather than any proprietary model internals.

## The three load-bearing risks (must fix before pitching)

### Risk 1 — "Offline" (was the unsolved core — now addressed by the architecture)
The case forbids reliable internet, so the whole thing must run on-device. **Resolved** by the design in [05-architecture.md](05-architecture.md): a small quantized multilingual LLM does the synthesis on the phone over a local knowledge graph + vector index. The keystone move — **treat knowledge as versioned data, not model weights** — means we never train/distribute a model; we ship signed *data bundles* (with a sneakernet fallback), and the pre-loaded canonical core is always sufficient, so offline safety never depends on sync. Still the highest-risk *engineering* area (on-device model quality, storage), so that's where MVP effort should concentrate.

### Risk 2 — "Surgical intuition from podcasts/lectures" is the wrong data model
Surgical intuition is **tacit and procedural** — it lives in hands and apprenticeship, not slides. Lectures give *declarative* knowledge (what an EDH is, where the landmarks are), not split-second judgment. Training a model to *sound like* a confident neurosurgeon from podcasts builds something fluent and **wrong**. Use **codified, auditable** ground truth instead: operative manuals, the Peshawar guideline, Brain Trauma Foundation / WHO protocols, checklists, annotated procedure video. **Addressed** by the tiered knowledge model (doc 05): a canonical, guideline-grade **Tier 0** core owns the critical path; verified expert uploads (**Tier 1**) only enrich, with provenance — never "intuition from podcasts."

### Risk 3 — A generative "do this next" surgical oracle is unsafe AND unpitchable
Any LLM can hallucinate; in a deck that's awkward, in an OR it's fatal. **Reframe to a constrained, uncertainty-aware co-pilot:** the model retrieves and *sequences* pre-vetted, **source-cited** protocol steps; generative reasoning only triages/narrows, never invents technique. A **confidence/defer gate** is the safety feature — *"confidence below threshold → STOP, do not improvise, here's the stabilize-and-transfer fallback."* GraphRAG reinforces this: every step shows its source, so there's nothing un-cited to hallucinate. Knowing when **not** to act is what makes this safe enough to pitch. Drop "perfect neurosurgeon" entirely.

## Rubric fit

| Category (5 pts) | Current framing | After the 3 fixes |
|---|---|---|
| 1. Problem clarity | Strong — dropped-call moment is crisp | Strong+ |
| 2. Innovation | High idea, feasibility wobbles on offline + safety | High *and* feasible (edge model + confidence gate) |
| 3. Business model / market | Underdeveloped — who pays? competitors? | Beachhead = LMIC district hospitals / NGO rural units; out-flank tele-proctoring on offline |
| 4. Validation / MVP | Weak — "train on podcasts" isn't testable in a weekend | Strong — offline demo of HM's case, validated vs Peshawar + mentor |
| 5. Presentation / credibility | "Perfect neurosurgeon" gets attacked | "Constrained co-pilot, guideline-validated" survives Q&A |
| 6. Inspiration | Very high — "the call that didn't drop" | Very high |

The idea's ceiling is a winner; its current framing is soft in exactly the categories we're weakest in (2, 3, 4). Fixing the framing makes the strong version the one we pitch.

## The one-weekend MVP

Don't build a real surgical AI. Build **the demo that makes a judge feel the dropped call get answered:**

> An **offline phone/tablet app**. Input HM's exact scenario (blown pupil, GCS 7, no CT). It walks the GMO through EDH burr-hole evacuation **step-by-step, fully offline** — landmark ID, the operate-vs-transfer decision, and a confidence gate that says "stop and transfer" when uncertain. **Mid-demo, turn off WiFi** to show it doesn't care. Validate the *content* against the Peshawar guideline and a **mentor neurosurgeon** (the hackathon provides mentors).

That hits category 4 (a real, testable MVP), proves category 2 (offline = feasible), and the live WiFi-off moment is the category 6 mic-drop.
