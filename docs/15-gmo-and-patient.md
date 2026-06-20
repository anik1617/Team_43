# 15 — The GMO & the Patient (HM): the two people in the case

Everything in the knowledge base ultimately serves two people: the **GMO** who must act, and **HM** who must survive the system. This doc consolidates a 6-agent harvest (~180 accredited, Pakistan/LMIC-specific sources) into a deep profile of each — the GMO's training, competency, communication, and what they'd need; and HM's barriers, wait-times, and the gaps he fell through.

Flags: 🟢 open/gov/CC · 🟡 free-but-copyrighted · 🔴 paywalled. (Peshawar-specific context is in [14-peshawar-pakistan-context.md](14-peshawar-pakistan-context.md).)

---

# THE GMO

## PART A — Who the GMO is (role, training, responsibilities)
| Fact | Detail | Source |
|---|---|---|
| **Definition** | A **General Medical Officer = MBBS + a 1-year house job + PMDC/PMC registration.** A *generalist who has explicitly NOT completed a specialty residency (FCPS/MCPS).* By Pakistan's own regulators, a non-specialist. | 🟢 [CPSP](https://www.cpsp.edu.pk/general-info.php) · [PMDC](https://pmdc.pk/) |
| **Surgical exposure** | MBBS surgery is **one largely *observational* rotation** ("assist under supervision"); even formal residents report **thin operative experience**. → HM's GMO had **near-zero cranial/neurosurgical operative experience** before the burr hole. | 🟡 [MBBS curriculum](https://umdc.pk/blog-detail/mbbs-curriculum-in-pakistan-subjects-exams-and-clinical-training) · 🔴 [JPMA operative-experience](https://pubmed.ncbi.nlm.nih.gov/35501607/) |
| **Scope of practice** | The MO is the **lone clinical lead at a BHU/RHC** — outpatient + emergencies + "minor surgeries," expected to handle a lot solo. | 🟢 [WHO-EMRO PHC Pakistan](https://www.emro.who.int/emhj-volume-30-2024/volume-30-issue-2/situation-analysis-of-the-quality-of-primary-health-care-services-in-pakistan.html) |
| **The rural reality** | MOs have the **highest exit intent (44%)**; providers in **Gilgit-Baltistan, AJK, Balochistan** are most likely to leave due to terrain/isolation; burnout common. → *why the GMO is alone.* | 🟢 [Mir 2015, PMC4895244](https://pmc.ncbi.nlm.nih.gov/articles/PMC4895244/) |
| **The task-shift is already happening** | Pakistani district hospitals already **task-shift surgery to non-specialist MOs "without discrete regulation and monitoring."** | 🟢 [WHO-EMRO EMHJ 2025](https://www.emro.who.int/emhj-volume-31-2025/volume-31-issue-6/assessment-of-surgical-services-and-needs-in-rural-district-and-subdistrict-hospitals-in-pakistan.html) |

**→ Kyro's user is a *trained doctor with hands and a baseline*, missing neuro-specific knowledge + confidence + a "when to stop" gate — not a layperson. This is the defensible target.**

## PART B — What the GMO needs to do this procedure (competency + upskilling)
- **The competency gap is real but bridgeable:** DCP3 holds that **~90% of essential operations are within a GP's *potential* competence with short-course training** — but **skills decay without refreshers** ([DCP3](https://www.ncbi.nlm.nih.gov/books/NBK333507/)); head/neck is the **largest unmet rural surgical need** in Pakistan ([World J Surg 2019](https://pubmed.ncbi.nlm.nih.gov/31848676/)). It's *confidence + retention*, not just raw knowledge, that blocks action.
- **What they must learn for an emergency EDH burr hole:** indications (GCS <8 / unequal pupils / imaging-confirmed or strongly suspected EDH); **landmark with no CT** — temporal, **2 cm superior + 2 cm anterior to the tragus, ipsilateral to the blown pupil**; technique (**clutch/perforator bit prevents plunging**); herniation recognition (ipsilateral blown pupil = earliest reliable sign + contralateral weakness + falling GCS); and the **operate-vs-transfer** decision. Sources: 🟢 [Wilson "How to do it" PMC3352313 (CC BY)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3352313/), [Military Medicine 2006](https://academic.oup.com/milmed/article-pdf/171/1/12/21978642/milmed.171.1.12.pdf), [Uncal Herniation StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK537108/).
- **⭐ The evidence that point-of-care guidance *works* (Kyro's core mechanism, RCT/Cochrane-grade):**
  - **Just-in-Time procedure guides (West J Emerg Med 2022, CC BY):** 95.8% rated them very helpful, and **16% of physicians then performed procedures they'd previously delegated to specialists.** ([PMC9183769](https://pmc.ncbi.nlm.nih.gov/articles/PMC9183769/))
  - **JIT-training RCT:** refresher video + interactive checklist significantly improved performance of a *rare* procedure ([PMID 28866621](https://pubmed.ncbi.nlm.nih.gov/28866621/)).
  - **Cochrane review:** mobile decision-support improves guideline adherence in LMIC primary care (effects depend on workflow integration) ([Cochrane CD012944](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD012944.pub2/full)).
  - **Cognitive aids/checklists** are valued *most* for crises and **procedures clinicians rarely perform** — the GMO's exact situation ([Anesth Pain Med](https://pubmed.ncbi.nlm.nih.gov/26568921/)).
  - **→ This reframes Kyro as a "cognitive aid / JIT procedure guide" with hard evidence — NOT "AI replicating a surgeon."**
- **Training/simulation Kyro can plug into (not replace):** a **$145/participant** South-Asia bootcamp on **3D-printed skulls** improved 14 skill domains ([BMC Med Educ 2022](https://bmcmededuc.biomedcentral.com/articles/10.1186/s12909-022-03965-9)); a **$32 burr-hole simulator** ([PMC6553667](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6553667/)). Existing curricula to align with: **COSECSA Essential Surgical Training**, RCSI/COSECSA.
- **Why offline (not telementoring):** telementoring systematic reviews name **unreliable network, latency, power** as the failure mode — i.e., the dropped call. **Kyro = "telementoring for when there's no signal."** ([Telementoring review PMC12394307](https://pmc.ncbi.nlm.nih.gov/articles/PMC12394307/))

## PART C — How the GMO communicates (and why it failed)
- **The call to the neurosurgeon was a high-stakes "curbside consult"** — informal, memory-based, undocumented, error-prone; curbsides frequently carry incomplete/inaccurate information vs a formal review. ([Curbside review PMC2882285](https://ncbi.nlm.nih.gov/pmc/articles/PMC2882285))
- **Telemedicine exists in Pakistan but doesn't reach the BHU mid-emergency:** Sehat Kahani (48 e-clinics), AKU Teleclinics, doctHERs/LHW model — but the **rural successes were all asynchronous / low-bandwidth / offline-sync**, not real-time video. ([Pakistan telemedicine review, CC BY, PMC8738974](https://pmc.ncbi.nlm.nih.gov/articles/PMC8738974/))
- **⭐ The dropped call was structurally predictable, not bad luck:** a 42-country analysis found that **below ~40% internet penetration, telehealth has *no meaningful relationship* with care utilization** — and Gilgit-Baltistan sits far beneath that floor. ([Digital Health 2025, PMC12583876](https://pmc.ncbi.nlm.nih.gov/articles/PMC12583876/)) Rural Sindh clinicians name **"lack of internet + electronic gadgets"** as the top barrier ([PMC10849444](https://pmc.ncbi.nlm.nih.gov/articles/PMC10849444/)).
- **WhatsApp is the entrenched informal channel — even in LMIC neurosurgery** (11,000+ records in one chain) — but it's **insecure, non-compliant, and breaks the instant signal drops**, with no clean record-keeping. ([PMC8708459](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8708459/), [PMC10593181](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10593181/))
- **Referral communication is threadbare:** handwritten slips; one study found **only 27% of referrals had any notes**. → Kyro can auto-generate a structured referral/handoff summary. ([PMC6747881](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6747881/))
- **The proven workaround = store-and-forward / local-first sync** (validated in Cambodia/Uzbekistan/Kosovo) — which **maps exactly onto Kyro's "knowledge = signed data bundles, patient data never leaves the device."** ([PMC4745383](https://pmc.ncbi.nlm.nih.gov/articles/PMC4745383/))
- **WHO's own caveat:** telemedicine is recommended *only where infrastructure permits*, and "digital health is not a substitute for functioning health systems." ([WHO 2019, NBK541902](https://www.ncbi.nlm.nih.gov/books/NBK541902/)) → an offline tool, not telemedicine, fits the case.

---

# THE PATIENT (HM)

## PART D — Barriers to care (the Three Delays)
HM's journey maps cleanly onto **Thaddeus & Maine's "Three Delays"** ([1994 origin](https://mamazur.org/wp-content/uploads/2021/03/Thaddeau_1994_TooFarToWalk.pdf); [adapted to trauma, BMJ GH PMC8118008](https://pmc.ncbi.nlm.nih.gov/articles/PMC8118008/)):

| Delay | What it was for HM | Evidence |
|---|---|---|
| **1 — Deciding to seek care** | "He just needs rest" — lucid interval misread; no local "concussion" concept; family/collective decision; traditional/spiritual healers as first resort; **82% low health literacy** in one Pakistani sample; women may need **male permission** to act | 🟡 [health-seeking review](https://www.academia.edu/27161967/) · 🟢 [spiritual-healer-first, medRxiv](https://www.medrxiv.org/content/10.64898/2026.04.23.26351601v1) · 🟢 [gendered access PMC8508279](https://pmc.ncbi.nlm.nih.gov/articles/PMC8508279/) |
| **2 — Reaching care** | **No ambulance** (only ~20% of injured use one); mountainous terrain; **GB's nearest tertiary is ~600 km / 16 h via the Karakoram Highway, no air transport**; GIS models *underestimate* real off-road travel time | 🟡 [GB remote care, PJMS](https://www.pjms.com.pk/issues/janmar09/article/article26.html) · 🟢 [Pakistan trauma access PMC12699741](https://pmc.ncbi.nlm.nih.gov/articles/PMC12699741/) |
| **3 — Receiving adequate care** | No specialist, no imaging, broken referral; **GB named a gender-access "hotspot"** | 🟢 [neurosurgeon density](https://www.sciencedirect.com/science/article/abs/pii/S1878875023012433) · 🟢 [GB access hotspot, MDPI](https://doi.org/10.3390/healthcare13192448) |

## PART E — Wait times & delays (the clocks that ran out on HM)
**⭐ The reframe that matters most:** per BTF, *"time from neurological deterioration to surgery is more important than time from trauma to surgery."* **HM's clock started at the blown pupil, not the crash** ([StatPearls EDH](https://www.ncbi.nlm.nih.gov/books/NBK518982/): "every hour of delay from herniation to decompression worsens outcome").

| The number | Source |
|---|---|
| **GNOS: median injury→surgery = 13 h** (IQR 6–32) vs the 4-h target; 18% mortality; ~2.8× mortality OR in lower-HDI settings | 🔴 [Lancet Neurology 2022](https://www.thelancet.com/article/S1474-4422(22)00037-0/fulltext) · 🟢 [NIHR summary](https://www.nihr.ac.uk/news/largest-ever-study-traumatic-brain-injury-highlights-global-inequality-treatment-and-causes) |
| **Anisocoria >70 min before EDH evacuation → 100% mortality (5/5)** (Cohen, via BTF) | 🟢 [BTF Ch.3](https://tbiguidelines.com/gl/surgical/chapter-3) |
| **EDH <2 h to surgery = 17% mortality / 67% good recovery; >2 h = 65% / 13%** (Haselsberger) | 🔴 [Acta Neurochir](https://link.springer.com/article/10.1007/BF01560563) |
| **Fixed/dilated pupils >6 h → all died** (Sakas) | 🟢 BTF Ch.3 |
| **Cambodia (n=3,476): outcomes fall off a cliff past 4 h injury-to-admission**; each 30-min delay +2 h LOS | 🔴 [World Neurosurg 2019](https://www.sciencedirect.com/science/article/abs/pii/S1878875019304255) |
| **Ecuador (n=383): arrival ≥5 h → 3.34× mortality, 2.92× disability** | 🟢 [PMC12563715](https://pmc.ncbi.nlm.nih.gov/articles/PMC12563715/) |
| **Pakistan (AKUH): mean injury→ER 4.7 h; only 30.9% within the golden hour** | 🔴 [Int J Surg 2010](https://www.sciencedirect.com/science/article/pii/S1743919109001794) |

> ⚠️ **Intellectual-honesty caveat (earns credibility with MD judges):** PATOS (4 Asian countries) and the AKUH Pakistan study found prehospital *time* **not** significantly linked to *mortality* (though PATOS shows a clear *disability* signal). **Frame delay's harm through disability and the deterioration→decompression interval — not crude minutes-to-death.**

## PART F — Where care is lacking (the gaps HM fell through) + lived burden
| Gap | The stat | Source |
|---|---|---|
| **Diagnosis (no CT)** | GB had **no tertiary facility, one neurosurgeon for ~2 M, nearest tertiary 9–13 h away, 46.6% of cases neuro-trauma**; **~66% of humanity lacks MRI access**; in Pak-NEDS only **39.5% of TBI patients got a CT** | 🟡 [GB neurosurgery, Hosp Practice 2022](https://www.tandfonline.com/doi/full/10.1080/21548331.2022.2133438) · 🟢 [Pak-NEDS PMC4682387](https://pmc.ncbi.nlm.nih.gov/articles/PMC4682387/) |
| **⭐ ICU / monitoring** | **Gilgit-Baltistan has ZERO ICU beds per 100,000** (national survey; median KP 0.7) — HM's post-op monitoring problem is an *absence*, not a shortage | 🟢 [Crit Care 2022](https://link.springer.com/article/10.1186/s13054-022-04046-5) |
| **Rehabilitation** | **<1 allied rehab professional per 10,000 Pakistanis; only 48 physiatrists nationally** → "no rehab within 200 km" is the national baseline; the family *is* the rehab system | 🟢 [JHU "Call to Action" 2023](https://publichealth.jhu.edu/sites/default/files/2025-04/Rehabilitation-in-Pakistan-A-Call-to-Action-December-2023.docx.pdf) · 🟢 [WHO scale-up rehab](https://www.who.int/docs/default-source/documents/health-topics/rehabilitation/call-for-action/need-to-scale-up-rehab-july2018.pdf) |
| **Long-term burden** | **Post-traumatic epilepsy doubles severe disability (46% vs 21%)**; HM's seizure faces a **98% rural epilepsy treatment gap + djinn/witchcraft stigma**; **~89% out-of-pocket spending** → engineered medical debt; severe-TBI employment ~49% even in rich settings → **breadwinner collapse** for a subsistence farmer | 🟡 [PTE & disability, Neurology 2023](https://www.neurology.org/doi/10.1212/WNL.0000000000207183) · 🟢 [epilepsy gap/stigma, ILAE](https://www.ilae.org/files/dmfile/EpilepsyTreatmentGap-Pakistan-EpilepsyandBehavior.pdf) · 🟢 [CHE Pakistan](https://www.medrxiv.org/content/10.1101/2022.11.28.22282844v1) |
| **The procedure was right** | **KCMC Tanzania: non-specialist burr-hole evacuation → 18.6% mortality, 75.6% favorable outcome** — the closest published analog; HM's GMO did the correct thing, and task-shared evacuation saves lives | 🟢 [PMC10714222](https://pmc.ncbi.nlm.nih.gov/articles/PMC10714222/) |

---

## 🎯 Strategic synthesis — the two people → Kyro design
1. **Frame Kyro as a JIT cognitive aid / decision support** (RCT- and Cochrane-backed), *not* "AI replicating a surgeon." The GMO already has hands + a baseline; Kyro supplies the missing neuro-specific steps, the confidence to act, and **the discipline to STOP and transfer**.
2. **Offline-first is empirically justified** — the 40% internet threshold + telementoring's connectivity failures mean a synchronous link *cannot* be the lifeline. Store-and-forward sync = the proven pattern Kyro uses.
3. **The clock starts at the blown pupil** — Kyro's urgency/triage logic should key on *deterioration→decompression*, with the EDH timing numbers (Cohen/Haselsberger/Sakas) as the evidence.
4. **Map to the Three Delays honestly:** Kyro mainly attacks **Delay 3** (receiving adequate care) + the operate-vs-transfer decision; its recognition content can *help* Delay 1, but Delays 1–2 are mostly system/prevention problems (don't overclaim).
5. **Be intellectually honest about delay→outcome** — lead with *disability* and *deterioration interval*, acknowledge the mortality-signal nuance. This earns the MD panel's trust.
6. **Task-sharing is real but unregulated** ("without monitoring") — Kyro provides exactly the *structure, source-citation, and auditability* the literature says task-sharing needs.
7. **The patient/family UX must be family-mediated, low-literacy, and stigma-aware** (jinn beliefs, epilepsy stigma, gendered decisions).
8. **HM's GMO did the right thing** — the closest real-world analog (KCMC) shows 75.6% good outcomes from non-specialist burr-hole evacuation. Kyro makes that *the rule, not the lucky exception.*

## ✅ Verification flags
- Several flagship delay sources (GNOS, Cambodia, Haselsberger, AKUH) are 🔴 paywalled / returned 403 to automated fetch — key numbers are from open abstracts/press releases/secondary citation; **confirm verbatim figures via institutional access** before the deck.
- The "no local word for concussion" claim is **inference** (explanatory-model + low-literacy literature), not a hard citation — don't overstate.
- GMO duty descriptions partly rely on 🟡 SlideShare/Scribd reproductions of Pakistani health-dept documents — pair with the 🟢 WHO-EMRO/PMC sources for formal claims.
