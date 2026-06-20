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

## MVP vs. Vision — draw this line or category 4 suffers

| | What we DO this weekend (build deeply) | What we STORYBOARD (the vision) |
|---|---|---|
| Device | one phone, fully offline | fleet / multi-clinic deployment |
| Scenario | HM's exact EDH case → retrieve → **cite** → synthesize → **defer** on an out-of-scope case | full neuro/surgery/triage breadth |
| Knowledge | a hand-built canonical-core subgraph for EDH | the curated expert-upload network |
| Sync | n/a (ships with the core) | versioned bundles + delta + sneakernet |
| Language | English + an Urdu toggle; maybe one voice command | full multilingual + ASR |
| Privacy | local-only patient input | full de-ID pipeline + audit |

The judges score a deep, working, *safe-failing* offline core far higher than a broad demo of a platform that doesn't exist yet. **The WiFi-off moment is the demo.** Validate the core's content against the Peshawar guideline + a mentor neurosurgeon.

## What a neurosurgeon judge will attack (one-line answers)

- *"Who validates the uploads?"* → Trust tiers; critical path is canonical-only; verified contributors; peer review.
- *"What if the offline copy is stale?"* → Core is always sufficient; sync only enriches; safety never depends on freshness.
- *"What stops it hallucinating a step?"* → Retrieves and **cites** vetted content and only *sequences* it; defers when unsure.
- *"Patient privacy?"* → Offline = data never leaves the room; uploads are de-identified.
- *"Will it work in the actual languages?"* → Urdu + English for MVP; the long tail is honest roadmap.
- *"Liability?"* → Decision support, clinician-in-the-loop, source-cited — not an autonomous surgeon.

## Open decisions (genuinely the team's call)

1. **How tightly to gate uploads** — open-but-moderated wiki vs. invite-only verified board for v1 (moat-speed vs. safety/credibility). Lean: invite-only-verified at launch, loosen later.
2. **How much of the platform to even mention** vs. lead purely with the offline in-room hero (doc 04's "de-AI the front" question).
3. **Specific stack picks** (GraphRAG library, quantized LLM, on-device ASR, MT) — validate against current 2026 benchmarks before committing.
