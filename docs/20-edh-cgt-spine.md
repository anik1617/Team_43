# 20 — Kyro L1 Clinical Guidance Tree (EDH-CGT spine) — FINAL, mentor-ready (v3, reconciled)

**Format:** MedDM "IEET" (Information → Evaluation → Escalation → Treatment), deterministic.
**Operator:** General Medical Officer (general surgical training, **NOT** a neurosurgeon).
**Setting:** Rural Pakistan / LMIC. **NO CT, NO ICP monitor, NO neurosurgeon on site.**
**Design law:** the *tree* reasons; the downstream LLM does **I/O only**. Every live decision edge is a deterministic boolean on a captured field. No edge depends on clinician judgment that is not first captured as a structured field.

> **What v3 reconciliation added** (over the authored v2 spine): (1) the **doc-19 four-action vocabulary** is now carried on every terminal leaf in the contract's `cgt_nodes.action` field (GUIDE / OBSERVE / STABILIZE_TRANSFER / ABSTAIN_STOP), with GREEN/YELLOW/RED retained as a **confidence/mode overlay**; (2) the **GUIDE semantics** were pinned to doc 19 + the re-aim — GUIDE means *"this is an operate-locally (not transfer) case → surface the cited landmark/technique and connect a live expert,"* it is **NOT** an autonomous drill script, and the drill-localization step (N40) stays a hard ABSTAIN; (3) doc-10 exact thresholds and the 10 hard safety rules and doc-14 Pakistani-validated thresholds are overlaid onto the existing nodes with citations + tiers; (4) a **concordant-signs gate** is made explicit before any GUIDE leaf; (5) the OBSERVE / STABILIZE_TRANSFER / ABSTAIN branches are confirmed as deeply developed as GUIDE, each emitting a structured stabilization + auto-handoff. The full v1→v2→v3 diff is in `21-cgt-mentor-pack.md`. SQL: `../spine/edh-cgt.sql`.

---

## 0 · THE ACTION VOCABULARY (doc 19) × THE MODE OVERLAY (GREEN/YELLOW/RED)

The contract (`docs/08 §1`) requires `cgt_nodes.action ∈ {GUIDE, OBSERVE, STABILIZE_TRANSFER, ABSTAIN_STOP}`. That is the **doc-19 grading vocabulary**. The earlier GREEN/YELLOW/RED *mode* is kept as a **second, orthogonal axis** — it describes *how strongly cited / how directive* a leaf is, not *what category of case* it is.

| `action` (doc 19, contract field) | What it means in Kyro | Mode overlay it usually carries |
|---|---|---|
| **GUIDE** | This is an **operate-locally** case (indicated + transfer not feasible in the window). Kyro **surfaces the cited operative landmark/technique context and connects a live expert** for supervised task-*sharing*. **It is NOT an autonomous drill script** — the irreducible drill-site/localization step is *always* deferred (N40 ABSTAIN_STOP). The deepest GREEN action Kyro itself emits is *medical herniation management + supervised hand-off.* | GREEN (decision is cited) but routes through a RED localization terminal |
| **OBSERVE** | Do **not** drill now. Serial neuro-exam + arm deterioration triggers + arrange CT/transfer for monitoring. | GREEN→armed |
| **STABILIZE_TRANSFER** | Not a local-surgery case. Prevent secondary injury + refer + tele-consult; auto-generate the structured handoff. | RED (stop local op) |
| **ABSTAIN_STOP** | Explicitly refuse to guide a burr hole (wrong procedure / can't localize / out of scope / unresolvable input) → stabilize + escalate. | RED |

**Mode legend (overlay):** `protocol` = GREEN (guideline-sanctioned, cited, act now within GMO scope) · `principles` = YELLOW (labeled non-specific stabilization principle) · `stop` = RED (abstain → stabilize + transfer + escalate).

**Action is a leaf property.** The stabilization-chain nodes (N10–N17) are intermediate *act* steps on the way to a terminal; the contract's `action` field is populated **only on terminal/leaf nodes**. Intermediate leaves carry `action = NULL`; their directive force is the mode overlay.

### The GUIDE → ABSTAIN invariant (the load-bearing honesty)

> **Hard invariant:** even on the strongest no-CT operate surrogate, the act of operating — and specifically **drill-site localization (N40)** — is ALWAYS `action = ABSTAIN_STOP`, RED. Kyro never names a burr-hole site, **including while a neurosurgeon is live on the line.** A `GUIDE` leaf (L21b/L21c) means *"operate-locally is the indicated decision and a supervising expert is now connected"* — the supervising neurosurgeon, not Kyro, supplies every operative step. This is exactly the Peshawar **task-SHARING-not-task-SHIFTING** doctrine and is consistent with Bullock's finding that unsupervised non-neurosurgeon evacuation worsened outcomes.

---

## 1 · SAFETY META-RULES (enforced at every node, not as a branch)

- **S1 — Completeness gate.** The tree CANNOT reach any terminal while a `required = critical` field is missing. A decision node reached with a missing critical field routes to **N02 (re-ask)**.
- **S2 — Contradiction guard.** Two mutually exclusive captured vitals route to **N03 (re-ask, do not infer)**. Covers GCS re-capture conflict, same-side pupil fixed+brisk, SBP >40 mmHg disagreement, and **cross-time pupil/GCS reversal at N30**.
- **S3 — Out-of-tree guard.** Any input not a recognized value for the requested field routes to **N99 (ABSTAIN_STOP → stabilize + transfer + escalate)**. Kyro never bins an out-of-range value into the nearest bucket.
- **S4 — Monotonic escalation.** Once a RED terminal is reached, `red_terminal_reached` is set; re-entry on improving vitals does NOT downgrade below "transfer + tele-consult." Deterioration only escalates.
- **S5 — Unmeasured ≠ excluded.** For every safety-critical *exclusion* (hypoxia, hypotension, hypoglycaemia as extracranial causes of deterioration), an **unknown/unmeasured** value routes **conservatively** (treat-as-not-excluded → correct-first), never permissively. A missing SpO₂ or glucose can NOT silently satisfy "extracranial cause excluded."
- **S6 — Pediatric scope gate.** `age_yr < 15` is OUT of the adult-MVP scope → routes at intake to **N98 (pediatric ABSTAIN_STOP)**. The tree never applies an adult BTF SBP/GCS threshold to a child.

---

## 2 · CITATION-TIER POLICY (the headline honesty fix — preserved from v2)

| Tier | Meaning | Applied to |
|---|---|---|
| **`trust_tier = 0`** | **Citation-locked** — verbatim-verified against an *extracted* source in the corpus: BTF 4th Ed primary text (verified at `../../src_lww_journal.txt`); Peshawar Recommendations digest; Bullock Surgical-EDH digest. | BTF- and Peshawar- and Bullock-sourced nodes only. |
| **`trust_tier = 1`** | **Provisional-cited `[VERIFY-NICE]`** — content is standard NICE NG232 / standard practice, but the **source text is NOT in the extraction corpus**, so clause numbers and wording are **unverified against the cited corpus**. Mentor MUST verify each clause before any tier-0 promotion. | Every NICE-dependent node: N04, N05 (partial), N08, N10, N17, N22, N23, N30; N97 prognosis. |
| **`trust_tier = 2`** | **Labeled principle** — no cited number exists in any source; emitted YELLOW. | N12 (SpO₂ 94%), N13 (head-up), N16B (reversal/PATCH), glucose threshold, pediatric SBP, mannitol-caution. |

> **Nothing on a critical-path action is allowed to silently masquerade as tier-0 when its source is not in the corpus.** Every `[VERIFY]`/`[VERIFY-NICE]` flag from v2 is preserved verbatim.

**Citation-integrity rules honored (per doc 14):**
- **Prof. M. Tariq Khan** (Northwest General Hospital, Peshawar; co-author, *Peshawar Recommendations* 2019; Dean of Neurosurgery, CPSP) is kept **distinct** from **Dr. Mohammad Nawaz Khan** (Lady Reading Hospital; the repo-lecture author). The CGT cites the *Peshawar Recommendations (Park & Khan 2019)*, not the lecture, for its task-sharing/golden-window clauses.
- The **Peshawar Recommendations (2019)** ≠ the **WFNS Peshawar Declaration (2024, Thieme paywall)**. Only the 2019 Recommendations (verbatim-extracted from the repo PDF) are cited as tier 0; the 2024 Declaration is not relied on.
- Paywalled primaries (BTF, PATCH, CRASH-3, Bullock) are **cited** but the tree is **grounded** on the open/extracted companion text; MDCalc rule *logic* is encoded, never MDCalc embedded content.
- **Unverified claims are NOT encoded**: no "100% power-drill breakage," no "no local word for concussion." These remain pitch-deck color, never CGT logic.

---

## 3 · DOC-10 / DOC-14 THRESHOLD OVERLAY (what each rule maps to)

The 10 hard safety rules from doc 10 and the Pakistani-validated thresholds from doc 14 are not a separate branch — they are **injected into the existing nodes**. Map:

| Threshold / rule | Source (doc) | Node it lives on | Tier |
|---|---|---|---|
| Intubate at **GCS ≤ 8** / herniation | doc 10 rule 1; NICE | N10 → L10a | 1 `[VERIFY-NICE]` (NICE wording); herniation arm tier 0 |
| Ketamine RSI when avoiding hypotension | doc 10 rule 1 (B1) | L10a note (agent choice = clinician judgment, not a tree edge) | principle |
| **No "double hit"**: SBP target (age-stratified) + SpO₂, **no permissive hypotension** | doc 10 rule 2; doc 14 Nawaz "a single hypotensive episode → >50% mortality" | N11 (SBP); N12 (O₂) | **0** (BTF Table 3, Level III: ≥100 age 50–69; ≥110 age 15–49 or >70); O₂ tier 2 (no numeric cutoff in corpus) |
| **No hyperventilation** except short herniation rescue (~ETCO₂/PaCO₂ 35) | doc 10 rule 3 | N16 (no prolonged HV ≤25, IIB) + N16H (brief guarded rescue, legacy) | 0 |
| **TXA < 3 h** | doc 10 rule 4 (CRASH-3) | **overlaid as a labeled principle** in the stabilization chain (see N15-adjacent note); CRASH-3 not in extracted corpus → tier 2 `[VERIFY-TXA]` | 2 |
| Isotonic saline (0.9%); avoid hypotonic/glucose fluids | doc 10 B4 | L11a fluid choice | 0/principle |
| **7-day seizure prophylaxis then stop** | doc 10 rule 10 | N15 → L15 (phenytoin, early PTS ≤7 d; not late) | **0** (BTF Table 1, Level IIA) |
| Short-course antibiotics only | doc 10 rule 10 / C2 | post-op scope (roadmap; flagged, not in acute CGT) | principle |
| **GCS-P** (GCS minus pupil score) as a no-CT severity index | doc 10 A1/A5 | folded into N04+N05 (E/V/M + pupil reactivity captured separately → GCS-P derivable) | 0/1 |
| **NO platelets** for antiplatelet ICH (PATCH) | doc 10 rule 5 | N16B → L16Bb | 2 `[VERIFY-PATCH]` |
| **Operate < 4 h golden window** (30% vs 90% mortality) | doc 14 §B (Peshawar Recommendations) | N21 (time_since_injury informs operate-vs-transfer) | **0** |
| **OBSERVE if EDH < 30 mL and no deficit** (Pakistani PJNS RCT) | doc 14 §E | N20→N23 (clinical surrogate: GCS≥13, intact, no deficit → observe). NB: the 30 mL *volume* is **CT-only** → suppressed from GMO render (audit-only comparator); the *clinical* observe gate is what the GMO uses. | 0 (clinical) / audit-only (volume) |
| Triage on **GCS + pupils + time** | doc 14 §A/§E | the whole INFORMATION section (N04, N05, N01) | 0/1 |
| Urgency keyed to the **blown-pupil (deterioration) clock**, not crash time | doc 14 §B "once anisocoria appears, operate ASAP" | N20 herniation cluster + N21 | 0 |

> **Why the 30 mL volume rule is encoded as a *clinical* gate, not a number the GMO sees:** there is no CT, so clot volume is unmeasurable in this setting. Surfacing "30 cm³ / 15 mm / 5 mm MLS" to a GMO with no scanner invites a fabricated estimate. The Bullock CT thresholds are therefore an **internal audit-only annotation (`comparator_audit_only = true`)**, structurally barred from the I/O layer; if ever shown for audit they are hard-prefixed *"UNUSABLE HERE — no CT — do NOT estimate clot volume."* The PJNS "<30 mL + no deficit → conservative" finding is honored through the *clinical* observe gate (neurologically intact + stable → N23 OBSERVE).

---

## 4 · CONCORDANT-SIGNS GATE (required before any GUIDE leaf)

A GUIDE (operate-locally) leaf (L21b/L21c) is reachable **only** through N20→N21, and **only** when multiple concordant signs co-fire. This is the explicit guard against greenlighting a blind or wrong-side drill:

- **N20 requires a concordant herniation cluster**, not a single sign, to reach N21: `coma (GCS<9) AND a fixed/anisocoric pupil (H1)`, **or** a pair from {H1 fixed pupil, H2 new focal weakness, H3 declining GCS trend, H4 lucid interval}. A lone sign (e.g. an isolated blown pupil with GCS 15 and no trajectory) does **not** reach N21 — it routes to N22 STABILIZE_TRANSFER or N23 OBSERVE.
- **Any discordance defers.** `lucid_interval == unknown`, anticoagulated/unknown coagulopathy, posturing alone, or an incomplete cluster all route **up** to N22 (transfer), never to GUIDE.
- **Localization is never inferred.** Even with a full concordant cluster, N21's GUIDE leaf connects the expert and continues stabilization; the *side/site to drill* is N40 ABSTAIN_STOP. Motor lateralization is explicitly labeled **unreliable for clot localization** (Kernohan's-notch false-localizing weakness ~10–15%), which is *why* N40 abstains rather than naming a side.

So: **concordant cluster → GUIDE the operate-locally decision + connect expert; the drill site is still ABSTAIN.** Discordance → defer/ABSTAIN.

---

## 5 · BRANCH-DEPTH PARITY (≈70% of cases are NOT a GUIDE)

The OBSERVE / STABILIZE_TRANSFER / ABSTAIN branches are developed to the same depth as the GUIDE path. Every deferred case still receives correct stabilization and an **auto-generated structured referral/handoff** built from the working-memory object `<evidence, hypotheses, trajectory>`:

- **OBSERVE (N23→N30):** full NICE neuro-obs schedule, armed deterioration triggers (the complete red-flag set captured as fields), two-observer confirmation, monotonic re-entry to N20 on deterioration.
- **STABILIZE_TRANSFER (N22, L21a):** intubate-if-GCS≤8, age-stratified normotension, oxygenation, head-up, mannitol-per-criteria, coagulopathy correction, then transfer + tele-consult with the auto-handoff packet.
- **ABSTAIN_STOP (N40, N97, N98, N99):** each carries its own correct stabilization + the explicit reason for abstaining + the escalation. N97 (bilateral fixed) is futility-*aware* (not nihilistic, not blind-drill). N98 (pediatric) stabilizes with labeled peds principles. N99 (out-of-tree) defaults to the safe stabilize-and-transfer stack.

The **auto-handoff** is generated on every transfer/abstain/supervised-handoff terminal: a structured packet (mechanism, time-since-injury, GCS trend, pupils L/R + reactivity, lateralizing signs, vitals, interventions given, the reached leaf + its citation) — so a dropped call loses nothing and reconnection is pre-briefed. This is the "continuity, not knowledge" primitive.

---

## SECTION I — INFORMATION (structured evidence-gathering, FIRST)

### N00 — ROOT / Case open
`kind: root` · routes unconditionally → N01.

### N01 — Mechanism + time-since-injury + penetrating/blast flag
`kind: evidence` · fields: `mechanism` (free-text), `mechanism_class` (blunt / penetrating / blast / open-depressed-fracture / non-trauma), `time_since_injury_hr` · required: **critical** (time, mechanism_class)
- **Prompt:** "What caused the head injury — blunt blow, penetrating/gunshot, blast, open skull wound, or no trauma? How many hours since it happened?"
- **Source:** Peshawar Recommendations p.53 (injury-to-facility ≤4 h golden window); Peshawar SURVEILLANCE minimum dataset (mechanism/circumstance of injury) — `tier 0`. ("WHO minimum dataset" over-attribution removed.)
- **Edges:** `mechanism_class ∈ {penetrating, blast, open-depressed-fracture}` → **N22 (STABILIZE_TRANSFER, regardless of GCS/pupils)** — these are not a burr-hole/EDH problem (penetrating/blast = doc 14 KP-specific burden → stabilize + antibiotics + AED-by-principle + transfer; NICE 1.4.16 `tier 1 [VERIFY-NICE]`). `mechanism_class == non-trauma` → N22 likewise (spontaneous ICH/stroke is out of the traumatic-EDH path). Else → N1A.

### N1A — Anticoagulation / antiplatelet / known coagulopathy
`kind: evidence` · fields: `anticoag_antiplatelet` (none / warfarin / DOAC / antiplatelet / unknown), `known_coagulopathy` (yes/no/unknown) · required: **critical**
- **Prompt:** "Is the patient on any blood thinner (warfarin, a DOAC such as apixaban/rivaroxaban, or an antiplatelet such as aspirin/clopidogrel)? Any known bleeding disorder or liver disease?"
- **Source:** major modifier of hematoma expansion; NICE lowered-threshold trigger (`tier 1 [VERIFY-NICE]`). Reversal = labeled principle (tier 2); PATCH harm-trap wired at N16B.
- **Edges:** always → N04. (Effects downstream: lowers transfer threshold at N20/N23; adds reversal order at N16B.)

### N04 — GCS, three components (E / V / M)
`kind: evidence` · fields: `gcs_e` (1–4), `gcs_v` (1–5), `gcs_m` (1–6) · required: **critical**
- **Prompt:** "Score eye-opening (1–4), verbal (1–5), and best motor (1–6) separately."
- **Source:** recording E/V/M separately is standard NICE NG232 practice (`tier 1 [VERIFY-NICE]`, clauses 1.3.1–1.3.3 unverified). With N05 pupil reactivity this yields **GCS-P** (GCS − pupil score), the no-CT severity index of doc 10.
- **Derived:** `gcs_total = E+V+M`. **Guards:** any component out of range → N99 (S3). `gcs_recapture_conflict` (a component re-captured with a conflicting value) → N03 (S2). Else → N05.

### N05 — Pupils: size + reactivity, Left and Right
`kind: evidence` · fields: `pupil_size_l_mm`, `pupil_react_l` (brisk/sluggish/fixed), `pupil_size_r_mm`, `pupil_react_r` · required: **critical**
- **Prompt:** "Left pupil size (mm) and reaction (brisk/sluggish/fixed); right pupil size (mm) and reaction."
- **Derived:** `fixed_pupil_side` = side with `react == fixed`, **of ANY size** (the ≥4 mm floor is removed — early third-nerve compression and mid-position central herniation present fixed at 3–4 mm); `anisocoria = |size_l − size_r| ≥ 1 mm` (a sluggish/fixed larger pupil with anisocoria ≥1 mm satisfies the herniation surrogate); `bilateral_fixed = (react_l == fixed AND react_r == fixed)`.
- **Source:** Bullock/BTF Surgical-EDH digest (anisocoria + coma → operate ASAP — `tier 0`); pupil size+reactivity minimum observation = NICE (`tier 1 [VERIFY-NICE]`). 4 mm floor was non-cited convention (VF-9 closed).
- **Guards:** same pupil both fixed+brisk → N03 (S2). Else → N06.

### N06 — Blood pressure (SBP) + age + SpO₂ + glucose (pediatric & metabolic capture)
`kind: evidence` · fields: `sbp_mmhg`, `age_yr`, `spo2_pct`, `spo2_available`, `blood_glucose`, `glucose_available` · required: **critical** (sbp, age, glucose-or-availability, spo2-or-availability)
- **Prompt:** "Systolic BP (mmHg); patient age (years); SpO₂ % if a pulse-oximeter is available (say 'none' if not); capillary/blood glucose if a glucometer is available (say 'none' if not)."
- **Source:** BTF 4th Ed Table 3 age-stratified SBP (`tier 0`); Peshawar p.53 prevent hypotension + maintain oxygenation (`tier 0`, no numeric cutoff). Glucose has **no threshold in the corpus** → captured anyway (S5) with a labeled cutoff (tier 2).
- **Derived:** `hypoglycemic = glucose_available AND glucose < 70 mg/dL` (tier 2); `glucose_unknown = NOT glucose_available`; `hypoxic = spo2_available AND spo2 < 94` (tier 2); `spo2_unknown = NOT spo2_available`.
- **Pediatric gate (S6):** `age_yr < 15` → **N98 (pediatric ABSTAIN_STOP)**. **Guards:** SBP <40 or >300 → N99; two SBP entries >40 mmHg apart → N03. Else → N07.

### N07 — Lucid interval (yes / no / unknown)
`kind: evidence` · field: `lucid_interval` · required: **critical**
- **Prompt:** "Was there a lucid interval — patient coherent after the injury, then declined?"
- **Source:** classic EDH surrogate; Peshawar "time from neurologic deterioration" framing. `[VERIFY] VF-1` — no source supplies a standalone lucid-interval operate threshold; used only as a herniation-cluster weight and a low-threshold-transfer trigger, **never as a sole operate trigger.** Else → N08.

### N08 — Lateralizing / motor signs + active seizure
`kind: evidence` · fields: `focal_weakness_side` (none/left/right), `posturing` (none/decorticate/decerebrate), `seizure_status` (none / single-resolved / active-or-without-recovery) · required: **critical**
- **Prompt:** "Any one-sided limb weakness (which side)? Any abnormal posturing (decorticate/decerebrate)? Is the patient seizing now or not fully recovered from a seizure?"
- **Source:** progressive focal signs → discuss-neurosurgeon-regardless-of-imaging = NICE (`tier 1 [VERIFY-NICE]`); posturing = BTF-recognized deterioration sign (`tier 0`); seizure-without-recovery = NICE discuss trigger (`tier 1`).
- **Edge (active seizure):** `seizure_status == active-or-without-recovery` → **L08S (principles/YELLOW, ABSTAIN_STOP-adjacent): abortive benzodiazepine (labeled principle, tier 2) + re-evaluate airway (re-enter N10) + route to N22 (STABILIZE_TRANSFER, discuss regardless of imaging)** — distinct from N15 prophylaxis. Else → N09.

### N09 — COMPLETENESS CHECKPOINT (S1)
`kind: gate` · if ANY critical field missing → N02 (re-ask the specific field), loop until complete. Critical set: time_since_injury, mechanism_class, anticoag_antiplatelet, gcs_e/v/m, all 4 pupil fields, sbp, age, glucose-or-availability, spo2-or-availability, lucid_interval, focal_weakness, posturing, seizure_status. Then → N10.

### N02 / N03 — RE-ASK (S1 / S2)
`kind: reask` · cannot terminate. N02: "Before any recommendation I need: {missing_field}." N03: "These two entries conflict: {a} vs {b}. Please re-check — I will not guess." On supply → re-validate → N09.

---

## SECTION II — EVALUATION → STABILIZATION & SECONDARY-INJURY PREVENTION

Checklist chain N10→N17; converges at N20. (Intermediate leaves carry `action = NULL`; mode overlay shown.)

### N10 — Airway / severity triage on GCS
`kind: decision` · field: `gcs_total`
- **Source:** GCS bands (severe ≤8, moderate 9–12, mild 13–15) + intubate-at-GCS≤8 = NICE (`tier 1 [VERIFY-NICE]`). The deterministic intubation edge fires on `gcs_total ≤ 8` only; loss of laryngeal reflexes / irregular respirations / hypoxaemia / hypercarbia are **clinician-judgment overrides outside the tree** (the tree captures no respiratory pattern/CO₂ — per the design law).
- **Edges:** `≤8` → **L10a (protocol/GREEN, tier 1)**: intubate & ventilate; ketamine RSI is the LMIC-appropriate haemodynamically-stable induction (doc 10 B1, labeled principle). `9–12` → **L10b (protocol/GREEN, tier 1)**: protect airway, high-flow O₂, monitor (airway detail = extrapolated good practice, VF-8). `≥13` → **L10c (protocol/GREEN, tier 1)**: observe on NICE schedule. All → N11.

### N11 — Hemodynamics: avoid hypotension (age-stratified, adult only)
`kind: decision` · fields: `sbp_mmhg`, `age_yr` (children diverted at N06→N98)
- **Source:** BTF 4th Ed Table 3, **Level III** (`tier 0`): SBP ≥100 (age 50–69); ≥110 (age 15–49 or >70). Echoes doc 14 Nawaz: "a single hypotensive episode → >50% mortality." **Permissive hypotension is contraindicated** with head injury (doc 10 rule 2).
- **Canonical predicate** `sbp_below_target := (age 50–69 AND sbp<100) OR ((age 15–49 OR age>70) AND sbp<110)` — referenced identically by prose and SQL.
- **Edges:** `sbp_below_target` → **L11a (protocol/GREEN, tier 0)**: restore SBP with **isotonic (0.9%) saline** to the age target; avoid hypotonic/glucose fluids (doc 10 B4). Else → **L11b (protocol/GREEN, tier 0)**: maintain normotension. Both → N12.

### N12 — Oxygenation
`kind: decision` · fields: `spo2_pct`, `spo2_available` (S5)
- **Source:** Peshawar p.53 / WHO-by-reference (maintain oxygenation) — **no numeric SpO₂ cutoff in corpus** (`tier 2`, `[VERIFY] VF-2`). Pulse oximetry = the non-negotiable minimum monitor (doc 10 rule 9 / B5 Lifebox).
- **Edges:** `spo2_available AND spo2<94` → **L12a (principles/YELLOW)**: supplemental O₂ (94% = convention, not a cited number). `NOT spo2_available` → **L12b (principles/YELLOW)**: empirical O₂ + obtain oximetry ASAP; **this unknown state = hypoxia-not-excluded for the N14 mannitol guard (S5)**. Else → **L12c (protocol/GREEN, tier 1)**: oxygenation adequate, maintain. All → N13.

### N13 — Head-up positioning
`kind: action` · **Source:** `[VERIFY] VF-3` — NO cited source supports a 30° number; BTF 4th Ed has NO positioning recommendation (confirmed negative finding). `tier 2`.
- **L13 (principles/YELLOW):** head-up ~30° with neutral neck alignment; labeled non-specific, NOT a guideline mandate. → N14.

### N14 — Osmotherapy (mannitol) — by herniation criteria ONLY (S5 hard guard)
`kind: decision` · fields: `fixed_pupil_side`, `bilateral_fixed`, `posturing`, `gcs_trend`, `sbp_at_target`, `hypoxic`, `spo2_unknown`, `hypoglycemic`, `glucose_unknown`
- **Source:** BTF 4th Ed Table 1 (LEGACY 3rd-Ed, **no current Level**, `[VERIFY] VF-6`): restrict pre-monitoring mannitol to **transtentorial herniation OR progressive neurologic deterioration not attributable to extracranial causes**; dose 0.25–1 g/kg (`tier 0` legacy).
- **Canonical predicates:** `extracranial_excluded := sbp_at_target AND NOT hypoxic AND NOT spo2_unknown AND NOT hypoglycemic AND NOT glucose_unknown` (ANY of {SBP below target, hypoxic, SpO₂ unknown, hypoglycemic, glucose unknown} ⇒ NOT excluded — **unmeasured = not excluded, S5**); `herniation_signs := (fixed_pupil_side ≠ none) OR bilateral_fixed OR (posturing ≠ none) OR (gcs_trend == declining)`.
- **Edges:** `herniation_signs AND extracranial_excluded` → **L14a (protocol/GREEN, tier 0 legacy)**: mannitol 0.25–1 g/kg IV. `herniation_signs AND NOT extracranial_excluded` → **L14b (principles/YELLOW)**: **correct hypotension/hypoxia/hypoglycaemia FIRST (or obtain the missing measurement) — do NOT give mannitol while an extracranial cause is uncorrected OR unmeasured** (mannitol can precipitate hypotension). `NOT herniation_signs` → **L14c (protocol/GREEN, tier 0 legacy)**: no prophylactic mannitol. All → N15.

### N15 — Seizure prophylaxis (7 days, then stop)
`kind: action` · **Source:** BTF 4th Ed Table 1, **Level IIA** (`tier 0`): phenytoin to reduce **EARLY** PTS (≤7 d); **not** for late PTS; levetiracetam not endorsed over phenytoin. (Doc 10 rule 10.)
- **L15 (protocol/GREEN, tier 0):** phenytoin for early PTS prophylaxis within 7 days; do NOT continue for late prevention. *(TXA <3 h overlay: where the patient is within 3 h and has reactive pupils / mild–moderate GCS, early TXA is the cheapest LMIC-recommendable intervention — doc 10 rule 4 / CRASH-3 — emitted as a **labeled principle, tier 2 `[VERIFY-TXA]`** since CRASH-3 is not in the extracted corpus.)* → N16.

### N16 — DO-NOT list (split levels per citation)
`kind: action` · **Source:** BTF 4th Ed Table 1 — steroids **Level I** (contraindicated; high-dose methylprednisolone increases mortality); prophylactic hypothermia **Level IIB** (early ≤2.5 h, short-term 48 h, diffuse injury); prolonged HV to PaCO₂ ≤25 **Level IIB**; "avoid HV first 24 h" + "brief temporizing HV" = LEGACY 3rd-Ed (no Level). All `tier 0`.
- **L16 (protocol/GREEN, tier 0):** NO steroids/methylprednisolone (I); NO early prophylactic hypothermia in diffuse injury (IIB); NO prolonged/prophylactic HV to PaCO₂ ≤25 (IIB). Brief HV is a guarded action — see N16H. → N16B.

### N16B — Anticoagulation reversal / correction (PATCH harm-trap encoded)
`kind: action` · fields: `anticoag_antiplatelet`, `known_coagulopathy` · **Source:** correctable secondary-injury driver; **no agent-specific protocol in corpus** → labeled principle (`tier 2`).
- **Edges:** `warfarin/DOAC OR known_coagulopathy==yes` → **L16Ba (principles/YELLOW)**: reverse/correct per available agents (e.g. vitamin K + PCC for warfarin where available); agent/dose not in corpus. `antiplatelet` → **L16Bb (principles/YELLOW) — PATCH HARM-TRAP**: do **NOT** routinely recommend platelet transfusion for antiplatelet-associated traumatic ICH (associated with harm); discuss with the receiving neurosurgeon. Else → N16H.

### N16H — Hyperventilation as a guarded rescue (~ETCO₂ 35)
`kind: decision` · field: `herniation_signs` · **Source:** BTF LEGACY 3rd-Ed (`tier 0` legacy).
- **Edges:** `herniation_signs` → **L16Ha (principles/YELLOW)**: brief, mild HV ONLY as a short temporizing rescue for ACTIVE herniation while mannitol/transfer proceed (target ~ETCO₂/PaCO₂ 35); do NOT sustain; do NOT drive ≤25; avoid first 24 h where feasible. Else → **L16Hb (protocol/GREEN, tier 0)**: normoventilation, do NOT hyperventilate. Both → N17.

### N17 — Neuro-observation schedule (deterioration surveillance armed)
`kind: action` · **Source:** NICE NG232 obs parameters + schedule (`tier 1 [VERIFY-NICE]`).
- **L17 (protocol/GREEN, tier 1):** begin neuro-obs (GCS E/V/M, pupil size+reactivity, limb movements, RR, HR, BP, temp, SpO₂); half-hourly until GCS 15, then per schedule; deterioration → revert to half-hourly. The no-CT early-warning system. → N20.

---

## SECTION III — ESCALATION → OPERATE-vs-TRANSFER (clinical surrogates, NO CT)

### N20 — Herniation-cluster evaluation (the no-CT operate gate; concordant-signs gate)
`kind: decision` · **Herniation cluster (deterministic):** `H1 = fixed_pupil_side ≠ none OR (anisocoria with larger pupil sluggish/fixed)`; `H2 = focal_weakness_side ≠ none` (any new focal weakness, ipsi- OR contralateral — Kernohan's-notch false-localizing ~10–15%; motor lateralization explicitly **unreliable for localizing the clot**, `[VERIFY] VF-4`); `H3 = gcs_trend == declining`; `H4 = lucid_interval == yes`; `coma = gcs_total < 9`; `bilateral_fixed`.
- **Source:** Bullock/BTF Surgical-EDH (coma GCS<9 + anisocoria → evacuate ASAP, `tier 0`); Peshawar p.53/§D "surgery prior to neurologic decompensation (decreased mental status or anisocoria)" (`tier 0`); urgency keyed to the blown-pupil clock (doc 14).
- **COMPARATOR — SUPPRESSED FROM GMO RENDER:** the Bullock CT thresholds (30 cm³ / 15 mm / 5 mm MLS) are `comparator_audit_only = true`; the I/O layer is structurally barred from surfacing them. (Closes the no-CT display-leak risk.)
- **Edges (exhaustive over all inputs, incl. `lucid_interval == unknown`):**
  - `bilateral_fixed AND coma` → **N97 (bilateral-fixed futility-aware ABSTAIN_STOP)**.
  - `coma AND H1` (GCS<9 + fixed/anisocoric pupil, not bilateral) → **N21**.
  - `(H1∧H2) OR (H1∧H3) OR (H3∧H4)` → **N21** (the concordant-cluster gate).
  - `H3 OR H4 OR gcs_total≤8 OR posturing≠none OR lucid_interval==unknown OR anticoag∈{warfarin,DOAC,unknown} OR known_coagulopathy∈{yes,unknown}` → **N22 (STABILIZE_TRANSFER)** — incomplete cluster / deterioration / severe / lucid-unknown routes up (never dead-ends) / anticoagulated-or-unknown lowers the threshold.
  - **ELSE (explicit catch-all):** GCS≥13, all pupils reactive & no fixed pupil, no focal signs, lucid==no, no posturing, not anticoagulated → **N23 (OBSERVE + low-threshold transfer)**. Any input not matching the mild profile falls to N22, never an undefined state.

### N21 — Herniation present → operate-vs-transfer core decision
`kind: decision` · fields: `time_since_injury_hr`, `transfer_feasible_within_window`, `teleconsult_available` (`[VERIFY] VF-5` — operational inputs; the ≤4 h window informs but does not compute feasibility).
- **Source:** Peshawar p.53 (≤4 h golden window; 30% vs 90% mortality), §D task-SHARING ("supervised non-specialist EDH evacuation to enable safer transfer," REQUIRES neurosurgeon oversight/tele-consult, `tier 0`); Bullock (non-neurosurgeon unsupervised → worse outcomes — Wester).
- **Edges:**
  - `transfer_feasible_within_window == yes` → **L21a — action `STABILIZE_TRANSFER` (stop/RED)**: ABSTAIN from local op; intubate, mannitol-if-criteria, maintain SBP/O₂, transfer NOW; tele-consult en route. → N40.
  - `NOT feasible AND teleconsult_available == yes` → **L21b — action `GUIDE` (the operate-locally decision; mode stop/RED at the act)**: Peshawar task-SHARING under **LIVE** neurosurgeon supervision — Kyro surfaces the cited operative context and **hands off NOW to the supervising neurosurgeon. Kyro provides ZERO operative or localization guidance under any circumstance, including active supervision; all operative direction comes from the supervising neurosurgeon, not Kyro.** Continue all stabilization. → N40.
  - `NOT feasible AND teleconsult_available == no` → **L21c — action `GUIDE` (operate-locally indicated, but no supervisor; mode stop/RED)**: Kyro is **NOT authorized to direct an unsupervised craniostomy** (task-SHARING not task-SHIFTING; Wester worse outcomes). Maximal medical therapy + **keep attempting tele-consult/transfer**; the drilling decision remains a neurosurgeon's. → N40.

> **GUIDE-leaf note:** L21b/L21c carry `action = GUIDE` because doc-19 GUIDE = "operate-locally is the indicated category." But the GUIDE here is **decision + expert-connection + stabilization**, never a drill script — every GUIDE leaf funnels into N40 ABSTAIN_STOP for the localization step. L21a is the *transfer-feasible* variant of the same herniation finding and is therefore `STABILIZE_TRANSFER`.

### N22 — Transfer-now (deterioration / severe / penetrating / anticoag / cluster incomplete)
`kind: terminal-route` · **Source:** discuss-regardless-of-imaging triggers (persisting coma GCS≤8; GCS deterioration; progressive focal signs; seizure without recovery; penetrating; CSF leak) + GCS≤8→transfer = NICE (`tier 1 [VERIFY-NICE]`); Peshawar transfer + tele-consult bridge (`tier 0`).
- **L22 — action `STABILIZE_TRANSFER` (stop/RED, tier 1):** severe TBI and/or deterioration/focal/penetrating/anticoagulated WITHOUT a complete herniation cluster. ABSTAIN from local op. Stabilize, intubate if GCS≤8, transfer to a neurosurgery-capable facility, tele-consult now (+ antibiotics + AED-by-principle for penetrating). → N40.

### N23 — Observe + low-threshold transfer (mild/stable; gated behind red-flag negation)
`kind: decision` · **Reachable ONLY when:** GCS≥13, no fixed pupil, not bilateral_fixed, no focal signs, lucid==no, no posturing, seizure==none, mechanism==blunt, **not anticoagulated, no known coagulopathy.**
- **Source:** observation schedule + unexplained-confusion-discuss = NICE (`tier 1 [VERIFY-NICE]`); PJNS RCT "<30 mL + no deficit → conservative" honored via this clinical gate (doc 14 §E).
- **L23 — action `OBSERVE` (protocol/GREEN→armed, tier 1):** admit and observe on schedule; arm deterioration triggers (N30); low threshold to transfer — unexplained confusion >4 h, ANY GCS drop, new focal sign, pupil change → re-enter N30. → N30.

### N30 — DETERIORATION MONITOR (re-entry / dynamic trigger; full red-flag set + reversal guard)
`kind: monitor-loop` · fields: `gcs_trend`, `pupil_react_l`, `pupil_react_r`, `focal_weakness_side`, `persistent_vomiting`, `severe_or_increasing_headache`, `agitation`, `second_observer_confirmed`
- **Source:** NICE NG232 red-flag set + two-observer confirmation (`tier 1 [VERIFY-NICE]`).
- **Logic:** `redflag_fired := gcs_trend==declining OR pupil_change OR new_focal_asymmetry OR persistent_vomiting OR severe_or_increasing_headache OR agitation`. **Cross-time contradiction guard (S2):** a physiologically-implausible reversal (e.g. right pupil fixed at t0 → briskly reactive at t1 *with worsening GCS*) → **N03**. `redflag_fired AND second_observer_confirmed` → set `gcs_trend = declining` → **re-enter N20** (monotonic per S4). `NOT redflag_fired AND gcs_total ≥ patient_baseline (and ≥13) AND red_terminal_reached == false` → continue L23 observation (baseline-relative).

---

## SECTION IV — TERMINAL: THE IRREDUCIBLE SURGICAL / LOCALIZATION STEP

### N40 — DRILL-SITE / OPERATIVE LOCALIZATION (HARD ABSTAIN — Kyro NEVER guides this)
`kind: terminal` · **action `ABSTAIN_STOP`** · mode stop/RED · **Source:** Peshawar §D (task-SHARING requires structured neurosurgeon oversight; the operative act is bridging stabilization, NOT an autonomous license, `tier 0`); Bullock (craniotomy = neurosurgical-center capability; Wester worse outcomes for non-neurosurgeons operating unsupervised).
- **L40 (stop/RED — ABSTAIN_STOP):** "STOP. WHERE to place a burr hole / how to perform the craniostomy or craniotomy is OUTSIDE Kyro's scope and is NOT derivable from non-CT clinical signs (a fixed pupil and motor signs lateralize imperfectly; localization without imaging is unreliable). **Kyro provides ZERO operative or localization guidance under ANY circumstance, including active neurosurgeon supervision; all operative direction comes from the supervising neurosurgeon, not Kyro.** Continue airway, normotension, oxygenation, head-up, mannitol-per-criteria, coagulopathy correction, and transfer efforts." **TERMINAL — no outgoing edges.** (Re-entry only via N30, which never bypasses this abstain.)

---

## SPECIAL TERMINALS

### N97 — BILATERAL FIXED DILATED PUPILS (futility-aware, distinct terminal)
`kind: terminal` · **action `ABSTAIN_STOP`** · mode stop/RED · **Source:** Bullock/Sakas (BFDP grave; >6 h fixed = high mortality); **counter-evidence retained:** BFDP NOT uniformly fatal — if pupils react to osmotherapy a meaningful fraction survive (D2 grounding). Prognosis statements `tier 1`, `[VERIFY] VF-10`.
- **L97 (stop/RED):** "Bilateral fixed dilated pupils — the most ominous herniation sign, but NOT automatically futile. Do NOT nihilistically abandon and do NOT blind-drill. Maximal medical therapy (airway, mannitol per N14 if extracranial causes excluded, normotension, O₂), reassess pupillary response, hand the decision to a neurosurgeon via tele-consult. Prognosis grave; goals-of-care framing appropriate, but the operative decision is deferred to the neurosurgeon, never local autonomous operation." → N40.

### N98 — PEDIATRIC (age < 15) — OUT-OF-ADULT-SCOPE ABSTAIN
`kind: terminal` · **action `ABSTAIN_STOP`** · mode stop/RED · **Source:** adult BTF SBP bands and adult GCS do not cover children; pediatric SBP/GCS are weight/age-based and out of MVP scope (`tier 2`).
- **L98 (stop/RED):** "Age < 15 is OUTSIDE this tool's encoded adult thresholds (a hypotensive child must NOT be read as 'normotensive'). Kyro ABSTAINS. Stabilize with labeled pediatric principles (airway; maintain age-based minimum SBP ≈ 70 + 2×age mmHg — labeled non-specific; oxygenation; head-up; treat hypoglycaemia) and transfer + tele-consult now. Pediatric protocol is roadmap, not encoded." → N40.

### N99 — OUT-OF-TREE / UNRESOLVABLE INPUT (S3)
`kind: terminal` · **action `ABSTAIN_STOP`** · mode stop/RED.
- **L99:** "Input not recognized as a valid value, or out of range. Kyro ABSTAINS rather than guess. Default: stabilize (airway, normotension, oxygenation, head-up), transfer, escalate via tele-consult. Re-enter once valid structured fields are available."

---

## TRAVERSAL SUMMARY

```
N00 → N01(mech+penetrating,time) ─[penetrating/blast/open/non-trauma]→ N22 [STABILIZE_TRANSFER]
   → N1A(anticoag) → N04(GCS) → N05(pupils; bilateral_fixed) → N06(BP,age,SpO2,glucose)
        └─[age<15]→ N98 [ABSTAIN_STOP] → N40
   → N07(lucid) → N08(focal/posturing/seizure) ─[active seizure]→ L08S abortive + N10 + N22
   → N09[completeness] ─missing→ N02 ↺
   → N10(airway) → N11(BP) → N12(O2; unknown=not-excluded) → N13(head-up*)
   → N14(mannitol; ANY extracranial cause unknown/uncorrected → L14b correct-first)
   → N15(phenytoin; +TXA<3h principle) → N16(DO-NOT split-levels) → N16B(coag reversal; PATCH-trap)
   → N16H(HV guarded ~ETCO2 35) → N17(obs)
   → N20[HERNIATION CLUSTER, exhaustive, concordant-signs gate]
        ├─ bilateral_fixed+coma → N97 [ABSTAIN_STOP] → N40
        ├─ coma+fixed-pupil / concordant cluster → N21
        │     ├─ transfer feasible        → L21a [STABILIZE_TRANSFER] → N40 ABSTAIN(drill)
        │     ├─ no transfer + teleconsult → L21b [GUIDE = supervised handoff] → N40 ABSTAIN(drill)
        │     └─ no transfer + no teleconsult → L21c [GUIDE = maximal-medical] → N40 ABSTAIN(drill)
        ├─ deterioration/severe/penetrating/anticoag/lucid-unknown → N22 [STABILIZE_TRANSFER] → N40
        └─ mild/stable (all red-flags negated) → N23 [OBSERVE] → N30[monitor] ──redflag+2nd-obs──> N20
Contradiction → N03 ↺  |  Cross-time pupil reversal → N03  |  Out-of-tree → N99 [ABSTAIN_STOP]
```
`*` = YELLOW principle (tier 2). **Every operate-adjacent path funnels into N40; no edge ever names a burr-hole site.**

---

## DESIGN NOTES

**The no-CT handling.** The single most important design constraint is the absence of imaging. The tree therefore (a) never asks for or surfaces a clot volume / midline-shift number (audit-only, structurally suppressed at N20); (b) substitutes a **concordant clinical herniation cluster** for the CT operate-criteria; (c) uses **GCS-P** (E/V/M + pupil reactivity) as the no-CT severity index; and (d) keeps localization a hard ABSTAIN because no clinical sign reliably localizes a clot side without imaging.

**The GUIDE semantics.** Per the re-aim (CLAUDE.md) and doc 19, `action = GUIDE` denotes the *category* "operate-locally indicated, transfer not feasible." Kyro's contribution at a GUIDE leaf is to (1) confirm the concordant indication, (2) surface the **cited** operative-context/landmark literature and (3) **connect a live expert** for supervised task-SHARING — and then continue stabilization. It is emphatically **not** an autonomous drill script: the drill-site/localization step is N40 ABSTAIN_STOP under all inputs, including active supervision.

**Why the operate path never fully "operates" inside Kyro.** The deepest GREEN action Kyro itself emits is *medical herniation management + supervised hand-off.* The act of operating — and specifically drill-site localization (N40) — is always RED/ABSTAIN, consistent with Peshawar's task-SHARING-not-task-SHIFTING doctrine and Bullock's finding that unsupervised non-neurosurgeon evacuation worsened outcomes. Kyro is the stabilize-and-bridge co-pilot the sources authorize, not an autonomous surgeon.

---

## CITATION MAP (node → source → tier)

| Node(s) | Source | Tier | Note |
|---|---|---|---|
| N01 (time, mechanism) | Peshawar p.53 (≤4 h); §C surveillance minimum dataset | 0 | "WHO minimum dataset" over-attribution removed |
| N01 penetrating/blast → N22 | NICE NG232 1.4.16 | 1 | `[VERIFY-NICE]` |
| N1A anticoag | NICE lowered-threshold trigger; reversal = principle | 1 / 2 | `[VERIFY-NICE]`; PATCH tier 2 |
| N04 | NICE 1.3.1–1.3.3 (E/V/M); GCS-P with N05 | 1 | `[VERIFY-NICE]` |
| N05, N20 | Bullock/BTF Surgical-EDH (coma+anisocoria); 4 mm floor removed | 0 | pupil-min-obs portion = NICE tier 1 |
| N06/N11 SBP | BTF 4th Ed Table 3, Level III | 0 | verified `src_lww_journal.txt` p.7 |
| N06 glucose / N12 SpO₂ | Peshawar (oxygenation, no cutoff); glucose uncited | 2 | VF-2; S5 |
| N13 | none (head-up 30° absent) | 2 | VF-3 |
| N14 mannitol | BTF 4th Ed Table 1 LEGACY (herniation/progressive; 0.25–1 g/kg) | 0 legacy | VF-6 |
| N15 phenytoin | BTF 4th Ed Table 1, Level IIA (early PTS ≤7 d) | 0 | verified p.8 |
| N15 TXA overlay | CRASH-3 / doc 10 rule 4 (TXA <3 h) | 2 | `[VERIFY-TXA]` — not in extracted corpus |
| N16 steroids | BTF Table 1, Level I (contraindicated) | 0 | verified p.4 |
| N16 hypothermia | BTF Table 1, Level IIB (≤2.5 h, 48 h, diffuse) | 0 | qualifiers restored; verified p.4 |
| N16 hyperventilation | IIB for "prolonged HV ≤25"; "avoid first 24 h"+"brief HV" = LEGACY no Level | 0 | split; verified p.4 |
| N16B reversal / PATCH | labeled principle; PATCH harm-trap | 2 | `[VERIFY-PATCH]`; no agent-specific protocol in corpus |
| N16H HV rescue (~ETCO₂ 35) | BTF LEGACY 3rd-Ed | 0 legacy | guarded action |
| N17, N30 | NICE NG232 obs params/schedule/red-flags/two-observer | 1 | `[VERIFY-NICE]` |
| N20 cluster | Peshawar §D + Bullock; doc 14 blown-pupil clock | 0 | CT thresholds audit-only, suppressed |
| N21 task-sharing | Peshawar §D; doc 14 §B golden window (30% vs 90%); Bullock Wester | 0 | |
| N22 | NICE 1.4.16, 1.8.1 (discuss/transfer regardless of imaging) | 1 | `[VERIFY-NICE]` |
| N23 observe | NICE obs; doc 14 PJNS RCT (<30 mL+no deficit → conservative) | 1 / 0 | clinical gate; volume audit-only |
| N40 drill abstain | Peshawar §D + Bullock (oversight required; Wester) | 0 | ZERO operative guidance even under supervision |
| N97 bilateral-fixed | Bullock/Sakas; BFDP-not-always-fatal counter-evidence | 1 | VF-10 |
| N98 pediatric | adult BTF bands don't cover <15; peds SBP principle | 2 | out of MVP scope |

---

*Mentor sign-off, the full v1→v2→v3 changelog, the 38-vignette coverage table, and the Tier-A seed vignettes are in `21-cgt-mentor-pack.md`. The deterministic INSERT statements matching the doc-08 §1 contract are in `../spine/edh-cgt.sql`.*
