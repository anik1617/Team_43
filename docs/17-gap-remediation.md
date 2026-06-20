# 17 — Gap Remediation (how to fix the gaps in doc 16)

Direct companion to [16-gap-analysis.md](16-gap-analysis.md). Each gap → a concrete fix, tagged by mechanism:
- **[REFRAME]** — a framing/disclosure change. Free, do it now, mostly wins points.
- **[DESIGN]** — build it into the MVP architecture this weekend.
- **[ROADMAP]** — can't solve now; name it honestly as a future step (naming it *is* the fix).

**The meta-principle:** you don't beat these gaps by hiding them — you beat them by **bounding scope, designing the defer-gate as the safety net, and disclosing limits before the panel finds them.** Honesty is the strategy.

---

## 🔴 Critical fixes

### C1 — RAG doesn't fully fix hallucination → constrain the model, don't trust it
- **[DESIGN] Make the critical path deterministic, not generative.** For the irreversible steps (drilling, landmark ID, operate-vs-transfer), Kyro should **retrieve and display pre-vetted, templated steps verbatim** — the model *selects and sequences*, it does not author. Generative synthesis is allowed only for *triage/narrowing/explanation*, never for inventing technique.
- **[DESIGN] Grounding check:** every claim shown must map to a retrieved citation; un-supported text is cut, not surfaced. Add an entity-coverage check (doc 05 §1) so a weak/tangential match trips the gate.
- **[DESIGN] The confidence/defer gate is the real safety mechanism** — calibrate it *conservatively* (bias toward STOP). Demonstrate it on hand-picked gap cases; don't claim robust calibration everywhere.
- **[REFRAME] Stop saying "it can't hallucinate because it cites sources."** Say: *"It retrieves and sequences expert-validated, source-cited steps, and it refuses rather than invents when unsure."* The headline is **"the AI that knows when NOT to act,"** not "the AI that's always right."

### C2 — No evidence a tool makes a non-specialist safe for irreversible surgery → extend an *already-endorsed* practice, don't claim new competence
- **[REFRAME] Don't claim Kyro makes the GMO competent.** Claim it **extends a practice the field already sanctions:** the Peshawar Recommendations *explicitly* endorse "supervised non-specialist EDH evacuation"; the task-sharing consensus prefers *task-sharing with oversight*. Kyro = the **structure, source-citation, and auditability that task-sharing literature says it needs** but currently lacks ("happening without regulation or monitoring").
- **[DESIGN] Keep the human as the ultimate safety net** — the live expert-escalation tier (warm handoff) means the AI's highest function is *summoning a neurosurgeon*, not replacing one.
- **[DESIGN] Pair Kyro with the cheap training pathway** ($32 burr-hole simulator / $145 3D-skull bootcamp). Position Kyro as **just-in-time support for someone with basic skill exposure**, not a cold-start replacement — this is how the JIT evidence actually applies.
- **[REFRAME] Validation language:** "guideline-concordance, mentor-signed, fails safe" — never "clinically validated to make non-specialists safe."

### C3 — Surgical guidance likely = a regulated device → posture as research-grade CDS + name the pathway
- **[REFRAME] The MVP is a *decision-support prototype under clinician supervision*, not a market-ready device.** Say so. This is honest and lowers the proof burden.
- **[DESIGN] Engineer to stay in the "support, not replace" lane where possible:** every recommendation is **source-cited so the clinician can independently review its basis** (a criterion of the CDS exemption); the clinician always confirms before acting; no autonomous action.
- **[ROADMAP] Name the SaMD pathway** (likely Class II) as a post-pilot step, pursued *with* medical societies (PANS, CPSP) and the regulator (DRAP). "We know this needs regulatory evaluation; here's the plan" beats pretending it's deployable tomorrow.

### C4 — Liability unresolved → defensible posture + work with the system that endorses task-sharing
- **[REFRAME] Defensible posture (state it on a slide):** decision support only; **the treating clinician retains authority and responsibility**; informed consent; full audit log; no autonomous action. (Mirror Dr. Nawaz's app: block screenshots, verified accounts.)
- **[REFRAME] Cross-border escalation = peer-to-peer advisory;** the treating clinician retains authority; mask the expert; consent + logging. Name cross-jurisdiction telemedicine compliance as a partner/roadmap item.
- **[ROADMAP] Create sanctioned scope, don't bypass it:** partner with **PANS / CPSP / the provincial health department** so the task-shared scope-of-practice Kyro supports becomes *officially recognized* (the Peshawar Recommendations already call for this) — turning a legal grey zone into endorsed practice.

### C5 — High defer rate (EDH is only ~31%) → make the *defer* itself valuable, and bound the claim
- **[DESIGN] Build the 🟡 "principles" layer broad and deep.** Even for the ~70% out-of-EDH-scope (SDH, contusion, blast, peds), Kyro must deliver **correct stabilization (avoid hypotension/hypoxia, ABCs, raised-ICP basics) + a structured transfer handoff.** Success redefined: *"never leave the GMO worse off than the dropped call."* A correct stabilize-and-refer for the 70% is a *win*, not a failure.
- **[DESIGN] Auto-generate a structured referral/handoff brief** for every deferred case — this directly serves the prehospital/referral gap (and bridges to Dr. Nawaz's solution — see H1/H2).
- **[REFRAME] The "what about the other 70%?" answer:** *"For them, Kyro does what the literature says saves the most lives anyway — prevent secondary injury and get a clean, structured referral moving. The deep EDH path is the proof; the stabilize-and-transfer path covers everyone."*

---

## 🟠 High fixes

### H1 — Your framing vs your own expert (continuity vs broken-referral/prehospital-death)
- **[REFRAME] Broaden the thesis from "the dropped call" to "the system breaks at the moment of decision."** That single reframe *contains both* the continuity story (operative state machine) and Dr. Nawaz's referral/communication story.
- **[DESIGN] Make the procedure state machine *also* the referral fix:** its compressed state packet → an **auto-generated, pre-briefed handoff** is exactly the "structured digital referral" Dr. Nawaz built his app for. Position continuity + handoff as one mechanism that serves both the operative moment *and* the referral chain.
- **[REFRAME] Concede the data:** "Most deaths are prehospital — so Kyro leads with *prevent secondary injury + structured referral*, and the operative co-pilot is for the salvageable patient in front of a GMO who has no one to call." This aligns you with the neurosurgeon's diagnosis instead of contradicting it.

### H2 — A deployed local competitor already exists → acknowledge + partner
- **[REFRAME] Cite Dr. Nawaz's referral app as validation, not omission:** "A Peshawar neurosurgeon independently built a government-approved digital tool for the *referral* gap — proof LMIC clinicians want exactly this. Kyro is the **operative-moment + stabilization complement** to referral/triage tools."
- **[ROADMAP] Propose interoperability/partnership** (Kyro's handoff brief feeding a referral system). Co-opt, don't compete.
- **[DESIGN] Fix the competitor slide:** drop "nobody is building this"; show the honest landscape and Kyro's unique quadrant (offline + operative-moment + non-specialist + defers).

### H3 — The state machine is the least-proven part → ship a minimal honest version
- **[DESIGN] MVP = a lightweight local state object updated from a *constrained voice command set*** (not open passive capture); add a **manual/tap fallback** if ASR fails. Demo the minimal working version.
- **[REFRAME] Disclose it:** "Passive voice capture is the hardest part and the biggest research bet — here's the minimal version working; robust passive tracking is the roadmap (Exo TRHN)." Don't claim robustness you can't show.

### H4 — Validation proves plausibility, not safety → label it precisely and add a benchmark
- **[REFRAME] Name each pillar exactly:** mentor-neurosurgeon **sign-off** (authority), MIMIC-IV **concordance** (plausibility vs real trajectories, *not* LMIC outcomes), Namibia/Pakistan **design partners** (real users).
- **[DESIGN] Add a decision-vignette benchmark:** N operate-vs-transfer / EDH-vs-not vignettes → % guideline-correct **vs a generic LLM and vs an unaided GMO**. A number, on the panel's turf. Plus the **safety/refusal test** (out-of-scope → correctly STOPs) — the single most convincing demo for AI-skeptic surgeons.
- **[ROADMAP] Prospective pilot + the gap-log** as the future real-world dataset.

### H5 — Funding = pilotitis trap → design for local ownership, not donor-dependence
- **[REFRAME] Sustainability answer:** near-zero marginal cost (offline, runs on existing Android) + **embedding in the existing system** (NSOAP / Sehat Card / provincial health dept) + **local ownership** (PANS/Mission:Brain chapters as owners, train-the-trainer). This is precisely the antidote to pilotitis the literature names.
- **[ROADMAP] Revenue mix** (ministry procurement + NGO licensing + grants) explicitly *designed for handover* to local institutions, not perpetual donor dependence.

### H6 — The moat doesn't exist → pitch the *near-term* moat, roadmap the network
- **[REFRAME] Near-term defensibility = the curated Tier-0 EDH bundle + mentor sign-off + first-mover gap-log dataset** (the ground-truth map of LMIC clinical need no competitor has). The expert *network* is explicitly future.
- **[DESIGN] Contributor governance from day one:** invite-only verified contributors; provenance + trust tiers; contributions enter as *provisional* (PR-not-push); credential check. Contributor liability handled by "Tier-1 enriches, never overrides Tier-0 on the critical path."

### H7 — No-CT wrong-procedure risk → require concordant signs + frugal adjuncts + conservative defer
- **[DESIGN] Require multiple concordant clinical signs** (pupil + GCS trajectory + mechanism + lateralizing weakness) before greenlighting an irreversible step; any discordance → 🟡/🔴 defer.
- **[DESIGN] Surface frugal confirmatory adjuncts** where available (ONSD ultrasound, automated pupillometry, NIRS) — partial CT substitutes.
- **[REFRAME] Honest comparator:** the alternative is *no help at all*; the closest real-world analog (Tanzania, non-specialist burr-hole) shows **75.6% good outcomes.** Residual risk exists and is disclosed.

---

## 🟡 Medium fixes (mostly quick)
| # | Fix | Tag |
|---|---|---|
| M1 | **Build the EDH knowledge bundle this weekend** from the 🟢 ingestible spine (Wilson how-to, JTS/WSES CPGs, BTF surgical, Peshawar) — the Layer-6 task. | [DESIGN] |
| M2 | Ingest only open/CC content; cite copyrighted textbooks/atlases as references, don't reproduce. | [DESIGN] |
| M3 | Urdu + English MVP; Shina/Balti/Wakhi = explicit honest roadmap. | [REFRAME] |
| M4 | Test on a real cheap target Android; budget Q4 model sizes; 2B fallback. | [DESIGN] |
| M5 | Co-design UX with a GMO; stress-tolerant/glanceable; pair with the simulator training. | [DESIGN] |
| M6 | Emergency + family-mediated consent pathway; name full consent framework as roadmap. | [ROADMAP] |
| M7 | Block screenshots, ephemeral sessions, local-only storage, device-encryption guidance (copy Dr. Nawaz's app). | [DESIGN] |
| M8 | Align the beachhead: **lead with Pakistan grounding (your deepest evidence); deploy first where partners are (Namibia)** — say it that way, one coherent story. | [REFRAME] |
| M9 | Named local co-authorship + data sovereignty (CARE principles) to pre-empt the "digital colonialism" critique. | [REFRAME] |
| M10 | Defensibility = the data/gap-log + first-mover, not IP; move fast and deploy. | [ROADMAP] |

## 🧾 Evidence-integrity fixes (do before the deck — ~30 min)
- **Retire** the "100% power-drill breakage" claim (or source it from a specific military/austere field report); use the verified "hand-crank plunging/slipping risk" instead.
- **Soften** "no local word for concussion" to "no widely-shared local concept of concussion" (explanatory-model framing) — it's inference, not a citation.
- **Disambiguate** Peshawar Recommendations (2019, in repo) vs Peshawar Declaration (2024, Thieme).
- **Pick one** neurosurgeon-density figure (0.14/100k is the most-cited) and footnote it.
- **Confirm** the paywalled flagship stats (GNOS 13 h, Haselsberger, AKUH) from full text before quoting verbatim.

---

## The 6 fixes that matter most (the order to do them)
1. **C1 — reframe the hallucination claim** + make the critical path templated/deterministic. *(Free + a design constraint; protects against the deadliest attack.)*
2. **C5/H1 — broaden to "stabilize + structured referral," own the defer rate, and align with Dr. Nawaz's diagnosis.** *(One reframe fixes three gaps and makes your own expert your ally.)*
3. **H2 — acknowledge and partner with the deployed local competitor.** *(Credibility; avoids looking naïve.)*
4. **H4 — label validation precisely + add the decision-vignette + refusal benchmark.** *(Earns the AI-skeptic panel.)*
5. **C3/C4 — state the research-grade posture + the regulatory/liability roadmap.** *(Disarms the "is this even legal/safe to deploy?" attack.)*
6. **Evidence-integrity pass** — retire the unverified claims. *(So nothing gets caught in Q&A.)*

## The one-sentence version
**Fix the gaps by narrowing what you *claim*, deepening the *one thing* you build, designing the defer-gate as the safety net, aligning your story with the Peshawar neurosurgeon's, and disclosing every limit before the panel can — because to this audience, a team that knows exactly where it defers is more trustworthy than one that claims to have no gaps.**
