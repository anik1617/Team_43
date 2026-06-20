# 14 — Peshawar & KP: the Pakistani neurotrauma reality ("make it effective *here*")

The layer that grounds Kyro in the actual place. The case is set in Pakistan; the **Peshawar Recommendations** are the credibility cornerstone; and your repo contains a **primary-source lecture by a Peshawar neurosurgeon teaching exactly this problem.** This doc consolidates that primary-source extraction + a 5-agent harvest (~150 verified sources) so every Pakistan claim is grounded in Pakistani data — *and* so Kyro is designed to be effective in this specific system.

Flags: 🟢 open/gov/CC · 🟡 free-but-copyrighted · 🔴 paywalled.

> **Two distinct "Dr. Khan"s — don't conflate:** **Prof. M. Tariq Khan** (Northwest General Hospital, Peshawar; co-author of the Peshawar Recommendations; Dean of Neurosurgery, CPSP) and **Dr. Mohammad Nawaz Khan** (consultant neurosurgeon, **Lady Reading Hospital**, Peshawar; gave the hackathon lecture in your repo).

---

# PART A — ⭐ The primary source: Dr. Nawaz Khan's LRH lecture (how they *actually* do TBI + their concerns)
From `Case deep dive tbi in a resource limited setting, trancript.txt` — Dr. Mohammad Nawaz Khan, consultant neurosurgeon at **Lady Reading Hospital (LRH), Peshawar**, presenting *"Closing the Gap: Managing TBI in resource-limited settings."* This is gold: a Peshawar neurosurgeon, on the record, describing their reality.

### His representative case (the Peshawar version of HM)
24-yo male, **motorbike RTA, no helmet**, injured in **Swat (~300 km, hilly)**. GCS 10–15 at a local hospital *that had a neurosurgery dept but no free ICU bed* → **bounced through four hospitals over 8+ hours** chasing an ICU bed → arrived at LRH at **GCS 6** → decompressive craniectomy → **3 months ICU, vegetative.** *"This is a daily story."*

### Their published LRH data (1,068 severe TBI patients)
| Metric | Value |
|---|---|
| In-hospital mortality | **12.2%** |
| Poor outcome (GOS <3) at discharge | **95.9%** |
| From rural origin | **72%** |
| Median prehospital delay | **6 h** (rural ~9 h, urban ~3 h) |
| In-hospital delay to surgery | **~42 min** (i.e., the delay is *pre*-hospital, not in-theatre) |
| Mortality predictors | **fixed pupil, hypotension, low GCS (<6), late arrival** |

### CT casemix (drives the whole design)
**31% epidural hematoma** · 27% contusion · 19% traumatic SAH · 18% acute SDH · 5% mixed. **EDH is the single most common *surgical* lesion → validates Kyro's EDH beachhead.**

### KP capacity (his numbers)
40 M population · 10–15 tertiary hospitals · 250+ secondary · **only 7–8 functioning neurosurgical units** · **<200 neurosurgical trauma beds** · emergency burden 8–12 M/yr · referral load 1–2 M/yr.

### His #1 stated concern: the broken referral/communication system
*"There is no referral mechanism… a broken communication system."* Patients bounce hospital-to-hospital on **handwritten slips with no data**; no accountability; the three Peshawar tertiary centers (**LRH, HMC, KTH**) are choked and refer to each other. **This — not surgical skill — is what he blames for the 95.9% poor outcomes.** (His solution: a **zero-budget digital referral app** on doctors' own phones, with a planned **"second-opinion chat"** for rural CT+history → remote advice. *Kyro is the complementary operative-moment tool; his app fixes referral.*)

### ⭐⭐ The single most validating quote for Kyro (his answer to "no CT, no ICU — what do we do?")
> *"Saving traumatic brain injury patients might not require as much resources as we presume. Only [these] factors: (1) **do not let hypotension** — even a single hypotensive episode causes more than 50% mortality; (2) **oxygenate the patient**; (3) **appropriate referral** to a neurosurgical setup. These three combined, we can save many lives."*

**That IS Kyro's 🟡-principles + 🔴-stabilize-and-transfer layer — in a Peshawar neurosurgeon's own voice. Quote it in the pitch.**

### Implementation lesson (from his Q&A)
He **built the app first without waiting for buy-in**, then demoed the working product; gave **~20 presentations over 2 years** to convince the health ministry/policy board; *"innovation can come from any LMIC; we are best equipped to solve our own problems."* "**Zero budgeting**" — runs on doctors' existing phones, government spends "not a penny." (Validates Kyro's near-zero-cost, existing-Android approach.)

---

# PART B — The Peshawar Recommendations (verbatim cornerstone)
*Comprehensive Policy Recommendations for Head & Spine Injury Care in LMICs* — **in your repo** (`Park & Khan 2019`), extracted directly. Co-led by **Kee B. Park (Harvard PGSSC)** + **Tariq Khan (Peshawar)**; finalized at **ICRAN 2019, Peshawar** (advisors incl. Servadei, Rubiano, Maas, Hutchinson, Rosseau, Nishtar). Structure = **5 care components (Surveillance · Prevention · Pre-hospital · Surgical system · Rehabilitation) × 6 NSOAP domains (Infrastructure · Workforce · Service delivery · Financing · Information · Governance).**

**Verbatim, load-bearing recommendations (pulled from the PDF):**
- **"Task-sharing of surgical workforce is preferred over task-shifting"** — with "structured training curriculum with oversight by a neurosurgeon, competency-based evaluation… defined scope of practice, referral networks, maintenance of certification."
- Rationale that *names EDH*: *"having a necessary operation via TS/S may be superior to no care, and TS/S may offer acute stabilization of emergencies, **particularly for the diagnosis of an epidural hematoma.**"* — **it literally singles out Kyro's exact target.**
- TS trainee should *"have obtained a degree in medicine and [be] currently in or [have] completed a surgical training program"* = **the GMO**. Requires **local supervision** + *"tele-consultation and physical transfer of patients when necessary."*
- **"Leverage telemedicine as a tool for increasing coverage… to bridge the physical distance and knowledge gaps between neuro-trained specialists and other health care providers."**
- **"Innovate for low-resource settings"** · **"Partner with family for delivery of non-technical physical therapy"** (rehab) · **"Prevent hypotension and maintain [oxygenation]"** (pre-hospital).
- **Golden window:** *"Time from injury to neurotrauma facility should not exceed 4 hours"*; *"surgery within the first four hours of injury had a 30% mortality rate, as compared with 90% in those who had surgery after 4 hours"*; once anisocoria appears, *"surgery should be performed as soon as possible."*
- **Targets:** **1 neurosurgeon per 200,000**; **80% of population within 4 hours** of a neurotrauma center; CT + critical-care unit in all neurotrauma facilities.
- **Information:** open-source/mobile platforms, **DHIS2/Epi-Info**, **WHO IRTEC**, trauma registries with GCS/pupils.

**The 2024 sequel — WFNS Peshawar Declaration** (Tariq Khan, Kee Park; 1st WFNS Global Neurosurgery Conference, Peshawar, Feb 2024): national champions, **task-sharing models**, young-neurosurgeon governance, CREVICE-protocol sessions. 🔴 Thieme paywall — verify verbatim clauses before quoting. [DOI 10.1055/a-2713-5650]

---

# PART C — Peshawar's neurosurgical capacity (the apex the case feeds into)
| Center | Capacity | Catchment | Source |
|---|---|---|---|
| **Lady Reading Hospital (LRH)** | 1,790+ beds; ED **3,000–4,000/day**; "**largest trauma center of KP**"; **1,252 EDH cases in 6 yrs** | All KP + ex-FATA + **Afghanistan** | 🟢 [LRH](https://www.lrh.edu.pk/neurosurgery.html) · [PFEDH series PMC9843008](https://pmc.ncbi.nlm.nih.gov/articles/PMC9843008/) |
| **Hayatabad Medical Complex (HMC)** | **21 neurosurgery + 11 head-injury-unit beds** (for that whole catchment) | KP | 🟢 [HMC](https://www.hmckp.gov.pk/Department_Detail/14/1/0/1) |
| **Khyber Teaching Hospital (KTH)** | 1,600 beds, 100-bed casualty, neurosurgery | NW Pakistan + NE Afghanistan | 🟡 [KTH](https://en.wikipedia.org/wiki/Khyber_Teaching_Hospital) |

**The funnel (Dr. Nawaz's slide):** 15 nominal tertiary centers → narrow to **3 in the provincial capital** → choked, refer to each other → patients suffer in between. **Workforce:** ~**40 neurosurgeons in all of KP**, essentially all in Peshawar; national density **0.14/100k** (WFNS target 1/200k). Rural KP/Gilgit-Baltistan districts have **none**.

---

# PART D — The KP TBI casemix & the documented care gap
- **Road trauma dominates:** RTA **62.6%** of head injury, **<1% wore safety equipment**, M:F 3.3:1, peak 21–30 yr ([Turkish Neurosurgery 2014](https://pubmed.ncbi.nlm.nih.gov/24535786/)).
- **KP's distinctive *second* burden — blast & firearm:** 154 bomb-blast head injuries, **11.7% mortality** (LRH series, RMJ 2012); 46 firearm head injuries, **91% homicide, 15% mortality** ([Pak J Neurol Surg](https://www.pakjns.org/index.php/pjns/article/view/127)); blast SCI patients most often originate from **Swat** (KMUJ). → **Kyro must recognize penetrating/blast injury as out of EDH-burr-hole scope → stabilize + antibiotics + AED + transfer.**
- **Pediatric skew:** 643 pediatric TBI across KTH+HMC; EDH is **60.6% pediatric** in the LRH posterior-fossa series → Kyro must handle PGCS/peds adaptation or defer.
- **⭐ The gap, in Pakistan's own multicenter data (Pak-NEDS, 7 hospitals incl. LRH):** **only 39.5% of TBI patients got a CT, GCS was documented in just 9%, and a consultant saw only 1%.** *"Two-thirds earn <$2/day."* ([BMC Emerg Med 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4682387/)). **This is the empirical backbone for an offline, no-CT, non-specialist decision aid.**
- **Prehospital reality (LRH trauma registry):** head injuries 28% of trauma; **~58% of trauma patients died before reaching hospital**; near-zero helmet/seatbelt use ([Ann Med Surg 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8654792/)).

---

# PART E — EDH outcomes & the golden window — *validated in Pakistani data*
These let Kyro ground its urgency and observe-vs-operate logic in *their own* literature:
| Finding | Source |
|---|---|
| **EDH surgery within 1–6 h → ~0% mortality/disability; 6–12 h → ~11.8% mortality** | 🟢 JAMC Abbottabad ([jamc.ayubmed.edu.pk](https://jamc.ayubmed.edu.pk/index.php/jamc/article/view/12780)) |
| **EDH <30 mL without deficit → conservative = surgical (zero mortality both arms)** — *Pakistani RCT* defining the observe-vs-operate threshold | 🟢 PJNS RCT ([pakjns.org/543](https://www.pakjns.org/index.php/pjns/article/view/543)) |
| LRH (Peshawar) EDH outcome tied to **GCS + time-to-surgery**; delay >24 h worsens prognosis | 🟢 [PMC9843008](https://pmc.ncbi.nlm.nih.gov/articles/PMC9843008/) |
| HMC EDH: **88% GOS 4–5** when evacuated in time | 🟢 [PJNS](https://www.pakjns.org/index.php/pjns/article/download/524/525) |
| Single-burr-hole EDH in children: **mRS 0 in ~84.6%** | 🟢 [PJNS](https://pakjns.org/index.php/pjns/article/view/588) |
| PINS Lahore emergency audit: **EDH = single largest trauma subtype (110/562)** | 🟢 [PMC12049195](https://pmc.ncbi.nlm.nih.gov/articles/PMC12049195/) |

**→ Kyro's "operate <4 h / observe if <30 mL & no deficit / STOP-and-transfer when uncertain" logic is concordant with published Pakistani neurosurgical practice.**

---

# PART F — The KP health system & referral pathway
- **Three tiers:** BHU/RHC (primary) → THQ/DHQ (secondary) → tertiary (Peshawar). KP: **931 BHUs, 145 RHCs, 269 secondary, 8 tertiary**.
- **The capability gradient (Razzak 2013, [PMC4314510](https://pmc.ncbi.nlm.nih.gov/articles/PMC4314510/)):** rural BHU ≈ **1 physician/2 beds, 63% lack equipment** → district hospital ≈ 13 physicians but **only 44% even have an ER** → Peshawar teaching hospital ≈ 48 physicians, full kit. *This is why a rural patient must climb the tiers — and why the GMO is alone at the bottom.*
- **⭐ Financing nuance (important reframe):** KP reached **near-universal coverage via Sehat Card Plus** (~Rs 1M / ~$6,000 per family/yr, cashless inpatient incl. surgery, by national ID) ([PMC9223125](https://pmc.ncbi.nlm.nih.gov/articles/PMC9223125/)). → In KP specifically, the binding constraint is **distance, workforce, and time — not the surgical bill.** (Recasts the case's "$8 transfer is a hardship" as primarily a *transport/logistics* problem in KP.)
- **Non-specialist surgery is already happening "without discrete regulation and monitoring"** at KP district hospitals ([WHO-EMRO EMHJ 2025](https://www.emro.who.int/emhj-volume-31-2025/volume-31-issue-6/assessment-of-surgical-services-and-needs-in-rural-district-and-subdistrict-hospitals-in-pakistan.html)) — **exactly Kyro's gap.**
- **Rescue 1122** (statutory KP ambulance service, uneven rural reach); transfer delay independently raises in-hospital mortality.
- **Context:** 40% of KP in multidimensional poverty; hosts 58%+ of Pakistan's Afghan refugees; 2018 FATA merger added remote ex-tribal districts.

---

# PART G — The people & policy (credibility anchors + expert-network seed)
| Figure | Why they matter | Source |
|---|---|---|
| **Prof. M. Tariq Khan** | Co-author Peshawar Recommendations + Declaration; **Dean of Neurosurgery, CPSP**; Chairman, Northwest School of Medicine Peshawar; ex-WFNS Neurotrauma Committee chair | [G4 Alliance](https://theg4alliance.org/our-team/tariq-khan-hashim/) |
| **Dr. Kee B. Park** | Harvard PGSSC, Director Global Neurosurgery Initiative; co-author | [HMS](https://ghsm.hms.harvard.edu/faculty-staff/kee-b-park) |
| **Dr. Mumtaz Ali** | Prof. of Neurosurgery, LRH Peshawar; ex-President PANS; first surgeon to treat Malala | [PANS](https://pans.org.pk/faculty/national-faculty/ali-mumtaz/) |
| **Dr. Mohammad Nawaz Khan** | LRH consultant; the lecturer; built the KP digital referral system | (repo transcript) |
| **PANS / Pakistan Society of Neurosurgeons; CPSP/FCPS** | National endorsing bodies + the 5-yr neurosurgery training standard | [paksn.org](https://www.paksn.org/) · [CPSP](https://www.cpsp.edu.pk/fcps) |

**⭐ Verbatim Tariq-Khan-co-authored line** (Surgical Neurology Int 2022, [PMC9062973](https://pmc.ncbi.nlm.nih.gov/articles/PMC9062973/)): *"LMIC should rely on a broader group of surgeons, adequately trained by local neurosurgeons, to perform lifesaving procedures, such as **emergency burr holes and decompressive craniectomy** … LMIC should leverage … **telemedicine consultation** to optimize patients' care."* — **near-perfect endorsement of the case scenario, by a Peshawar neurosurgeon.**

---

## 🎯 Strategic synthesis — making Kyro effective in Pakistan
1. **Their #1 problem is referral/continuity** (Dr. Nawaz) — which *broadens* Kyro's "continuity not knowledge" thesis. Position Kyro as the **operative-moment complement** to referral tools (his app), not a competitor; his "second-opinion chat" idea overlaps Kyro's escalation.
2. **Lead with Dr. Nawaz's own protocol** — *"avoid hypotension + oxygenate + appropriate referral"* — as the resource-limited TBI spine, in a Peshawar surgeon's voice.
3. **Encode the Pakistani-validated thresholds** — operate <4 h (30% vs 90%), observe if EDH <30 mL & no deficit, GCS+pupils+time as the triage variables. All from their literature.
4. **EDH is the highest-yield target** — 31% of LRH surgical casemix; the largest trauma subtype at PINS; the Peshawar Recommendations name it explicitly.
5. **Offline-first is empirically justified for Pakistan** — the Pakistan telemedicine review found rural telehealth only worked when **asynchronous/offline-sync**; LMIC clinicians **reject black-box tools** (npj Digital Medicine) → validates cited-GraphRAG over opaque weights.
6. **Frame as task-*sharing* (supervised), not task-*shifting*** — the field consensus *and* the Peshawar Recommendations say so explicitly.
7. **Handle the KP-specific blast/firearm burden** — recognize penetrating injury → defer (stabilize + antibiotics + AED + transfer).
8. **Use the Sehat Card reframe** — in KP the barrier is distance/time, not the surgical bill; Kyro's value is **averting the deadly multi-hospital transfer odyssey**, not the cost.

## ✅ Verification flags
- The **Peshawar Recommendations verbatim quotes in Part B were extracted directly from the repo PDF** — verified. The 2019 *World Neurosurgery* summary (PMID 31810143) and the 2024 *Declaration* (Thieme) are paywalled — cite via the repo PDF / abstracts.
- A few stats (JPMI/JAMC download PDFs) came from search snippets — confirm exact figures against clean full text before the pitch.
- **Dr. Mohammad Nawaz Khan (LRH lecturer) ≠ Prof. Tariq Khan (Recommendations author)** — keep distinct.
