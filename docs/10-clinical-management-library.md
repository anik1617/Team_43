# 10 — Clinical Management Library (Layer 2, continued)

The "managing the patient" half of the academic harvest — everything around the EDH evacuation that a GMO must do: **score it, anaesthetise it, watch it after, and adapt when the patient isn't a standard adult.** Companion to [09-academic-library.md](09-academic-library.md) (concepts/guidelines/technique/instruments). Same **ingestion-licensing flags**: 🟢 open/gov/CC · 🟡 free-but-copyrighted · 🔴 paywalled.

> These four domains are where Kyro's *decision logic* lives. The decision rules (Part A) and the safety rules surfaced at the end are the most directly encodable into the knowledge graph.

---

# PART A — Decision rules & scoring (the structured decision spine)
Every entry is a **neurosurgeon-authored, externally validated rule** — Kyro just delivers and audits it. That provenance is the credibility upgrade with MD judges. *(The case has no CT, so Themes A2–A3 are the "if you reach imaging / receiving center" branch; A1, A4–A6 are the load-bearing no-CT content.)*

### A1 · Coma / consciousness scores
| Score | Source | URL | Lic | Kyro use |
|---|---|---|---|---|
| **GCS** (original, Teasdale & Jennett 1974) | Lancet | https://pubmed.ncbi.nlm.nih.gov/4136544/ | 🔴 | Core severity input; the 14→7 trend is the "escalate" trigger. |
| **GCS structured approach** (official) | glasgowcomascale.org | https://www.glasgowcomascale.org/what-is-gcs/ | 🟢 | The gold-standard scoring *interaction script* Kyro should mirror so a non-specialist scores reproducibly. |
| GCS reference / pitfalls (StatPearls) | NCBI | https://www.ncbi.nlm.nih.gov/books/NBK513298/ | 🟢 | Teaching/help layer (intubation, periorbital swelling caveats). |
| **GCS-Pupils (GCS-P)** (Brennan/Murray/Teasdale 2018) | J Neurosurg | https://pubmed.ncbi.nlm.nih.gov/29631516/ · calc https://www.glasgowcomascale.org/what-is-gcs-p/ | 🟡/🟢 | **GCS-P = GCS − pupil-reactivity score (0/1/2).** A single severity index that *already folds in the blown pupil* — captures the case's herniation signal with no CT. |
| **FOUR score** (Wijdicks 2005) | Ann Neurol | https://onlinelibrary.wiley.com/doi/10.1002/ana.20611 · summary https://www.sralab.org/rehabilitation-measures/full-outline-unresponsiveness-score | 🔴/🟢 | Backup when intubated/post-op (no verbal score); adds brainstem reflexes + respiration → post-burr-hole monitoring. |

### A2 · Imaging-decision rules (who needs a head CT)
| Rule | Source | URL | Lic | Kyro use |
|---|---|---|---|---|
| **Canadian CT Head Rule** (Stiell 2001) | Lancet | https://pubmed.ncbi.nlm.nih.gov/11356436/ · calc https://www.mdcalc.com/calc/608 | 🔴/🟡 | Highest-quality "neurosurgical-risk" rule → maps to *transfer-priority* flags. |
| **New Orleans Criteria** (Haydel 2000) | NEJM | calc https://www.mdcalc.com/calc/604 | 🔴/🟡 | Highly sensitive for GCS-15; complements CCHR. |
| **NEXUS-II** (Mower 2002) | Ann Emerg Med | https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002313 · calc https://www.mdcalc.com/calc/10423 | 🟢/🟡 | Applies across all ages/severities (no GCS-15 limit). |
| **PECARN** (peds, Kuppermann 2009) | Lancet (open PDF) | https://pecarn.org/studyDatasets/documents/Kuppermann_2009_The-Lancet_000.pdf · calc https://www.mdcalc.com/calc/589 | 🟢/🟡 | Pediatric module (age <2 vs ≥2); high-risk features → *defer/transfer*. |
| **CHIP rule** (Smits 2007) | Ann Intern Med | https://pubmed.ncbi.nlm.nih.gov/17371884/ · calc https://www.mdcalc.com/calc/3952 | 🔴/🟡 | Works without an LOC history (often absent in the field). |
| **NICE NG232** (head injury, 2023) | NICE | https://www.nice.org.uk/guidance/ng232/chapter/recommendations | 🟢 | The umbrella guideline turning the above into a triage pathway (+ anticoagulation flags). |

### A3 · CT classification of TBI (the "if you reach imaging" branch)
| System | Source | URL | Lic | Kyro use |
|---|---|---|---|---|
| **Marshall** (1991) | J Neurosurg | https://thejns.org/view/journals/j-neurosurg/75/Supplement/article-pS14.xml | 🔴 | 6-category structural grade (cisterns, midline shift, mass) → severity label + mortality estimate at a receiving center. |
| **Rotterdam** (Maas 2005) | Neurosurgery | https://pubmed.ncbi.nlm.nih.gov/16331165/ · validation https://pmc.ncbi.nlm.nih.gov/articles/PMC9621726/ | 🔴/🟢 | Better-calibrated additive 6-point score; feeds IMPACT-Extended. |
| **Helsinki** (Raj 2014) | Neurosurgery | https://pubmed.ncbi.nlm.nih.gov/25181434/ | 🔴 | Best discrimination of the three; optional advanced branch. |

### A4 · Prognostic models (outcome prediction)
| Model | Source | URL | Lic | Kyro use |
|---|---|---|---|---|
| **CRASH** (MRC 2008) | BMJ | https://pubmed.ncbi.nlm.nih.gov/18270239/ · calc https://www.crash2.lshtm.ac.uk/Risk%20calculator/index.html | 🟢 | **Has a dedicated LMIC model + needs only bedside inputs (age, GCS, pupils ± CT)** — best-fit prognosis engine for the no-CT setting. Frame as *transfer-urgency*, never withdrawal-of-care. |
| **IMPACT** (Steyerberg 2008) | PLoS Med | https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.0050165 · calc http://www.tbi-impact.org/?p=impact/calc | 🟢 | **Core model needs no imaging** (age+motor+pupils) → GMO-usable; also the >10k dataset behind GCS-P. |
| CRASH vs IMPACT calibration evidence | PMC | https://pmc.ncbi.nlm.nih.gov/articles/PMC10008242/ | 🟢 | Models *overestimate* mortality with modern care → supports Kyro's "defer/transfer when unsure" honesty. |

### A5 · Pupils, herniation & raised-ICP recognition
| Item | Source | URL | Lic | Kyro use |
|---|---|---|---|---|
| **Pupil Reactivity Score** (GCS-P component) | glasgowcomascale.org | https://www.glasgowcomascale.org/what-is-gcs-p/ | 🟢 | Penlight 0/1/2 scoring; the case's blown pupil = PRS 1 → trips the herniation alarm. |
| **GCS-PA charts** (bedside no-CT prognosis from GCS+pupils+age) | J Neurosurg | https://www.glasgowcomascale.org/gcs-pa-charts/ | 🟢 | Graphical mortality/outcome probabilities the GMO can show with no lab/scan. |
| **Uncal herniation** syndrome (StatPearls) | NCBI | https://www.ncbi.nlm.nih.gov/books/NBK537108/ | 🟢 | The exact case triad (↓LOC + ipsilateral blown pupil + contralateral weakness) → Kyro's "STOP, surgical emergency" rule. |
| Raised ICP — clinical signs / Cushing triad (ED review) | PMC | https://pmc.ncbi.nlm.nih.gov/articles/PMC11610721/ | 🟢 | ICP red-flag checklist. |
| **ENLS — Intracranial Hypertension & Herniation protocol** | NCS | https://www.neurocriticalcare.org/Portals/0/Docs/ENLS/ENLS_V_4_0_Protocol_ICP_FINAL.pdf | 🟢 | Stepwise emergent ICP-management action card while transfer/surgery is arranged. |
| Quantitative pupillometry (NPi) | PMC | https://pmc.ncbi.nlm.nih.gov/articles/PMC9139348/ | 🟢 | *Roadmap:* phone-camera pupillometry could make pupil scoring observer-independent. |

### A6 · No-CT triage / transfer decision tools (the load-bearing case content)
| Tool | Source | URL | Lic | Kyro use |
|---|---|---|---|---|
| **WSES — severe TBI in a hospital WITHOUT neurosurgical capability** (Picetti 2023) | World J Emerg Surg | https://pmc.ncbi.nlm.nih.gov/articles/PMC9830860/ | 🟢 | **Single most on-point source:** 25 graded recs for the spoke→hub scenario that mirrors the case. Backbone of the operate-vs-transfer tree. |
| **Can non-neurosurgeons operate on TBI?** (scoping review) | PMC | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12095900/ | 🟢 | Endorses non-neurosurgeon decompression when >2h from a center w/ ICP signs + telehealth — the literature backing for the whole thesis. |
| **CREVICE protocol** — managing severe TBI *without ICP monitoring* (Chesnut) | J Neurotrauma | https://www.liebertpub.com/doi/abs/10.1089/neu.2017.5599 | 🔴 | Exam+imaging decision matrix for no-ICP-monitor — closest published analogue to Kyro's core. |
| Resource-tiered ED TBI management (Malawi GCS+HR triage) | Afr J Emerg Med | https://www.sciencedirect.com/science/article/pii/S2211419X2030046X | 🔴 | Lowest-tier "clinical-clues-only" pathway. |

---

# PART B — Anesthesia, airway & perioperative (the GMO with no anaesthetist)

### B1 · Airway & rapid-sequence intubation in TBI
| Source | URL | Lic | Note |
|---|---|---|---|
| **Ketamine RSI for head injury** (LITFL) | https://litfl.com/ketamine-rsi-for-head-injury/ | 🟡 | Rebuts the "ketamine raises ICP" dogma → haemodynamically stable induction when avoiding hypotension. |
| Intubation of the neurocritical-care patient (LITFL) | https://litfl.com/intubation-of-the-neurocritical-care-patient/ | 🟡 | Neuroprotective RSI: pre-ox, avoid the hypoxia/hypotension "double hit." |
| RSI in TBI adults (review) | https://pmc.ncbi.nlm.nih.gov/articles/PMC6017125/ | 🟢 | Intubation at GCS ≤8 lowers mortality; agent/paralytic choice. |
| **ENLS — Airway, Ventilation & Sedation protocol** | https://www.neurocriticalcare.org/Portals/0/ENLS%205.0/ENLS%205.0%20Protocol%20-%20AVS.pdf | 🟢 | Algorithm for when/how to intubate preserving CBF. |
| Ketamine in emergency RSI (meta-analysis) | https://link.springer.com/article/10.1186/s12873-024-01094-8 | 🟢 | Ketamine doesn't worsen RSI outcomes — evidence backing. |

### B2 · Sedation, analgesia & neuroprotective transfer
| Source | URL | Lic | Note |
|---|---|---|---|
| **ENLS — TBI protocol (v6.0)** | https://www.neurocriticalcare.org/Portals/0/ENLS%205.0/ENLS%206.0/Protocol%20V6_0_Traumatic%20Brain%20Injury.pdf | 🟢 | Core bedside algorithm: hourly neuro exam, pupils, herniation response, transfer triggers. Backbone of Kyro's monitoring/transfer logic. |
| Sedation & analgesia in neurocritical care (NCS chapter) | https://higherlogicdownload.s3.amazonaws.com/NEUROCRITICALCARE/b8b3b384-bfb9-42af-bb55-45973d5054a4/UploadedImages/COVD-19_Resources/Ed.%20products/Practice_of_NCC_Sedation___Analgesia.pdf | 🟢 | Sedation must keep the neuro exam interpretable; agent selection unmonitored. |
| Ketamine maintenance sedation vs propofol/midazolam (haemodynamics) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9477136/ | 🟢 | Supports ketamine sedation when BP is fragile and no vasopressors. |

### B3 · Anaesthesia in resource-limited settings (no trained anaesthetist)
| Source | URL | Lic | Note |
|---|---|---|---|
| **WFSA — Management of the Head-Injured Patient (ATOTW 264)** | https://resources.wfsahq.org/atotw/management-of-the-head-injured-patient/ | 🟡 | **Flagship:** written for anaesthetists in limited-resource settings — airway, ICP, fluids, transfer for exactly this patient. |
| WFSA — Ketamine: recent evidence & uses (ATOTW 381) | https://resources.wfsahq.org/atotw/ketamine-recent-evidence-and-current-uses/ | 🟡 | "Why ketamine is the LMIC anaesthetic": maintains BP/respiration without ventilator/vasopressors; dosing. |
| WFSA — Draw-Over Anaesthesia (Parts 1–2) | https://resources.wfsahq.org/wp-content/uploads/uia1-Draw-over-Anaesthesia-Part-1-Theory.pdf | 🟡 | Anaesthesia with no compressed-gas/pipeline — the LMIC default technique. |
| WFSA — ATOTW index / Virtual Library | https://resources.wfsahq.org/anaesthesia-tutorial-of-the-week/ | 🟡 | The richest curated KB seed for this slice (peer-reviewed, multi-language). *Secure permission/partnership rather than scraping — also a credibility angle.* |
| Anaesthesia & Perioperative Care (DCP3 chapter) | https://www.ncbi.nlm.nih.gov/books/NBK333510/ | 🟢 | Citable overview of safe anaesthesia in low-resource systems. |
| Non-physician anaesthesia providers (systematic review) | https://pmc.ncbi.nlm.nih.gov/articles/PMC12674024/ | 🟢 | Evidence base + safety guardrails for task-shifted anaesthesia. |

### B4 · Hemodynamics, fluids, osmotherapy & TXA
| Source | URL | Lic | Note |
|---|---|---|---|
| **BTF — Prehospital Management of TBI, 3rd ed. (exec summary)** | https://pmc.ncbi.nlm.nih.gov/articles/PMC10627685/ | 🟢 | **Cornerstone:** SBP ~110–149, SpO₂ >90%, avoid hyperventilation — the secondary-injury rules Kyro enforces. |
| HTS vs mannitol in TBI (meta-analysis) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7425012/ | 🟢 | Which osmotherapy when one/both available. |
| Mannitol or HTS — what have we learned (review) | https://pmc.ncbi.nlm.nih.gov/articles/PMC4665128/ | 🟢 | Mannitol's hypotension/diuresis risk vs HTS — matters with no ICU. |
| **TXA for TBI (CRASH-3 mechanistic)** | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7851008/ | 🟢 | Early TXA reduces head-injury death (mild–moderate GCS / reactive pupils) — cheap, shippable. |
| Permissive hypotension contraindicated in head injury | https://pmc.ncbi.nlm.nih.gov/articles/PMC4541210/ | 🟢 | **Key safety rule:** no permissive hypotension with significant head injury. |
| Severe TBI guideline incl. fluid choice (Texas Children's) | https://www.texaschildrens.org/sites/default/files/uploads/documents/outcomes/standards/Severe%20TBI%20Guideline%202023%20FINAL.pdf | 🟢 | Isotonic (0.9% saline) preferred; avoid hypotonic/glucose fluids. |

### B5 · Perioperative monitoring WITHOUT ICU equipment
| Source | URL | Lic | Note |
|---|---|---|---|
| **Lifebox pulse oximetry** (programme + device) | https://www.lifebox.org/our-work/pulse-oximetry/ | 🟢 | The minimum viable monitor; rationale for making SpO₂ Kyro's non-negotiable vital. Battery-backed device for intermittent power. |
| Pulse oximetry in low-resource settings (ERS) | https://publications.ersnet.org/content/breathe/9/2/90 | 🟢 | How to use/interpret oximetry as the only monitor; pitfalls. |
| ETT placement confirmation without capnography (systematic review) | https://pmc.ncbi.nlm.nih.gov/articles/PMC10998048/ | 🟢 | Ranks low-tech confirmation (colorimetric ETCO₂, auscultation, US). |
| Lifebox in Malawi — fewer hypoxic events (validation) | https://associationofanaesthetists-publications.onlinelibrary.wiley.com/doi/abs/10.1111/anae.13838 | 🔴 | LMIC implementation precedent: oximetry + training reduces harm. |

### B6 · WHO-WFSA standards for safe anaesthesia
| Source | URL | Lic | Note |
|---|---|---|---|
| **WHO-WFSA International Standards for a Safe Practice of Anaesthesia** | https://wfsahq.org/our-work/safety-quality/international-standards/ · full text https://link.springer.com/article/10.1007/s12630-018-1111-5 | 🟢 | The standard Kyro aligns to: trained provider present, pulse oximetry, intermittent BP, ETT confirmation, WHO checklist; defines the "Essential Anaesthesia Kit." |

---

# PART C — Postoperative & complications (the post-burr-hole window)

### C1 · Neuro monitoring & detecting re-bleed without repeat CT
| Source | URL | Lic | Note |
|---|---|---|---|
| **ICU care post-craniotomy (EMCrit IBCC)** | https://emcrit.org/ibcc/crani/ | 🟡 | Bedside post-craniotomy checklist: deterioration triage, re-accumulation signs, BP control to prevent rebleed. Excellent low-resource framing. |
| Postoperative neurosurgical monitoring (serial neuro-obs cadence) | https://www.thieme-connect.com/products/ejournals/pdf/10.1055/s-0039-1689055.pdf | 🟡 | Defines the q20min→q30min→hourly GCS/pupils/power schedule Kyro prompts. |
| Postoperative rebleeding warning signs (ICH) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12820470/ | 🟢 | Drop in LOC / new weakness = rebleed; how to differentiate from other decline. |
| Spinal EDH time-to-evacuation & outcome (~29h vs ~66h) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2688151/ | 🟢 | Quantitative hook behind Kyro's **low threshold to re-intervene/transfer on deterioration**. |

### C2 · Surgical-site infection, meningitis, wound care, antibiotics
| Source | URL | Lic | Note |
|---|---|---|---|
| Postcraniotomy SSI risk factors (4-yr) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9615103/ | 🟢 | Emergency/dirty surgery, op >4h, reop = high-risk profile of an improvised burr hole; cefazolin+vancomycin reduces SSI. |
| Postoperative wound-care protocol prevents SSI | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11663463/ | 🟢 | Reproducible wound-care steps → actionable for GMO/nurse/family. |
| Post-neurosurgical meningitis management (review) | https://www.sciencedirect.com/science/article/pii/S1198743X17302732 | 🔴 | CSF-lactate dx + empiric treatment → Kyro meningitis-flag content. |
| Antibiotic prophylaxis >24h does NOT reduce SSI | https://www.sciencedirect.com/science/article/abs/pii/S1878875017308252 | 🔴 | Supports a **short-course prophylaxis** rule. |

### C3 · Post-traumatic seizures & prophylaxis
| Source | URL | Lic | Note |
|---|---|---|---|
| **Seizure prophylaxis in TBI (2023 PMG)** | https://www.surgicalcriticalcare.net/Guidelines/Seizure%20prophylaxis%20in%20TBI%202023.pdf | 🟢 | Clean rule: **7-day early-PTS prophylaxis, no routine late prophylaxis, LEV≈phenytoin.** Core Kyro seizure node. |
| Vanderbilt seizure-prophylaxis PMG (2025) | https://www.vumc.org/trauma-and-scc/sites/default/files/public_files/Seizure%20Prophylaxis%20PMG%20Jan%202025.pdf | 🟢 | Current, dated, with dosing rationale for ward orders. |
| LEV vs phenytoin (CSF levels) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6825487/ | 🟢 | LEV practical first-line (no level monitoring) where phenytoin assays unavailable. |

### C4 · Raised ICP on the ward without a monitor
| Source | URL | Lic | Note |
|---|---|---|---|
| **Elevated ICP (EMCrit IBCC)** | https://emcrit.org/ibcc/icp/ | 🟡 | Stepwise medical ICP management (head-up, sedation, osmotherapy, ventilation, escalation) → Kyro's tiered ward actions. |
| **SIBICC severe-TBI algorithms** (visual) | https://globalneuro.org/EN/resources/sibicc-stbi-algorithm.html | 🟢 | Freely hosted tiered-escalation figures → KB decision-tree scaffolding. |
| Managing an ICP crisis | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11659353/ | 🟢 | Cushing triad/pupils/GCS recognition + emergency escalation. |
| How to manage TBI without invasive monitoring | https://pubmed.ncbi.nlm.nih.gov/35034077/ | 🔴 | Clinical-exam + serial-imaging synthesis for no-monitor settings. |

### C5 · Other complications (Na⁺, hydrocephalus, CSF leak, VTE, nutrition)
| Source | URL | Lic | Note |
|---|---|---|---|
| Hyponatremia in TBI — SIADH vs CSW | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3571543/ | 🟢 | **Volume status distinguishes** euvolemic SIADH (restrict) from hypovolemic CSW (salt+fluid) — the key actionable Na⁺ point. |
| Cerebral salt wasting review | https://sjtrem.biomedcentral.com/articles/10.1186/s13049-015-0180-5 | 🟢 | CSW pathophysiology + hypertonic-saline management. |
| Post-traumatic hydrocephalus (advances) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10652704/ | 🟢 | ~20% incidence (higher post-craniectomy); recognition vs atrophy → late-deterioration flag. |
| CSF leak management (Barrow) | https://www.barrowneuro.org/for-physicians-researchers/education/grand-rounds-publications-media/barrow-quarterly/volume-17-no-4-2001/the-management-of-cranial-and-spinal-csf-leaks/ | 🟡 | Rhinorrhea/otorrhea recognition + meningitis risk → GMO/caregiver red flag. |
| VTE prophylaxis in TBI (systematic review) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4184319/ | 🟢 | Timing of chemoprophylaxis (rebleed vs DVT); mechanical when chemical contraindicated. |
| Early enteral nutrition in TBI (NCBI Bookshelf CPG) | https://www.ncbi.nlm.nih.gov/books/NBK209309/ | 🟢 | Early EN within 24–48h (NG feeding) — low-tech, cuts infection/mortality. |

### C6 · Prognostication & family communication
| Source | URL | Lic | Note |
|---|---|---|---|
| **GOS-E** (Glasgow Outcome Scale–Extended) | https://www.sralab.org/rehabilitation-measures/glasgow-outcome-scale-extended | 🟢 | The outcome scale for prognosis/follow-up; structured 8-level interview. |
| GOS-E recovery trajectories (TRACK-TBI) | https://pubmed.ncbi.nlm.nih.gov/41161723/ | 🔴 | Realistic, honest family-communication messaging grounded in data. |

---

# PART D — Special populations & modifying factors (ADAPT vs DEFER)
*ADAPT* = adjust thresholds/protocol and proceed; *DEFER* = flag, recommend transfer/specialist, refuse to guide unaided.

### D1 · Pediatric TBI & pediatric EDH
| Source | URL | Lic | Implication |
|---|---|---|---|
| **BTF — Pediatric Severe TBI Guidelines, 3rd ed.** | https://braintrauma.org/coma/guidelines/pediatric | 🟢 | Core peds ruleset (CPP ≥40, 3% saline, no prophylactic hypothermia). *ADAPT.* |
| Pediatric severe TBI: updated management (review) | https://pmc.ncbi.nlm.nih.gov/articles/PMC9082122/ | 🟢 | ICP <20, 3% saline preferred, age-varying CPP. *ADAPT/DEFER on surgery.* |
| Pediatric EDH risk factors (systematic review) | https://cnjournal.biomedcentral.com/articles/10.1186/s41016-019-0167-6 | 🟢 | Peds EDH differs (skull/dura elasticity); pupillary asymmetry/low GCS worsen outcome. *ADAPT.* |
| Conservative mgmt of significant peds EDH | https://pubmed.ncbi.nlm.nih.gov/30796557/ | 🟡 | Some stable peds EDH manageable conservatively → *DEFER:* may not need the burr hole. |
| **Modified GCS for infants/children** (Merck table) | https://www.merckmanuals.com/professional/multimedia/table/modified-glasgow-coma-scale-for-infants-and-children | 🟡 | *ADAPT:* switch to PGCS scoring for preverbal children. |

> Peds physiology note: open fontanelle buffers ICP differently (masks, then sudden decompensation). Bias to *DEFER/transfer* when GCS<8 or pupillary asymmetry in a child.

### D2 · Anticoagulant/antiplatelet ICH & reversal
| Source | URL | Lic | Implication |
|---|---|---|---|
| **Neurocritical Care Society/SCCM — Reversal of antithrombotics in ICH** (Frontera 2016) | https://link.springer.com/article/10.1007/s12028-015-0222-x · society https://www.sccm.org/clinical-resources/guidelines/guidelines/guideline-for-reversal-of-antithrombotics-in-intra | 🟡/🟢 | Keystone: warfarin → **4F-PCC + IV vitamin K** (PCC > FFP). *ADAPT if available; DEFER if not.* |
| AHA anticoagulation-reversal toolkit (one-page algorithm) | https://www.heart.org/-/media/files/professional/quality-improvement/hemorrhagic--stroke/hemorrhagic-stroke-toolkit-page/5_18_2021/anticoagulation-reversal-guideline-for-adults-5182021.pdf | 🟢 | "Which agent, which reversal" decision table. |
| DOAC reversal review (idarucizumab/andexanet/PCC fallback) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6057345/ | 🟢 | Most LMIC sites lack specific agents → PCC/supportive + transfer. *DEFER.* |
| **PATCH trial — platelets HARM in antiplatelet ICH** | https://www.sciencedirect.com/science/article/abs/pii/S0140673616303920 · summary https://www.ean.org/research/resources/neurology-updates/detail/patch-study | 🔴/🟢 | **Critical do-no-harm rule: Kyro must NOT recommend platelet transfusion for antiplatelet-associated ICH.** |
| TBI patients on anticoagulant/antiplatelet — institutional policy | https://med.uth.edu/surgery/patients-with-brain-injuries-on-anticoagulant-or-antiplatelet-therapy-policy/ | 🟢 | Directly usable decision-flow template. |

### D3 · Elderly TBI
| Source | URL | Lic | Implication |
|---|---|---|---|
| ICH after ground-level falls in older adults (meta-analysis 2025) | https://www.annemergmed.com/article/S0196-0644(25)00313-0/fulltext | 🔴 | Even minor falls are high-risk → lower the suspicion threshold; earlier *DEFER/transfer.* |
| Antiplatelet > anticoagulant ICH risk after falls | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9712377/ | 🟢 | Elderly + blood thinner + fall = mandatory neuro-surveillance even if well; SDH predominates. |
| Delayed acute SDH in anticoagulated elderly | https://www.researchgate.net/publication/7142326 | 🟡 | **Delayed** SDH hours–days later → schedule prolonged observation/return-precautions, not a single "all clear." |

### D4 · TBI in pregnancy
| Source | URL | Lic | Implication |
|---|---|---|---|
| Severe TBI in pregnancy (review) | https://pmc.ncbi.nlm.nih.gov/articles/PMC6419882/ | 🟢 | Maternal resuscitation IS fetal resuscitation; left-lateral tilt. *ADAPT positioning/resus; DEFER definitive mgmt.* |
| Imaging the pregnant trauma patient | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10855036/ | 🟢 | Don't withhold needed imaging (shield fetus) — removes a dangerous misconception. *ADAPT.* |

### D5 · Coagulopathy of trauma & TXA
| Source | URL | Lic | Implication |
|---|---|---|---|
| TBI-induced coagulopathy (Blood/ASH) | https://ashpublications.org/blood/article/131/18/2001/36726/Coagulopathy-induced-by-traumatic-brain-injury | 🟡 | Brain tissue factor → consumptive coagulopathy/hyperfibrinolysis; worsens hematoma. *ADAPT:* early TXA, avoid hypothermia/acidosis. |
| **CRASH-3 — TXA <3h reduces head-injury death** | https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(19)32233-0/fulltext | 🟡 | **The single most Kyro-recommendable LMIC intervention** (cheap, stable, WHO-EML, time-critical). |
| MSF protocol w/ systematic TXA, low-resource (Haiti) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6798378/ | 🟢 | Real LMIC protocolized TXA — a template for Kyro's setting. |

> Low-resource reversal stack when PCC/antidotes absent: **IV vitamin K (warfarin) + FFP/fresh whole blood + early TXA + keep warm/avoid acidosis.**

### D6 · Penetrating & depressed/open skull fracture (mostly DEFER)
| Source | URL | Lic | Implication |
|---|---|---|---|
| **BTF Penetrating TBI Guidelines (2nd ed., open)** | https://journals.sagepub.com/doi/full/10.1089/neur.2022.0008 | 🟢 | Selective imaging, conservative debridement, antibiotics + antiseizure, dural repair; **don't probe/remove deep fragments or yank protruding objects.** *ADAPT antibiotics/AED; DEFER surgery.* |
| Penetrating brain trauma — case-based review | https://pmc.ncbi.nlm.nih.gov/articles/PMC5507758/ | 🟢 | Stabilize, broad-spectrum antibiotics, AED, don't remove impaled objects pre-op. *DEFER.* |
| Depressed-fracture surgical indications | https://jeccm.amegroups.org/article/view/3849/html | 🟢 | Open depressed fracture > skull thickness → surgery; non-op criteria (<1 cm, no dural breach, no contamination). *ADAPT triage; DEFER operative care.* |

---

## 🔒 Hard-coded safety rules surfaced across this harvest (encode these first)
1. **Intubate at GCS ≤8 / herniation** — and use **ketamine** when avoiding hypotension (the old ICP-contraindication is refuted).
2. **Avoid the "double hit": no hypoxia (SpO₂ >90%), no hypotension (SBP ~110–149).** **Permissive hypotension is contraindicated with head injury.**
3. **Don't hyperventilate** except as a short herniation rescue (target ETCO₂/PaCO₂ ~35).
4. **TXA early (<3h)** — cheap, safe, EML-listed, Kyro-recommendable.
5. **Do NOT give platelets for antiplatelet-associated ICH** (PATCH harm signal).
6. **Switch to PGCS for children;** bias to defer when GCS<8 or pupillary asymmetry.
7. **Elderly + blood thinner + even a minor fall → prolonged observation + warn of delayed SDH.**
8. **Penetrating / depressed-fracture injury is out of burr-hole scope → stabilize + antibiotics + AED + transfer.**
9. **Pulse oximetry is the non-negotiable minimum monitor** (WHO checklist / Lifebox).
10. **Short-course antibiotic prophylaxis only;** **7-day seizure prophylaxis, then stop** (no routine late prophylaxis).

## ✅ Verification flags
- **CREVICE, SIBICC, PATCH, the elderly meta-analysis, and several rule papers are 🔴 paywalled** — open companions exist for each (SIBICC GlobalNeuro figures, PATCH/EAN summary, PMC equivalents); ingest the open version, cite the paywalled primary.
- **MDCalc calculators are 🟡** — encode the *rule logic* from the open primary papers; link MDCalc only as an external reference, don't embed its content.
