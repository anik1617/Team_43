# 05 — Technical Architecture

How the product actually works. Supersedes the "Built on Exo" framing in earlier docs: **the MVP uses a plain GraphRAG stack, not Exo.** That's a deliberate upgrade for this audience — GraphRAG's defining property is that **every output traces to a cited source**, which is exactly what wins AI-skeptic MD/neurosurgeon judges (see [04-judging-strategy-and-reframe.md](04-judging-strategy-and-reframe.md)).

**One line:** an offline, on-device mobile app where a small quantized multilingual model *synthesizes* answers from a local, source-cited knowledge graph — pre-loaded with canonical neurosurgery/surgery/triage knowledge and continuously enriched by a curated network of expert contributors.

## The keystone principle: separate three things

Most of the hard problems dissolve once you stop fusing these:

| | What it is | How it updates | Where it lives |
|---|---|---|---|
| **Knowledge** | KG content (protocols, cases, papers) | as **versioned data**, by sync | cloud master → shipped snapshot on device |
| **Intelligence** | the quantized model that *synthesizes* | rarely (a model release) | fixed, shipped on device |
| **PHI** | the live patient's data | never | **on-device only, never synced** |

> The hardest-sounding problem — "how do we bridge cloud uploads getting *trained* and distribute them offline" — is hard only because of the word *trained*. **We don't train.** New expert knowledge enters as **KG data, not model weights**. Updating the field's knowledge = shipping a new **data bundle** (like offline Wikipedia/Kiwix or offline maps), not retraining and redistributing a model. This is also *safer*: no fine-tuning means a bad upload can't silently corrupt model behavior, and every answer stays traceable to a cited node.

## Reference architecture

```
CLOUD (build plane, online)
  expert upload → de-identify → extract entities/relations + embed
  → merge into ONE master KG (tag each node/edge with source + trust-tier)
  → curate / peer-review → version + cryptographically sign → publish bundle
        │
        ▼   THE BRIDGE (cloud → edge)
  signed, versioned knowledge bundles (immutable releases, like app/OTA updates)
   • opportunistic DELTA sync when the device ever sees connectivity (git-pull for knowledge)
   • SNEAKERNET fallback: SD card / USB / a health-worker's phone carries the latest bundle
   • SLICEABLE modules: a clinic pulls only "emergency neurotrauma core" if storage is tight
        │
        ▼
EDGE (serve plane, OFFLINE on the phone)
  quantized multilingual model + local KG + vector index + voice I/O
  retrieve → CITE → synthesize → DEFER if confidence low ("STOP, stabilize & transfer")
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
"Any doctor can upload" gets attacked instantly: *"how do you stop wrong/idiosyncratic advice from reaching a GMO mid-surgery?"* The answer is a **trust-tiered, provenance-first knowledge commons**:

- **Tier 0 — Canonical core** (WHO, WFNS/Peshawar, Brain Trauma Foundation, vetted texts). **The critical path — EDH evacuation — lives here and is NEVER crowdsourced.** The model *prefers* Tier 0 for any life-or-death step.
- **Tier 1 — Verified expert contributions** (attributed, credential-checked, peer-upvoted). Enriches edge cases / regional adaptations / "how I did it with what I had," *labeled as such*, never overriding Tier 0 on the critical path.
- **Provenance on every recommendation** ("source: WFNS guideline" / "Dr. X, Aga Khan University"). Citing a neurosurgeon's own literature back to them is the credibility move.

**Accounts:** require **verified-contributor accounts** (license/affiliation check — manual is fine for MVP). "No account, anyone appends" is a non-starter for medical content (no accountability; a data-poisoning vector). Accounts are the backbone of the moat *and* the safety story.

> Curation isn't overhead bolted on for safety — it **is** the product: "a peer-reviewed, offline knowledge commons for emergency neurosurgery in low-resource settings, curated by the global neurosurgery community." That's the moat (network effects), the safety mechanism (tiered trust + provenance), and the pitch (serves their mission; makes them the authors) — all at once. Layering (canonical for the critical path, crowdsourced for enrichment) is what lets moat and safety coexist.

### The model — a constrained synthesizer, not an author
A small quantized multilingual LLM on the device. **Its job is narrow:** retrieve vetted content, **cite it**, and *sequence/present* it — not free-generate surgical technique. Heavy output templating + structured steps + mandatory citations keep it inside the rails. A **confidence/defer gate** is a first-class, demonstrable feature: below threshold → "STOP, stabilize & transfer," with the fallback shown. *Knowing when NOT to act* is the headline safety feature.

### Privacy — two flows, privacy-by-architecture
1. **Uploaded teaching content (cloud):** may contain PHI → **de-identify at ingestion** (automated scrub of Safe-Harbor-style identifiers — names, dates, MRNs, locations, faces in images — + a human confirmation step before it enters the KG). Clinically lossless: teaching content is about the *medicine*, not the patient.
2. **In-room use (live patient):** inference is offline/on-device → **the patient's data never leaves the room.** Stronger privacy than any cloud product, and a selling point to MDs. MVP: local-only processing, no identifiable logging, ephemeral sessions wiped after use.

HIPAA is US-specific; internationally the *principle* (and GDPR-style thinking) is what matters. Keep the regulatory-lightest posture: **clinician-in-the-loop decision support, not autonomous.**

### Speech + translation — move the heavy work off-device
Voice matters because a surgeon **can't tap a screen mid-burr-hole** — hands-free is a necessity. But good ASR/MT are usually cloud-scale, which fights the offline rule. Resolve by doing the heavy lifting where compute is cheap:

| Need | Where it runs | MVP approach |
|---|---|---|
| Localize corpus (English lit → local language) | **Cloud, once per release** | Pre-translate; ship language bundles (don't translate at query time) |
| User's spoken input → text | On-device ASR | Small quantized ASR (Whisper-small class), constrained command set, **Urdu + English first** |
| Output in local language | On-device multilingual model | Generate **directly** in the target language |
| Tiny local languages (Shina, Balti, Wakhi) | — | **Out of MVP scope — say so honestly** |

Own the irony: a low-resource *region* often speaks a low-resource *language* with little NLP support. Urdu (well-supported) + English (medical lingua franca) is a credible, honest MVP; the long tail is roadmap. *(Specific model picks should be validated against current 2026 options before committing.)*

## At the edge of knowledge — degradation, self-healing & human escalation

The hardest question for any retrieval system: **what happens when the knowledge base has nothing good for the scenario in front of the user?** The naive RAG failure is *not* silence — it's a weak/tangential match that the model confidently synthesizes into a plausible, un-vetted surgical plan. That is the lethal outcome. So the design goal is **degrade gracefully and never fabricate procedure**; "extrapolate" must mean *generalize to safe principles*, not *invent an operation*.

### 1. Gap detection — knowing it doesn't know
The whole edge behavior depends on detecting the gap — which is also the #1 credibility feature for skeptical MDs ("an AI that admits when it's out of its depth"). Don't trust a single similarity score:
- **Retrieval coverage** — do retrieved sources actually cover the *key entities* of the scenario? (If the case is "EDH + pregnant + on warfarin" and nothing retrieved mentions pregnancy/anticoagulation, that's a gap on the dimension that matters most — even though generic EDH content came back. This is where naive RAG kills people.)
- **Grounding check** — is every claim in the draft answer supported by a retrieved citation? Un-cited claims are cut, not surfaced.
- **Fail-safe default** — absence of strong evidence drops a tier; when unsure, stabilize-and-transfer, not "best guess."

*(Honest caveat: calibration on small on-device models is genuinely hard. The MVP should demonstrate the mechanism on a few hand-picked gap scenarios, not claim robust calibration everywhere.)*

### 2. The graceful-degradation ladder (a traffic light)
The system runs in modes, gated by evidence strength, and **shows the user which mode it's in**:

| Mode | When | What it does | Trust |
|---|---|---|---|
| 🟢 **Protocol** | Strong, specific retrieval | Step-by-step, **cited**, guideline-concordant | High — act on it |
| 🟡 **Principles** | Gap / weak match | General stabilization + reasoning, labeled "general guidance, not a validated protocol for your case"; conservative | Low — informs, doesn't direct surgery |
| 🔴 **Stop** | No safe guidance | "STOP. Stabilize per below. Here's your escalation path." | Stabilize + escalate only |

**The rule that keeps it safe:** gate the *boldness* of guidance by **evidence strength × action reversibility.** An irreversible, high-stakes action (a burr hole) requires 🟢 Protocol mode with cited content — never a weak match. A low-risk, reversible action (elevate head, secure airway, avoid hypotension, *don't* give drug X) is safe in 🟡 Principles mode because it's broadly correct and hard to make worse.

The 🟡 principles layer is well-grounded — it's the established "prevent secondary injury + stabilize + transfer within the golden window" standard (Peshawar, Khellaf). **Design directive:** the cold-start core must ship the *general* frameworks (trauma ABCs, raised-ICP management, the stabilize-vs-transfer decision tree), not only specific procedures — that general layer is what catches the long tail.

### 3. The self-healing flywheel — gaps become the moat
A gap isn't just handled, it's harvested. Modeled on **open-source issues + pull requests, for clinical knowledge** (gaps = issues with a count = priority; contributions = PRs; the canonical core = `main`):

```
GMO hits gap (offline) → device logs a de-identified "knowledge request"
  → on reconnect, request syncs to cloud
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
When the system hits a gap on a **critical** case **and** the user is **online**, it does the most responsible thing possible: find the best *available* opted-in expert and connect them, human-to-human. This redeems the case's core failure (the teleconsult that dropped) — and for an AI-skeptic neurosurgeon panel it is the strongest trust signal in the product: *the AI's highest function is knowing when to get out of the way and summon a human.*

The full acute decision at the edge:
```
AI reaches its limit on a case:
  ├─ not critical .............. 🟡 principles guidance + log async knowledge request
  ├─ critical + offline ........ 🔴 stabilize & transfer + queue store-and-forward consult
  ├─ critical + online + a matched expert is AVAILABLE
  │     ........................ 🆘 warm human handoff (pre-briefed) — 🔴 stabilization runs in parallel
  └─ critical + online + no one available
        ........................ async store-and-forward + 🔴 stabilize   (never a dead end)
```

Design rules:
- **Match on availability, not just expertise** — the best *reachable-now* expert beats the best one asleep. Weight by on-call status × timezone × language × responsiveness; produce a **ranked fallback list** (no answer in ~60s → next). A global volunteer pool gives near follow-the-sun coverage.
- **Structured warm handoff, not a cold number** — the system already captured the structured case (vitals, GCS, pupils, mechanism, what's been tried, the gap); push that brief to the expert *with* the request so they pick up already reading the case. Turns a 10-minute fumble into a 60-second consult.
- **Proxy the channel; protect & consent the expert** — WhatsApp is the right LMIC channel (ubiquitous, low-bandwidth, voice/images, E2E-encrypted), but **mask the expert's number** (per-consult relay, Uber-style) for privacy, auditability, and to survive the first bad experience. Granular opt-in (windows, subspecialty, frequency) + one-tap decline → routes to next.
- **Ration escalation** — gate to *critical* ∧ *AI-can't-help* ∧ *online*; over-paging burns out the volunteer corps and the supply side collapses.
- **Parallel stabilization + a floor** — 🔴 stabilize-and-transfer runs *while* connecting; if no human lands, fall to async store-and-forward, then offline principles. The human tier is the *best* outcome when available, never a single point of failure.

**Medico-legal flag (a judge will raise it):** a remote expert advising a GMO across borders has real licensing/liability questions (cross-jurisdiction "curbside consults"). Defensible posture: **peer-to-peer advisory support; the treating clinician retains authority and responsibility**; consent + audit logging; full cross-border telemedicine compliance is an honest roadmap item for partners (medical societies, NGOs). Naming the limit is itself credibility.

### 5. The procedure state machine — *never lose your place* (the core innovation)
Running continuously in the background, **passively, from voice alone** (no extra input from the GMO), the system maintains live procedure state:
- every completed step, timestamped;
- current patient state (GCS, pupils, BP, drugs given, time since injury);
- the last decision point + confidence-gate status;
- exactly where uncertainty arose.

**Why it matters:** when the call drops, the state is *already captured* — nothing is lost. When any connectivity returns (even 30s of 2G), it pushes a compressed state packet and auto-generates the **pre-briefed handoff brief** of §4, so the next expert picks up *mid-procedure in ~10 seconds, not from zero*:
> *EDH evacuation, 23 min elapsed. Steps 1–4 complete. Currently at landmark identification for the second burr hole. Patient: GCS 6, left pupil fixed dilated, BP 160/90, mannitol given 18 min ago. GMO flagged uncertainty on drill angle. Needs: confirmation on posterior burr-hole placement.*

This is the sharpened thesis in code: **the problem isn't knowledge, it's continuity** — the state machine is what makes "the call dropped, nothing was lost" literally true. *(MVP: a lightweight local state object updated from the ASR stream. Post-hackathon: Exo's TRHN temporal tracking + identity manifold are built to power exactly this. A future Starlink/facility-connectivity upgrade would make the handoff real-time where available — roadmap, not a dependency; the offline core stands alone.)*

### Success, redefined
The target isn't omniscience — it's **never leave the GMO worse off than the phone call that dropped.** A total knowledge miss that yields correct stabilization + a clean escalation path is a *win*, not a failure. And the safest demo you can give an AI-skeptic neurosurgeon is the gap case done right: the system recognizes it can't help, refuses to invent, drops to stabilize-and-transfer, fires a pre-briefed human handoff, and logs the request — proving the one thing they need to believe: *it won't confidently hurt someone.*

## MVP vs. Vision — draw this line or category 4 suffers

| | What we DO this weekend (build deeply) | What we STORYBOARD (the vision) |
|---|---|---|
| Device | one phone, fully offline | fleet / multi-clinic deployment |
| Scenario | HM's exact EDH case → retrieve → **cite** → synthesize → **defer** on an out-of-scope case | full neuro/surgery/triage breadth |
| Knowledge | a hand-built canonical-core subgraph for EDH | the curated expert-upload network |
| Sync | n/a (ships with the core) | versioned bundles + delta + sneakernet |
| Language | English + an Urdu toggle; maybe one voice command | full multilingual + ASR |
| Privacy | local-only patient input | full de-ID pipeline + audit |
| Edge behavior | gap → 🟡 stabilize + a *pre-briefed* 🆘 handoff to one on-call mentor; demo the gap case | full degradation ladder + self-healing flywheel + global on-call network |

The judges score a deep, working, *safe-failing* offline core far higher than a broad demo of a platform that doesn't exist yet. **The WiFi-off moment is the demo.** Validate the core's content against the Peshawar guideline + a mentor neurosurgeon.

## What a neurosurgeon judge will attack (one-line answers)

- *"Who validates the uploads?"* → Trust tiers; critical path is canonical-only; verified contributors; peer review.
- *"What if the offline copy is stale?"* → Core is always sufficient; sync only enriches; safety never depends on freshness.
- *"What stops it hallucinating a step?"* → Retrieves and **cites** vetted content and only *sequences* it; defers when unsure.
- *"Patient privacy?"* → Offline = data never leaves the room; uploads are de-identified.
- *"Will it work in the actual languages?"* → Urdu + English for MVP; the long tail is honest roadmap.
- *"Liability?"* → Decision support, clinician-in-the-loop, source-cited — not an autonomous surgeon.
- *"What if you have nothing for the case?"* → It detects the gap, degrades to stabilize-and-transfer (never invents procedure), escalates critical cases to a live matched expert when online, and logs the gap to self-heal. See **At the edge of knowledge**.

## Open decisions (genuinely the team's call)

1. **How tightly to gate uploads** — open-but-moderated wiki vs. invite-only verified board for v1 (moat-speed vs. safety/credibility). Lean: invite-only-verified at launch, loosen later.
2. **How much of the platform to even mention** vs. lead purely with the offline in-room hero (doc 04's "de-AI the front" question).
3. **Specific stack picks** (GraphRAG library, quantized LLM, on-device ASR, MT) — validate against current 2026 benchmarks before committing.
4. **How fast provisional contributions influence guidance** — heal-fast-and-label vs. gate-hard-before-anything-ships (lean: provisional → 🟡 principles only; canonical-reviewed → 🟢 protocol).
5. **Escalation specifics** — raw number vs. proxied/masked channel, and how aggressively to ration human pages to protect the volunteer corps.
