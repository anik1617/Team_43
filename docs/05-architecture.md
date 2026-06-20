# 05 — Technical Architecture

How the product actually works. Supersedes the "Built on Exo" framing in earlier docs: **the MVP is a neuro-symbolic stack — a deterministic clinical-guidance tree over a small source-cited GraphRAG knowledge graph, with a small on-device model relegated to language I/O only.** That structure is a deliberate upgrade for this audience: the reasoning on the critical path is done by an auditable, guideline-concordant tree, not by a model the judges (mostly/all MDs, several world-class neurosurgeons, AI-skeptical) are right to distrust (see [04-judging-strategy-and-reframe.md](04-judging-strategy-and-reframe.md)). **Cited ≠ traceable:** the win is **auditability** — the system shows its sources and flags inference — not that a model parrots retrieved text. See [08-build-plan-and-task-split.md](08-build-plan-and-task-split.md) for how this lands in the traversal loop + abstention gate.

**One line:** an offline, on-device mobile app where a hand-authored deterministic decision tree (each node carrying a Peshawar/BTF citation) walks a general medical officer through structured acute-TBI/EDH triage over a local source-cited knowledge graph — pre-loaded with a canonical guideline core and continuously enriched by a curated network of expert contributors. The model talks; the tree decides.

## What Kyro is (and is not)

Kyro is a **decision co-pilot**, not a procedure-guidance system. The re-aim that defines the architecture: **we do not "guide the burr-hole drilling."** The imaging wall is real and fatal to that claim — without a CT you cannot know where to drill, and software cannot supply imaging. Instead Kyro:

1. **decisively DRIVES structured evidence-gathering** (GCS, pupils, BP, lucid interval, lateralizing signs, mechanism, time-since-injury);
2. **walks a guideline decision tree** to the operate-vs-transfer decision;
3. **recommends stabilization + secondary-injury prevention + the operate-vs-transfer call**, with cited sources;
4. **ABSTAINS and connects a live human expert** on the irreducible surgical/localization step;
5. **captures the encounter by voice** to grow a community knowledge base.

**Hero / thesis: "continuity, not knowledge."** The differentiator is the dropped-call **procedure state machine**: it captures encounter state so a dropped call loses nothing and any reconnection auto-generates a pre-briefed handoff. We do **not** pitch "the AI decides better than a flowchart" — on the actual operate-vs-transfer decision a simple elastic-net was non-inferior to deep learning, i.e. a laminated card rivals the model there (see [09-prior-art-and-feasibility.md](09-prior-art-and-feasibility.md)). We lead with continuity + structured evidence-gathering **discipline** + hands-free voice + auditable citations.

## The keystone principle: separate three things

Most of the hard problems dissolve once you stop fusing these:

| | What it is | How it updates | Where it lives |
|---|---|---|---|
| **Knowledge** | KG content + the guidance tree (protocols, cases, papers, cited nodes) | as **versioned signed data**, by sync | build-plane master → shipped signed bundle on device |
| **Language I/O** | the quantized model that *talks* (ASR cleanup, answer classification, question phrasing, final synthesis from the reached leaf) | by a **model release** for I/O **behavior only** (format / parsing / phrasing) | shipped on device |
| **PHI** | the live patient's data | never | **on-device only, never synced** |

> **Knowledge = versioned signed data, never retrained weights.** The model may be re-trained for **I/O behavior only** (how it cleans text, classifies an answer, phrases a question, formats output) — **never as the knowledge source**. New expert knowledge enters as **KG/tree data, not a fine-tune**, and updating the field's knowledge = shipping a new signed **data bundle** (like offline Wikipedia/Kiwix or offline maps), not retraining and redistributing a model. Three reasons this separation holds no matter how good the model gets: **currency** (guidelines change faster than you can retrain + redistribute a model), **traceability** (a cited KG node shows its source — weights can't cite themselves), and **the moat** (the curated expert commons is *data*, contributed and reviewed). It's also *safer*: because uploads are reviewed data, not training signal, a bad contribution can't silently corrupt model behavior.

## The three layers (neuro-symbolic) — the inversion

This is the core of the architecture, and it **supersedes any earlier "the model reasons / extrapolates, gated by its confidence" framing.** The reasoning on the critical path is **deterministic and sits in veto position over the model.** The model never reasons on the critical path.

### L1 — Reasoning spine (the brain; the credibility core)
A hand-authored **deterministic clinical guidance tree (CGT)** in MedDM "IEET" format — one acute-TBI/EDH triage tree, **each node carrying a Peshawar/BTF citation** — executed by a CDM-style loop where **CODE decides traversal**: at each node it chooses **advance / act / ask**. The spine sits in **VETO position over the model**: the model cannot move the conversation, reach a conclusion, or emit a recommendation that the tree did not sanction.

Alongside the tree lives the **working-memory object** `<evidence, hypotheses, trajectory>` — this **is** the procedure state machine and the **continuity primitive** (see §"The procedure state machine"). It records what's been gathered, what's still open, and exactly where the encounter is.

### L2 — Knowledge (the source-cited graph)
A small, curated, source-cited **GraphRAG** graph (a ~160-node-class graph is proven sufficient for this scope), built on the **cloud build plane** (a cloud LLM API + light compute; no supercomputer needed — that's Gowrish's, reserved for the heavy evals) and shipped as a **signed SQLite bundle** (`edh-core-v{N}.kyro`). It uses MedGraphRAG's **Triple-Graph** idea (entity / source / definition) for citations and MedRAG's **discriminability** (1 / degree-centrality) to order questions **with no LLM call**. The graph supplies the cited content the spine's leaves synthesize from; it never decides traversal.

### L3 — Language I/O only (a mouth, not a brain)
A small quantized model (Qwen-4B-Q4) plus ASR and TTS. **English first; Urdu is roadmap** (on-device Urdu ASR is an unsolved research problem). The model does **four narrow jobs only**:
1. clean the ASR text;
2. classify the operator's answer at the current node (so the code can decide advance/act/ask);
3. phrase the next question;
4. synthesize the final **cited** recommendation from the reached leaf.

**Nothing load-bearing sits on the critical path inside the model.** A 4B model is not a reliable clinical reasoner (a fine-tuned 8B scored ~42% on USMLE; there is no 4B datapoint anywhere that would justify trusting it to reason), so it must **not** reason on the critical path. The deterministic tree reasons (auditable, guideline-concordant); the model talks. Repositioned in the field taxonomy, Kyro is a **"Verifiable Workflow Automator + Grounded Synthesizer"** — the lowest clinical-risk corner — and we explicitly disclaim the free-reasoning "Latent Space Clinician" the judges fear.

## Reference architecture

```
SUPERCOMPUTER (build plane, online)
  author the L1 CGT spine (MedDM IEET; each node cited to Peshawar/BTF)
  expert upload → de-identify → extract entities/relations + embed (BGE-M3, 1024-d)
  → merge into ONE master GraphRAG graph (tag each node/edge with source + trust-tier)
  → curate / peer-review → version + cryptographically sign → publish bundle
        │
        ▼   THE SEAM (build → edge): edh-core-v{N}.kyro
  signed SQLite bundle = manifest + chunks + chunk_vec + nodes + node_vec + edges (+ the CGT)
   • opportunistic DELTA sync when the device ever sees connectivity (git-pull for knowledge)
   • SNEAKERNET fallback: SD card / USB / a health-worker's phone carries the latest bundle
   • SLICEABLE modules: a clinic pulls only "emergency neurotrauma core" if storage is tight
   • BGE-M3 1024-d pinned BYTE-IDENTICAL on both planes (the #1 project-killer if mismatched)
        │
        ▼
EDGE (serve plane, OFFLINE on the phone)
  L1 deterministic CGT spine (advance/act/ask)  ── VETO over ──>  L3 model (language I/O only)
        executes over  L2 local GraphRAG graph + sqlite-vec
  drive evidence-gathering → traverse → reach a guideline leaf → CITE → synthesize
  ABSTAIN on boundary / missing evidence → "STOP, stabilize & transfer" (+ live human handoff)
  PHI stays local · runs with the radio off · runs on a charged battery (no grid)
```

**The rule that makes "offline" and "up-to-date" stop fighting:** the pre-loaded **canonical core is always sufficient on its own.** Sync only *enriches*; the device is never *dependent* on it to safely handle the critical path. Freshness is best-effort; function and safety are guaranteed by what ships. (This is also the "deployable in any room, any country" story — sneakernet + a sufficient core means the country doesn't need working internet at all. Phone battery also sidesteps the case's intermittent-grid constraint.)

## Component decisions

### Knowledge graph — one unified, provenance-tagged graph
Not per-expert silos. Reasons: cross-links *are* the point of a graph (silos degrade to a federation of sparse mini-RAGs); one signed bundle is far easier to ship/slice offline than N graphs + an on-device router; conflicts get surfaced instead of hidden.

| | Per-expert KGs + routing | **Unified KG + provenance (chosen)** |
|---|---|---|
| Retrieval quality | weaker — siloed, sparse | stronger — cross-links |
| Offline distribution | hard — N graphs + router | easy — one sliceable bundle |
| "Consult Dr. X" / institutional twin | native | a **filtered view** (`source = Dr X`) |
| Conflicting advice | hidden | surfaced + reconcilable |
| Complexity | high (routing breaks offline) | lower |

Your routing intuition still applies — it's *subgraph retrieval within one graph* (normal GraphRAG), not routing *between* graphs. "Consult Dr. X" / "institutional twin" = a metadata filter, not a physical silo.

### The expert network = curation = moat = safety = credibility (one mechanism)
"Any doctor can upload" gets attacked instantly: *"how do you stop wrong/idiosyncratic advice from reaching a GMO mid-emergency?"* The answer is a **trust-tiered, provenance-first knowledge commons**:

- **Tier 0 — Canonical core** (WHO, WFNS/Peshawar, Brain Trauma Foundation, vetted texts). **The critical path — the EDH triage tree and the operate-vs-transfer decision — lives here and is NEVER crowdsourced.** The spine traverses Tier 0 for any life-or-death step.
- **Tier 1 — Verified expert contributions** (attributed, credential-checked, peer-upvoted). Enriches edge cases / regional adaptations / "how I did it with what I had," *labeled as such*, never overriding Tier 0 on the critical path.
- **Provenance on every recommendation** ("source: WFNS guideline" / "Dr. X, Aga Khan University"). Citing a neurosurgeon's own literature back to them is the credibility move.

**Accounts:** require **verified-contributor accounts** (license/affiliation check — manual is fine for MVP). "No account, anyone appends" is a non-starter for medical content (no accountability; a data-poisoning vector). Accounts are the backbone of the moat *and* the safety story.

> Curation isn't overhead bolted on for safety — it **is** the product: "a peer-reviewed, offline knowledge commons for emergency neurosurgery in low-resource settings, curated by the global neurosurgery community." That's the moat (network effects), the safety mechanism (tiered trust + provenance), and the pitch (serves their mission; makes them the authors) — all at once. Layering (canonical for the critical path, crowdsourced for enrichment) is what lets moat and safety coexist. *(For the MVP the full contribution flywheel/portal is storyboarded, not built — see §"The self-healing flywheel" and the MVP table.)*

### The model — language I/O only, on the lowest-risk path
A small quantized model (Qwen-4B-Q4) on the device. **It does not reason on the critical path.** It performs its four narrow jobs (clean ASR text, classify the answer, phrase the next question, synthesize the cited recommendation from the reached leaf) and is kept honest by the spine's veto and the abstention gate below. Output stays structured so the labels and provenance are machine-enforced, and a Karamanlioglu-style **3-pass constrained-prompt output stage** plus a **rule-based herniation-escalate safety net the model cannot override** wrap the synthesis step. *Knowing when NOT to act — enforced by the tree, not by the model's self-judgment — is the headline safety feature.*

### Safety model — abstention is NOT gated on model confidence (the inversion)
This reverses any earlier "abstention gated on confidence × grounding × stakes" framing. The abstention gate fires on **structural, deterministic** conditions:

- **(a) the deterministic tree reaching (or failing to reach) a guideline-sanctioned leaf** — no leaf, no recommendation;
- **(b) hard out-of-bounds rules** — missing required inputs, contradictory vitals, out-of-protocol values, **any out-of-tree input**;
- **(c) "cannot terminate while critical evidence is missing."**

Model confidence is a **weak SECONDARY flag only.** Self-reported confidence is near-random at predicting correctness (AUROC ~0.5 in the UQ survey, arXiv:2602.05073) — we **cite that against ourselves** rather than lean on it. **Read-back confirmation** of every critical field before it enters the tree is the anti-sycophancy guard: *"I heard left pupil fixed, correct?"*

**HARD architectural rules (latency + safety):**
- **NO multi-agent, NO MCTS, NO self-consistency on the critical path.** Multi-round schemes run ~70s/question on a *server GPU* — minutes per case on a phone. We reserve N=2–3 sampling **only** for the single operate-vs-transfer checkpoint.
- **The rule-based herniation-escalate safety net cannot be overridden by the model.**

### Privacy — two flows, privacy-by-architecture
1. **Uploaded teaching content (build plane):** may contain PHI → **de-identify at ingestion** (automated scrub of Safe-Harbor-style identifiers — names, dates, MRNs, locations, faces in images — + a human confirmation step before it enters the KG). Clinically lossless: teaching content is about the *medicine*, not the patient.
2. **In-room use (live patient):** inference is offline/on-device → **the patient's data never leaves the room.** Stronger privacy than any cloud product, and a selling point to MDs. MVP: local-only processing, no identifiable logging, ephemeral sessions wiped after use.

HIPAA is US-specific; internationally the *principle* (and GDPR-style thinking) is what matters. Keep the regulatory-lightest posture: **clinician-in-the-loop decision support, not autonomous.**

### Speech + translation — move the heavy work off-device
Voice matters because a GMO **can't tap a screen mid-emergency** — hands-free is a necessity. The model handles ASR cleanup, answer classification, question phrasing, and synthesis; ASR/TTS run on-device.

| Need | Where it runs | MVP approach |
|---|---|---|
| Localize corpus (English lit → local language) | **Build plane, once per release** | Pre-translate; ship language bundles (don't translate at query time) — **roadmap** |
| User's spoken input → text | On-device ASR | whisper.cpp; **English first**, constrained command set |
| Output to the operator | On-device | Piper / OS-TTS |
| Urdu and tiny local languages (Shina, Balti, Wakhi) | — | **Out of v1 scope — say so honestly; on-device Urdu ASR is an open research problem** |

Own the irony: a low-resource *region* often speaks a low-resource *language* with little NLP support. **English (the medical lingua franca) is the honest v1**; Urdu and the long tail are roadmap.

**Stack (verify versions against current 2026 options before committing):** Microsoft GraphRAG (build) + BGE-M3 embeddings (1024-d, **byte-identical on both planes**) + sqlite-vec + op-sqlite on React Native; Qwen-4B-Q4 via llama.rn; whisper.cpp (ASR); Piper/OS-TTS. See [06-tech-stack.md](06-tech-stack.md).

## At the edge of knowledge — degradation, self-healing & human escalation

The hardest question for any retrieval system: **what happens when the knowledge base has nothing good for the scenario in front of the user?** The naive RAG failure is *not* silence — it's a weak/tangential match that a free-reasoning model confidently synthesizes into a plausible, un-vetted plan. That is the lethal outcome, and it's exactly why the model is barred from reasoning on the critical path. The design goal is **degrade gracefully, gated by deterministic boundaries**: when the tree cannot reach a sanctioned leaf, or required evidence is missing, or the input falls outside the tree, the system **abstains** and drops to stabilize-and-transfer — it never lets the model invent a procedure to fill the gap.

### 1. Gap detection — knowing it doesn't know
The whole edge behavior depends on detecting the gap — which is also the #1 credibility feature for skeptical MDs ("an AI that admits when it's out of its depth"). Detection is **structural, not a single similarity score**:
- **Out-of-tree input** — the operator's situation doesn't map onto any node/branch of the CGT → boundary hit. (If the case is "EDH + pregnant + on warfarin" and the tree has no branch for anticoagulation, that's a gap on the dimension that matters most — even though generic EDH content is in the graph. This is where naive RAG kills people.)
- **Retrieval coverage** — do retrieved sources actually cover the *key entities* of the scenario the leaf needs to synthesize?
- **Missing-evidence check** — the tree cannot terminate while a critical input (e.g. pupils, GCS) is unconfirmed.
- **Fail-safe default** — absence of a sanctioned leaf drops a tier; when unsure, stabilize-and-transfer, not "best guess."

*(Honest caveat: we lean on deterministic boundaries precisely because calibration on small on-device models is genuinely hard and self-reported confidence is near-random. The MVP demonstrates the gating mechanism on a few hand-picked gap scenarios, not robust model calibration.)*

### 2. The graceful-degradation ladder (a traffic light)
The system runs in modes, gated by **whether the deterministic tree reached a sanctioned leaf**, and **shows the user which mode it's in**:

| Mode | When | What it does | Trust |
|---|---|---|---|
| 🟢 **Protocol** | Tree reached a guideline-sanctioned leaf, retrieval covers it | Step-by-step, **cited**, guideline-concordant | High — act on it |
| 🟡 **Principles** | Tree branch incomplete / partial match | General stabilization, labeled "general guidance, not a validated protocol for your case"; conservative | Low — informs, doesn't direct surgery |
| 🔴 **Stop** | Boundary hit / out-of-tree / missing critical evidence | "STOP. Stabilize per below. Here's your escalation path." | Stabilize + escalate only |

**The rule that keeps it safe:** an irreversible, high-stakes call (operate) requires 🟢 Protocol — a tree leaf with cited content — **never** a weak match and **never** model improvisation. Low-risk, reversible actions (elevate head, secure airway, avoid hypotension, *don't* give drug X) are safe in 🟡 Principles because they are broadly correct guideline-grade stabilization and hard to make worse.

The 🟡 principles layer is itself guideline-grounded — the established "prevent secondary injury + stabilize + transfer within the golden window" standard (Peshawar, Khellaf), shipped as cited nodes, not generated freehand. **Design directive:** the cold-start core must ship the *general* frameworks (trauma ABCs, raised-ICP management, the stabilize-vs-transfer decision tree), not only specific procedures — that general layer is what catches the long tail.

### 3. The self-healing flywheel — gaps become the moat
A gap isn't just handled, it's harvested. Modeled on **open-source issues + pull requests, for clinical knowledge** (gaps = issues with a count = priority; contributions = PRs; the canonical core = `main`). *(Storyboarded for the pitch; the full portal is post-v1.)*

```
GMO hits a boundary (offline) → device logs a de-identified "knowledge request"
  → on reconnect, request syncs to the build plane
  → similar requests CLUSTER into one ranked "need" (+count, +urgency)
  → pushed to matched subspecialists AND visible on an open request board
  → an expert contributes data/protocol      ← a "pull request," not a direct push
  → REVIEW GATE: credential check + multi-reviewer + conflict detection
  → merges as Tier-1 *provisional* (labeled), hardens toward canonical over time
  → ships in next signed bundle → every device heals
  → requester notified: "the scenario you flagged now has guidance"
```

**The rule that keeps it safe: contributions are pull requests, not pushes to `main`.** A new contribution enters as Tier-1 *provisional* (labeled single-expert/unreviewed) and only hardens toward canonical after multi-reviewer consensus — especially on the critical path. So the graph heals *fast* (a labeled provisional answer beats nothing) without *fast = unsafe*.

Make it work: **aggregate** requests into ranked needs (clean signal; the count motivates contributors; and abstracting to the *clinical pattern* protects privacy — a detailed case in a small district can re-identify even when "de-identified"); **push** to the right subspecialist (not just a passive board — better quality, survives cold-start); and **engineer incentives** (citable attribution, CME credit, impact metrics) so busy experts actually show up.

Strategic note: the **gap log is the most valuable asset you own** — a ranked, ground-truth map of unmet clinical need in real LMIC emergencies that no competitor or journal has. It's simultaneously your product roadmap, your research dataset, and a fundable artifact.

### 4. Human escalation — when only a human will do
When the system hits a boundary on a **critical** case **and** the user is **online**, it does the most responsible thing possible: find the best *available* opted-in expert and connect them, human-to-human. This redeems the case's core failure (the teleconsult that dropped) — and for an AI-skeptic neurosurgeon panel it is the strongest trust signal in the product: *the AI's highest function is knowing when to get out of the way and summon a human.*

The full acute decision at the edge:
```
Tree abstains (boundary / out-of-tree / missing evidence) on a case:
  ├─ not critical .............. 🟡 principles guidance + log async knowledge request
  ├─ critical + offline ........ 🔴 stabilize & transfer + queue store-and-forward consult
  ├─ critical + online + a matched expert is AVAILABLE
  │     ........................ 🆘 warm human handoff (pre-briefed) — 🔴 stabilization runs in parallel
  └─ critical + online + no one available
        ........................ async store-and-forward + 🔴 stabilize   (never a dead end)
```

Design rules:
- **Match on availability, not just expertise** — the best *reachable-now* expert beats the best one asleep. Weight by on-call status × timezone × language × responsiveness; produce a **ranked fallback list** (no answer in ~60s → next). A global volunteer pool gives near follow-the-sun coverage.
- **Structured warm handoff, not a cold number** — the procedure state machine already captured the structured case (vitals, GCS, pupils, mechanism, what's been tried, where the tree abstained); push that brief to the expert *with* the request so they pick up already reading the case. Turns a 10-minute fumble into a 60-second consult.
- **Proxy the channel; protect & consent the expert** — WhatsApp is the right LMIC channel (ubiquitous, low-bandwidth, voice/images, E2E-encrypted), but **mask the expert's number** (per-consult relay, Uber-style) for privacy, auditability, and to survive the first bad experience. Granular opt-in (windows, subspecialty, frequency) + one-tap decline → routes to next. *(Real masked-WhatsApp escalation is roadmap; v1 demonstrates the pre-briefed handoff brief.)*
- **Ration escalation** — gate to *critical* ∧ *tree-abstained* ∧ *online*; over-paging burns out the volunteer corps and the supply side collapses.
- **Parallel stabilization + a floor** — 🔴 stabilize-and-transfer runs *while* connecting; if no human lands, fall to async store-and-forward, then offline principles. The human tier is the *best* outcome when available, never a single point of failure.

**Medico-legal flag (a judge will raise it):** a remote expert advising a GMO across borders has real licensing/liability questions (cross-jurisdiction "curbside consults"). Defensible posture: **peer-to-peer advisory support; the treating clinician retains authority and responsibility**; consent + audit logging; full cross-border telemedicine compliance is an honest roadmap item for partners (medical societies, NGOs). Naming the limit is itself credibility.

### 5. The procedure state machine — *never lose your place* (the core innovation)
This is the working-memory object `<evidence, hypotheses, trajectory>` from L1 — the **continuity primitive**. Running continuously in the background, **passively, from voice alone** (no extra input from the GMO), it maintains live encounter state:
- every confirmed input and completed step, timestamped;
- current patient state (GCS, pupils, BP, drugs given, time since injury);
- the current tree node + abstention-gate status;
- exactly where the tree abstained or uncertainty arose.

**Why it matters:** when the call drops, the state is *already captured* — nothing is lost. When any connectivity returns (even 30s of 2G), it pushes a compressed state packet and auto-generates the **pre-briefed handoff brief** of §4, so the next expert picks up *mid-encounter in ~10 seconds, not from zero*:
> *Acute EDH triage, 23 min elapsed. Evidence gathered: GCS 6 (down from 14), left pupil fixed dilated, right-sided weakness, BP 160/90, mannitol given 18 min ago, ~2 h since injury, lucid interval present. Tree reached the operate-vs-transfer checkpoint and abstained on the irreducible localization step (no imaging). Needs: expert guidance on whether to attempt evacuation locally vs. transfer.*

This is the sharpened thesis in code: **the problem isn't knowledge, it's continuity** — the state machine is what makes "the call dropped, nothing was lost" literally true. *(MVP: a lightweight local state object updated from the ASR stream. Post-hackathon: Exo's TRHN temporal tracking + identity manifold are the scaling substrate built to power exactly this — a roadmap footnote, not a dependency; the offline core stands alone.)*

### Success, redefined
The target isn't omniscience — it's **never leave the GMO worse off than the phone call that dropped.** A total knowledge miss that yields correct stabilization + a clean escalation path is a *win*, not a failure. And the safest demo you can give an AI-skeptic neurosurgeon is the boundary case done right: the tree recognizes it can't help, the model is structurally barred from inventing a procedure, the system drops to stabilize-and-transfer, fires a pre-briefed human handoff, and logs the request — proving the one thing they need to believe: *it won't confidently hurt someone.*

## MVP vs. Vision — draw this line or category 4 suffers

| | What we DO this weekend (build deeply) | What we STORYBOARD (the vision) |
|---|---|---|
| Device | one phone, fully offline | fleet / multi-clinic deployment |
| Scenario | HM's exact EDH case → drive evidence-gathering → traverse the CGT → **cite** → recommend → **abstain** on an out-of-tree case | full neuro/surgery/triage breadth |
| Knowledge | the hand-authored EDH CGT spine + a small canonical-core GraphRAG bundle | the curated expert-upload network |
| Reasoning | deterministic L1 tree + L3 model for I/O only | — |
| Sync | n/a (ships with the core) | versioned signed bundles + delta + sneakernet |
| Language | English only | Urdu + full multilingual + corpus pre-translation |
| Privacy | local-only patient input | full de-ID pipeline + audit |
| Edge behavior | boundary → 🟡 stabilize + a *pre-briefed* 🆘 handoff to one on-call mentor; demo the boundary case | full degradation ladder + self-healing flywheel + global on-call network + masked WhatsApp |

The judges score a deep, working, *safe-failing* offline core far higher than a broad demo of a platform that doesn't exist yet. **The WiFi-off moment is the demo.** Validate the core's content and the CGT against the Peshawar guideline + a mentor neurosurgeon.

## What a neurosurgeon judge will attack (one-line answers)

- *"Who validates the content?"* → Trust tiers; the critical-path CGT is canonical-only and mentor-signed; verified contributors; peer review.
- *"What if the offline copy is stale?"* → Core is always sufficient; sync only enriches; safety never depends on freshness.
- *"What stops it hallucinating a step?"* → The model can't reason on the critical path — a **deterministic guideline tree** does, in veto position; every recommendation is a **cited tree leaf**; it **abstains** on any out-of-tree / missing-evidence / boundary condition. Confidence isn't the gate (self-reported confidence is ~0.5 AUROC — we cite that against ourselves).
- *"Isn't a flowchart just as good on the decision?"* → On the bare operate-vs-transfer call, largely yes (a simple model was non-inferior to deep learning). Our value is **continuity** (the dropped-call state machine), evidence-gathering **discipline**, hands-free voice, and **auditable citations** — not "the AI decides better."
- *"Patient privacy?"* → Offline = data never leaves the room; uploads are de-identified.
- *"Will it work in the actual languages?"* → English for v1 (medical lingua franca); Urdu and the long tail are honest roadmap (on-device Urdu ASR is an open problem).
- *"Liability?"* → Decision support, clinician-in-the-loop, source-cited — not an autonomous surgeon; the treating clinician retains authority.
- *"What if you have nothing for the case?"* → The tree abstains (never invents procedure), degrades to stabilize-and-transfer, escalates critical cases to a live matched expert when online, and logs the gap to self-heal. See **At the edge of knowledge**.

## Open decisions (genuinely the team's call)

1. **How tightly to gate uploads** — open-but-moderated wiki vs. invite-only verified board for v1 (moat-speed vs. safety/credibility). Lean: invite-only-verified at launch, loosen later.
2. **How much of the platform to even mention** vs. lead purely with the offline in-room hero (doc 04's "de-AI the front" question).
3. **Specific stack picks** (GraphRAG library version, the quantized model, on-device ASR, TTS) — validate against current 2026 benchmarks before committing; BGE-M3 1024-d must be byte-identical on both planes.
4. **How fast provisional contributions influence guidance** — heal-fast-and-label vs. gate-hard-before-anything-ships (lean: provisional → 🟡 principles only; canonical-reviewed → 🟢 protocol).
5. **Escalation specifics** — raw number vs. proxied/masked channel, and how aggressively to ration human pages to protect the volunteer corps.
6. **Open-source KB** — an undecided lever tied to the business model; lean hybrid (open the Tier-0 canonical core for trust/adoption; keep the contribution platform + provenance + the gap-log/flywheel as the moat).
