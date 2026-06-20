# 12 — Data, Business & Competitive Library (Layer 2, continued)

The non-clinical half of the harvest: **datasets** (for validation/training), **global-surgery / health-systems / digital-health / policy** (problem + business slides), the **competitor & prior-art landscape**, and **named experts / courses / channels** (education + credibility). Companion to [09](09-academic-library.md)–[11](11-context-and-journey-library.md). Flags: 🟢 open/gov/CC · 🟡 free-but-copyrighted · 🔴 paywalled; datasets use 🟢 open · 🟠 free-with-registration/Kaggle · 🔴 credentialed/application.

---

# PART A — Datasets & imaging atlases (validation, grounding, teaching)
*Validation* = benchmark Kyro's decision/refusal logic · *Grounding* = KB anchor material · *Teaching* = annotated images for the demo.

> ⚠️ **EDH is the rarest hemorrhage subtype** (~2.6% of CQ500; a handful of CT-ICH cases). Any EDH-specific validation is small-N → supplement with curated Radiopaedia/Open-i EDH cases + mentor sign-off rather than relying on dataset volume.

### A1 · Head CT / intracranial-hemorrhage imaging datasets
| Dataset | URL | Access | Note |
|---|---|---|---|
| **CQ500** (qure.ai, India) | http://headctstudy.qure.ai/dataset | 🟢 (CC BY-NC-SA + EULA) | 491 scans, 3-radiologist reads; **2.6% EDH**, 10.8% SDH; LMIC-like population. Best openly-downloadable EDH-labeled set. |
| **RSNA 2019 ICH Detection** | https://www.kaggle.com/competitions/rsna-intracranial-hemorrhage-detection · https://registry.opendata.aws/rsna-intracranial-hemorrhage-detection/ | 🟠 (Kaggle) | ~25k exams, 5 subtypes incl. EPH. Largest subtype-labeled corpus to benchmark "is there a bleed / which kind." |
| **CT-ICH** (PhysioNet, Hssayeni) | https://physionet.org/content/ct-ich/1.3.1/ | 🔴 (credentialed + DUA) | 75 TBI-patient CTs w/ segmentation masks + fracture labels; mean age 27.8 (≈ case). Ideal tight segmentation benchmark. |
| **BHX** (bounding boxes over CQ500) | https://physionet.org/content/bhx-brain-bounding-box/1.1/ | 🔴 (credentialed) | Localized boxes for 6 hemorrhage types → EDH teaching overlay. |
| **Seg-CQ500** (Zenodo) | https://data.niaid.nih.gov/resources?id=zenodo_8063220 | 🟢 | Pixel-level masks to illustrate the lemon-shaped EDH. |

### A2 · Critical-care / EHR databases (TBI trajectories — for Gowrish's MIMIC plan)
| Dataset | URL | Access | Note |
|---|---|---|---|
| **MIMIC-IV v3.1** (hosp+icu) | https://physionet.org/content/mimiciv/3.1/ | 🔴 (CITI + DUA) | ICU/hospital EHR for perioperative TBI trajectories. See the MIMIC extraction plan (chat / for Gowrish). |
| **MIMIC-IV-ED** | https://physionet.org/content/mimic-iv-ed/2.2/ | 🔴 | ED triage vitals → validate the triage/transfer-vs-treat decision (pain point #5). |
| **MIMIC-IV-Note** | https://physionet.org/content/mimic-iv-note/2.2/ | 🔴 | Radiology + discharge notes → confirm EDH dx, lucid interval, surgical decisions. |
| **MIMIC-IV-ED demo** (open) | https://physionet.org/content/mimic-iv-ed-demo/2.2/ | 🟢 | 100-patient open subset → build the pipeline before credentialing lands. |
| **eICU-CRD** | https://physionet.org/content/eicu-crd/2.0/ | 🔴 | >200k ICU admissions → perioperative monitoring trajectories without an ICP monitor. |

> **Highest-leverage credential:** one PhysioNet **CITI "Data or Specimens Only"** course + DUA unlocks **CT-ICH, BHX, MIMIC-IV (+ED/+Note), and eICU** at once. Start it now — it takes weeks.

### A3 · Radiology teaching collections (annotated EDH/SDH)
| Collection | URL | Access | Note |
|---|---|---|---|
| **Radiopaedia — EDH cases** | https://radiopaedia.org/articles/extradural-haemorrhage | 🟢 (CC, check per-case) | Radiologist-authored EDH/SDH teaching cases ("lemon vs banana"). The attributable images for the demo. |
| **Open-i** (NLM image search) | https://openi.nlm.nih.gov/ | 🟢 | 3.7M+ images, license-filterable → mine clean EDH/SDH figures + captions. |
| **MIDRC** (imaging commons) | https://www.midrc.org/ | 🟢/🟠 | De-identified multi-modal imaging + the governed-commons pattern that mirrors Kyro's data-bundle model. |

### A4 · TBI trials, registries & cohorts (roadmap validation)
| Resource | URL | Access | Note |
|---|---|---|---|
| **CENTER-TBI** (EU) | https://www.center-tbi.eu/data | 🔴 (study-plan) | Large prospective cohort; the **data dictionary is a free, citable TBI-variable schema**. |
| **TRACK-TBI** (US, via FITBIR) | https://tracktbi.ucsf.edu/researchers | 🔴 | Precision-medicine cohort; pairs with CENTER-TBI for cross-region validity. |
| **FITBIR** (NIH+DoD) | https://fitbir.nih.gov/ | 🔴 | Federated TBI repository + the **Common Data Elements** standard Kyro should align its schema to. |
| **CRASH-2/3 (freeBIRD)** | https://freebird.lshtm.ac.uk | 🟢/🟠 | Openly available TBI RCT data (CRASH-3 = largest isolated-TBI RCT) → evidence-grounding + outcome priors. |
| **Global Neurotrauma Outcomes Study (GNOS-1)** | https://www.nihr.ac.uk/news/largest-ever-study-traumatic-brain-injury-highlights-global-inequality-treatment-and-causes | 🔴 | 159 hospitals/57 countries, HDI-stratified — strongest evidence surgical practice/outcomes differ in low-resource tiers. |

**Hackathon-feasible validation stack:** CQ500 (🟢, EDH+LMIC-like) → CT-ICH (🔴 small/fast once credentialed) → MIMIC-IV-ED demo (🟢, triage logic) → freeBIRD/CRASH-3 (🟢) + GNOS-1 (citation) → Radiopaedia/Open-i (🟢, teaching).

---

# PART B — Global surgery / health systems / digital health / policy
For the problem-framing, business-model, and market slides.

### B1 · Global surgery & bellwether framing
| Source | URL | Lic | Supports |
|---|---|---|---|
| **Lancet Commission on Global Surgery — Global Surgery 2030** | https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(15)60160-X/fulltext | 🟡 | **Problem:** 5 billion lack access; 143M unmet procedures/yr. The headline access gap. |
| Workforce thresholds & projections (2.28M more SAO providers; 20/100k threshold) | https://pubmed.ncbi.nlm.nih.gov/26313089/ | 🟡 | Problem/Market — the workforce deficit Kyro extends. |
| Bellwether procedures for trauma care (Delphi, open) | https://pmc.ncbi.nlm.nih.gov/articles/PMC12927294/ | 🟢 | Problem — EDH evacuation as a neuro-trauma bellwether. |

### B2 · DCP3 essential surgery & cost-effectiveness
| Source | URL | Lic | Supports |
|---|---|---|---|
| **Essential Surgery: key messages from DCP3** | https://pmc.ncbi.nlm.nih.gov/articles/PMC7004823/ | 🟢 | **Business:** 44 essential procedures, 1.5M deaths/yr avertable, **benefit-cost >10:1**; first-level hospital delivers 28/44. Surgery is as cost-effective as vaccines. |
| DCP3 Essential Surgery (full book) | https://www.ncbi.nlm.nih.gov/books/NBK333500/ | 🟢 | Primary evidence base. |

### B3 · Digital health / mHealth / CDS in LMICs (incl. pitfalls)
| Source | URL | Lic | Supports |
|---|---|---|---|
| **WHO — Recommendations on Digital Interventions for Health System Strengthening (2019)** | https://www.who.int/publications/i/item/WHO-RHR-19.8 | 🟢 (CC) | **Innovation/Business:** positions Kyro inside a WHO-sanctioned category (incl. health-worker decision support). |
| **WHO — Classification of digital interventions (2nd ed., 2023)** | https://www.who.int/publications/i/item/9789240081949 | 🟢 (CC) | Lets Kyro be named precisely as a "health-worker decision-support" DHI. |
| mHealth CHW apps in LMICs (scoping review): **25/30 offline-first** | https://www.sciencedirect.com/science/article/abs/pii/S1386505626002716 | 🔴 | Market — offline-first is the norm + the interoperability gap to address. |
| mHealth CDS for maternal care, SSA: only 4/36 RCTs | https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0319510 | 🟢 | **Validation:** honest evidence-gap framing — pre-empts the skeptical-MD "where's the proof?" |
| Barriers to digital health in LMICs (connectivity/power/literacy) | https://link.springer.com/article/10.1186/s12982-026-01875-5 | 🟢 | Problem/Market — itemizes exactly the constraints that justify offline-first. |
| Responsible/equitable AI in healthcare framework (Lancet Digital Health) | https://www.thelancet.com/journals/landig/article/PIIS2589-7500(25)00139-6/fulltext | 🟡 | Innovation — shows the team understands AI-bias risk (for the skeptical panel). |

### B4 · Telemedicine / tele-mentoring & its connectivity limits
| Source | URL | Lic | Supports |
|---|---|---|---|
| **Telemedicine for neurosurgical care in LMICs (review)** | https://pmc.ncbi.nlm.nih.gov/articles/PMC12127588/ | 🟢 | **Competitors/Problem:** documents *why telemedicine fails when the line drops* — the case's exact failure mode. Kyro's sharpest wedge. |
| Surgical tele-mentoring latency (~260 ms HD delays) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10709226/ | 🟢 | Competitors — hard evidence connectivity-dependent mentoring is fragile. |
| InterSurgeon (expert-matching platform) | https://pubmed.ncbi.nlm.nih.gov/35487022/ | 🟡 | Competitors — closest "expert network" incumbent; Kyro's offline KB is complementary. |

### B5 · Task-shifting / workforce policy
| Source | URL | Lic | Supports |
|---|---|---|---|
| Task shifting/sharing in surgical care (review) | https://pmc.ncbi.nlm.nih.gov/articles/PMC12453308/ | 🟢 | Problem/Innovation — the policy foundation for "task-sharing, not replacement." |
| Task-sharing strengthens the SSA surgical workforce (systematic review) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10694093/ | 🟢 | Validation — task-sharing surgery is safe/effective. |
| **WMA Statement on Task Sharing / Task Shifting** | https://www.wma.net/policies-post/wma-resolution-on-task-shifting-from-the-medical-profession/ | 🟢 | **Presentation/credibility:** shows Kyro respects the profession's own guardrails (supervision, not substitution). |

### B6 · TBI economics, financing & funders
| Source | URL | Lic | Supports |
|---|---|---|---|
| GBD 2016 TBI/SCI burden (Lancet Neurol) | https://www.thelancet.com/journals/laneur/article/PIIS1474-4422(18)30415-0/fulltext | 🟡 | Problem — primary, peer-reviewed burden numbers (use over the $400B figure for rigor). |
| **Dewan — global neurosurgery deficit** (>5M unmet cases/yr; ~23,300 more neurosurgeons) | https://thejns.org/view/journals/j-neurosurg/130/4/article-p1055.xml | 🟡 | **Problem/Market:** the neuro-specific access gap that *is* Kyro's market. |
| Catastrophic surgical expenditure in LMICs (~33M/yr) | https://www.sciencedirect.com/science/article/abs/pii/S0022480424001902 | 🔴 | Problem/Business — the financial-catastrophe dimension ("$8 transfer is a hardship"). |
| **WHO IGAP — Intersectoral Global Action Plan on Epilepsy & Neuro Disorders 2022–31** | https://www.who.int/publications/i/item/9789240076624 | 🟢 (CC) | Business/Market — the policy mandate Kyro aligns to for funder/government pitches. |
| NIHR Global Health Research Group on Neurotrauma | https://neurotrauma.world/ | 🟢 | Business/Validation — funder-backed partner + LMIC TBI outcome data. |
| FIENS (international neurosurgery education NGO) | https://fiens.org/ | 🟢 | Business — the verified-expert-contributor network Kyro's KB could partner with. |

> **Verification flags:** the "$400B/yr global TBI cost" is a secondary-source figure — trace to Maas et al. before a slide. WHO (2008) task-shifting guidelines are cited secondhand — pull from WHO IRIS.

---

# PART C — Competitor & prior-art landscape
**No competitor occupies Kyro's quadrant: offline + on-device + active intraoperative guidance + for a non-neurosurgeon.** Every entry notes its connectivity assumption.

### C1 · Tele-proctoring / surgical-guidance platforms (all need connectivity + a remote human)
| Product | URL | Note / how Kyro differs |
|---|---|---|
| **Proximie** | https://www.proximie.com/ | AR telepresence; needs live cloud stream + remote mentor. Kyro = offline, no remote human; the protocol is *on the device*. |
| **Touch Surgery (Medtronic)** | https://www.medtronic.com/en-us/healthcare-professionals/specialties/touch-surgery.html | Cloud AI for laparoscopic/robotic ORs. Kyro = no cloud/robot; a phone for an open burr-hole. |
| **Avail Medsystems** | https://www.avail.io/ | Console telepresence + remote human. Kyro = no console/participant/network. |
| **Olympus MedPresence** | https://medical.olympusamerica.com/articles/live-remote-supervision-neuroendovascular-surgery-enabled-olympus-medpresence%C2%AE | Live remote proctor. Kyro = no supervising human, offline. |

### C2 · AI surgical decision-support / "virtual operative assistant" research
| System | URL | Note |
|---|---|---|
| **Virtual Operative Assistant (VOA)** — NeuroSim/McGill | https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0229596 | **The named precedent:** explainable-AI tutor on a VR neurosurgery simulator. Peer-reviewed, top neuro institute — but lives in a simulator. **Frame Kyro as its field-deployable, task-sharing descendant** that respects the neurosurgeon as author. |
| ICEMS (expertise monitoring) — McGill | https://neurosim.mcgill.ca/the-virtual-operative-assistant-an-explainable-artificial-intelligence-tool-for-simulation-based-training-in-surgery-and-medicine | Simulator benchmark scoring, not field guidance. |
| Intraoperative AI decision-support (review) | https://link.springer.com/article/10.1007/s11684-020-0784-7 | Mostly CV on endoscopic/robotic video; OR-infra-heavy. Kyro = GraphRAG KB, on-device, no CV feed. |

### C3 · Tele-neurosurgery in LMICs (the status quo Kyro displaces)
| Program/Source | URL | Note |
|---|---|---|
| Smartphone telemedical spine-surgery support, East Africa | https://www.liebertpub.com/doi/10.1089/tmj.2022.0250 | Needs a working data link to a remote surgeon — the exact failure mode. Kyro: the phone carries the knowledge, not a fragile link. |
| Tele-neurosurgery review | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11381808/ | All modalities assume connectivity + remote expert. |
| WFNS Training Centers | https://wfns.org/training-centers | In-person boot camps; don't help in an unplanned rural emergency. Kyro = point-of-need. |

### C4 · Offline / on-device clinical apps for LMICs (Kyro's architectural peers)
| App | URL | Note |
|---|---|---|
| **MSF Medical Guidelines** | https://medicalguidelines.msf.org/en | OFFLINE, collects no PHI — closest peer on architecture + privacy. Kyro differs: *active* voice-guided intraop decision + "STOP and transfer," vs a static searchable manual. |
| UpToDate MobileComplete | https://www.wolterskluwer.com/en/solutions/uptodate/about/mobile-apps/uptodate | OFFLINE after download but general, pricey, English. Kyro = narrow EDH depth, voice-first, multilingual, data-bundle updates. |
| Hesperian "Where There Is No Doctor" | https://en.hesperian.org/hhg/HealthWiki | OFFLINE lay/CHW reference. Kyro = specialist surgical-emergency depth + real-time guidance. |
| OASES (offline emergency algorithms, Uganda) | https://clinicaltrials.gov/study/NCT07257705 | OFFLINE tablet CDS — validates the model in exactly Kyro's setting. Kyro = surgical procedural guidance vs medical triage. |

### C5 · Frugal diagnostic devices (complements, not rivals)
| Device | URL | Note |
|---|---|---|
| **Infrascanner** (NIRS bleed detector) | https://infrascanner.com/ | OFFLINE handheld, ~5-min screen. *Complementary:* it detects a bleed; Kyro guides what to do + when to stop. |
| Butterfly iQ (handheld US) | https://www.butterflynetwork.com/ | On-device POCUS; complement on imaging. |
| Hyperfine Swoop (portable MRI) | https://www.hyperfinemri.com/ | Portable but ~630 kg + mains power + a hospital — not rural-feasible. Kyro = phone-scale. |

### C6 · Checklists & on-device OR voice (validates the build)
| Tool | URL | Note |
|---|---|---|
| WHO Surgical Safety Checklist | https://www.ariadnelabs.org/safe-surgery-safe-systems/surgical-safety/who-surgical-safety-checklist/ | The conceptual ancestor of Kyro's structured prompts. Kyro = dynamic, procedure-specific, voice-guided. |
| **Picovoice — on-device OR voice AI** | https://picovoice.ai/blog/real-time-voice-ai-operating-room/ | Runs **entirely on-device, no network, sub-100ms, audio never leaves the device** — direct proof Kyro's offline-voice + privacy claim is buildable today (and a potential speech-layer partner). |
| Medivis SurgicalAR (AR cranial nav) | https://www.medivis.com/press-release/medivis-first-to-receive-fda-clearance-for-augmented-reality-navigation-in-neurosurgery | Needs the patient's own CT to register → useless with no imaging (the case). Kyro = no imaging/headset required. |

**Competitor-slide takeaways:** (1) Kyro's quadrant is empty; tele-proctoring leaders collapse without connectivity + a remote expert — the precise case failure. (2) Architecture is de-risked by peers (MSF/UpToDate/Hesperian/WHO/OASES + Picovoice). (3) Frugal devices are complements ("is there a bleed?" vs "now what, and when must I stop?"). (4) VOA/ICEMS is the honest precedent — peer-reviewed, but simulator-bound.

---

# PART D — Named experts, courses, channels & podcasts (education + credibility)

### D1 · MOOCs & structured courses
| Course | URL | Access | Note |
|---|---|---|---|
| **Understanding TBI MOOC** (Univ. Tasmania) | https://mooc.utas.edu.au/ | 🟢 | The single most on-topic free MOOC: concussion → severe TBI, mgmt & rehab. |
| Medical Neuroscience (Prof. Leonard White, Duke/Coursera) | https://www.coursera.org/learn/medical-neuroscience | 🟡 | Gold-standard clinical neuroanatomy. |
| Neurology Masterclass: Managing Emergencies (Medmastery) | https://www.medmastery.com/courses/neurology-masterclass-managing-emergencies | 🔴 | Closest commercial course to Kyro's "act fast" use case. |

### D2 · Named YouTube lecturers
| Channel | URL | Note |
|---|---|---|
| **Ninja Nerd** | https://www.youtube.com/channel/UC6QYFutt9cluQ3uSM963_KQ | Deep whiteboard neuroanatomy/physiology (EDH/SDH lectures used in doc 09). |
| Armando Hasudungan | https://armandoh.org | Hand-drawn neuroanatomy/pathology. |
| Dr. Najeeb Lectures | https://www.youtube.com/@DrNajeebLectures | Long-form CNS/cranial-nerve lectures. |
| Strong Medicine (Dr. Eric Strong, Stanford) | https://www.youtube.com/channel/UCFq5vPnNRNNNysLrktz4aSw | Hospitalist-level clinical reasoning incl. neuro emergencies. |

### D3 · Neurosurgery grand-rounds & FOAM
| Series | URL | Note |
|---|---|---|
| **Neurosurgical Atlas — Grand Rounds** (Cohen-Gadol) | https://www.neurosurgicalatlas.com/grand-rounds | 230+ webinars, 220+ master neurosurgeons — flagship operative-education library. |
| Seattle Science Foundation (SSFTV) | https://www.youtube.com/channel/UChIIig54yF9aQYvpWGe1DPg | Live surgeries + Neurosurgery Grand Rounds. |
| **EMCrit — IBCC: TBI** | https://emcrit.org/ibcc/tbi/ | Comprehensive TBI chapter (ICP, reversal, herniation) — directly on-point. |
| REBEL EM / First10EM / CoreEM | https://rebelem.com/tag/traumatic-brain-injury/ · https://first10em.com/ | Practical EM teaching incl. EDH + CRASH-3 appraisal. |

### D4 · Podcasts
| Podcast | URL | Note |
|---|---|---|
| Neurocritical Care Society Podcast | https://ncspodcast.libsyn.com/ | Neurocrit research/interviews. |
| EMCrit Podcast | https://emcrit.org/ | ED critical care, trauma & resuscitation incl. TBI. |

### D5 · Named global-neurosurgery / LMIC experts (credibility anchors & expert-network seed)
| Expert | URL | Relevance |
|---|---|---|
| **Dr. M. Tariq Khan** (Peshawar; chaired WFNS Global Neurosurgery Conf. 2024) | https://www.nwgh.pk/highlights-from-the-wfns-global-neurosurgery-conference-2024-in-peshawar-pakistan/ | Central to the **Peshawar Recommendations** — the single most strategically aligned expert for the MD-judge framing. |
| Dr. Kee B. Park (Harvard, global neurosurgery) | https://www.researchgate.net/profile/Kee-Park | Leading task-shifting researcher / WHA advocacy. |
| Dr. Andrés Rubiano (Bogotá, LMIC neurotrauma) | https://www.researchgate.net/profile/Andres-Rubiano-Escobar | Author of BOOTStraP / "resource-driven" paradigm (doc 09/10). |
| Prof. Franco Servadei (Past WFNS President) | https://wfns.org/newsletter/293 | Architect of WFNS global-neurosurgery; WSES no-neurosurgery consensus. |
| WFNS Young Neurosurgeons — Global Neurosurgery webinars | https://youngneurosurg.org/webinars/global-neurosurgery/ | Recorded talks featuring the above — accessible content + contributor-network seed. |

---

## The whole Layer-2 library at a glance (docs 09–12)
| Doc | Covers |
|---|---|
| **09** | Institutions · teaching/lectures/slides · primary literature & guidelines · operative technique · **surgical instruments** |
| **10** | Decision rules & scoring · anesthesia/airway · post-op & complications · special populations · the hard-coded safety rules |
| **11** | Foundational neuroanatomy · prevention/education · prehospital/transport/triage · diagnosis-without-CT · rehabilitation |
| **12** (this) | Datasets · global surgery/health-systems/policy · competitor landscape · experts/courses/podcasts |

**Next (Layer 3 — the apex):** distil the 🟢 ingestible spine (across all four docs) into discrete, source-cited, trust-tiered KG nodes for the EDH critical path → mentor-neurosurgeon sign-off → that signed subgraph is what the offline demo retrieves over.
