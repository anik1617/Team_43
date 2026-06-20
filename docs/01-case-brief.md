# 01 — Case Brief & Neuro Glossary

Source: `../Case Report and Hackathon Challenge/Hackathon Case Report - InstantImpact LastingDisability.pdf` (9 pages; the file is ~26MB because of embedded images — extract text with `python -c "import fitz; d=fitz.open(PATH); print('\n'.join(p.get_text() for p in d))"`).

## The case in one paragraph

**HM**, a 31-year-old subsistence apricot farmer in rural **Gilgit-Baltistan, Pakistan**, sole earner for a household of six. Years of unrecognized repetitive soccer head impacts plus 3–4 years of gradual cognitive/behavioral decline his family blamed on stress. A pickup truck rollover throws his head against the door frame → ~4-minute loss of consciousness → a deceptive **"lucid interval"** where he seems fine → then a fast collapse: blown left pupil, right-sided weakness, consciousness crashing (GCS 14 → 7). The cause is an **epidural hematoma** (a bleeding clot pressing on the brain) causing **uncal herniation** (the brain being squeezed). There is **no ambulance, no imaging, and no neurosurgeon** anywhere near. A **general medical officer (GMO) with general surgical training but no neurosurgery experience** drills an emergency **burr hole** — guided by a phone call to a distant neurosurgeon that keeps dropping — drains the clot, and saves HM's life. HM survives with **permanent cognitive, motor, behavioral, and psychiatric deficits**, **no rehabilitation within 200km**, an untrained family caregiver, social stigma, medical debt, and a first seizure six months later.

## The patient journey — where it broke at every stage

| Phase | What went wrong | Design opening (pain point) |
|---|---|---|
| Pre-injury (years) | Repetitive sports head impacts + slow decline dismissed as "stress"; no local concept of "concussion" | Prevention / chronic-mTBI detection / awareness |
| Injury → lucid interval | 4-min LOC, then *looks fine* (GCS 14) → family decides to "rest at home" | Prehospital recognition |
| Deterioration | Textbook herniation: blown pupil, weakness, GCS 14→7; no ambulance, no emergency number | Cost of not recognizing the trajectory |
| Transport/triage | 45km unpaved road, no immobilization/airway/IV; tertiary center 200km = certain death if transferred | Operate-locally-vs-transfer decision |
| Diagnosis | **No CT, no labs** — diagnosis is purely clinical (pupil + GCS + mechanism) | Diagnosis-without-imaging |
| Surgery | **A GMO who never did neurosurgery** drills a burr hole with a hand-crank drill, on dropping phone guidance | **Surgical task-shifting / real-time guidance** ← our lead |
| Perioperative | No ICP monitor, no CT to recheck; day-3 fever → infection | Monitoring + complication detection |
| Rehab & reintegration | Permanent deficits; <10 rehab pros per million in Pakistan, none rural; untrained caregiver; stigma; debt; seizure at 6 months | Rehabilitation / caregiver training / systems |

## The one mechanism behind the whole emergency

The skull is a **sealed, rigid box** holding brain + blood + cerebrospinal fluid. It can't expand. So when a *fourth* thing appears — a pocket of bleeding — something else gets crushed. This is the **Monro–Kellie doctrine**, and it's the engine behind every scary moment: the clot raises pressure → pressure crushes the brain from the inside → the brain herniates → death, unless someone releases the pressure fast. An epidural hematoma is the "winnable" emergency because the fix (drain the clot via a burr hole) is mechanically simple and dramatically effective — the barrier is **recognition, timing, and access**, not surgical complexity.

---

## Neuro glossary (plain English, walked through HM's timeline)

For teammates without a medical background. The terms only make sense as a chain of cause-and-effect — that chain *is* the medical story.

**The two scoring tools the case keeps quoting:**

- **GCS (Glasgow Coma Scale)** — a 3-to-15 score for "how awake is the brain," summing Eyes (1–4) + Verbal (1–5) + Motor (1–6). Higher = better. HM goes **14 → 7**: 14 is "almost normal, a bit confused"; **below 8 = comatose**, the line where the brain can't protect its own airway. That drop is the alarm nobody could read.
- **Pupils** — normally equal and they shrink in light. A pupil that goes **"huge" and won't react** (a "blown pupil," medically *anisocoria* = unequal pupils) is not an eye problem — it's a **brain-being-crushed** problem.

**Walking the timeline:**

- **Concussion / mild TBI** (the "saw stars" years) — a brain "jolt" with temporary malfunction, no visible bleed. Repeated ones can accumulate (the basis of **CTE**, chronic traumatic encephalopathy — the NFL-player condition). HM's slow personality change fits this.
- **Lucid interval** *(the deadliest feature)* — in an **epidural hematoma (EDH)** — arterial bleeding into the space **between the skull and the brain's tough outer cover (the dura)** — the patient often wakes up and seems normal while the clot silently grows, then crashes. Doctors call it **"talk and die."** This is why the family thought "he just needs rest."
- **Uncal herniation** (the blown pupil + opposite-side weakness) — rising pressure pushes part of the temporal lobe (the "uncus") down, pinching the **nerve that controls the pupil (Cranial Nerve III / oculomotor nerve)** → that pupil stays huge and fixed, on the *same* side as the clot (HM's left). The same shift crushes motor fibers → weakness on the *opposite* side (HM's right). So "left blown pupil + right-sided weakness" = "left-sided clot, herniating NOW."
- **Cushing reflex** (heart rate dropping to 52, irregular breathing) — when the **brainstem** (the brain's life-support control center) gets compressed, the body spikes blood pressure and *slows* the heart in a last-ditch fight to keep blood flowing. It means **brainstem failure is imminent** — minutes from death.
- **The rescue:**
  - **Head of bed to 30°** — gravity helps drain blood/fluid out of the head.
  - **Mannitol** — a "water-pulling" IV sugar that draws fluid *out* of the swollen brain, buying time by lowering pressure.
  - **Oropharyngeal airway + bag-valve-mask** — a mouthpiece to stop the tongue blocking the throat + a hand-squeezed bag to breathe for a comatose patient. **Endotracheal intubation** (a tube into the windpipe) is the gold standard but needs anesthesia they didn't have.
  - **Burr hole** — drilling a small hole in the skull with a **Hudson brace** (a hand-crank drill, like a carpenter's brace) to let the trapped blood escape. The instant it drains, pressure drops, the pinched nerve recovers, and the pupil shrinks — exactly what the case reports.
- **Afterward:**
  - **CT, "midline shift," "reaccumulation"** — CT is the X-ray-movie that shows the clot; *midline shift* = brain visibly pushed off-center (a danger sign); they had no way to see if the clot came back.
  - **Ceftriaxone** — an antibiotic (for the day-3 surgical-site infection).
  - **Levetiracetam (Keppra) / "seizure prophylaxis"** — a drug to *prevent* seizures. HM's seizure at 6 months = **post-traumatic epilepsy** (a lasting seizure disorder caused by the injury).
  - **The deficits** map to brain regions: **cognitive** (attention, short-term memory, *executive function* = planning/multi-step tasks — why he can't run the irrigation schedule), **motor** (right-sided weakness), **behavioral/psychiatric** (irritability, apathy, depression — frontal-lobe emotional regulation). **Neurorehabilitation** = the structured therapy to recover these, which HM has none of within 200km.
