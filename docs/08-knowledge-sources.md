# 08 — Knowledge Sources (the data behind Kyro)

The catalog of vetted sources that populate Kyro's knowledge graph. **You cannot build the app without this data** — this doc is the master sourcing list, organized to match the trust-tier architecture in [05-architecture.md](05-architecture.md):

- **Tier 0 — Canonical core.** Guideline-grade, authoritative, *never crowdsourced*. The critical path — **EDH burr-hole evacuation + acute TBI management** — lives here. The on-device model **prefers Tier 0 for every life-or-death step.** This is the only tier the weekend MVP bundle needs.
- **Tier 1 — Enrichment.** Textbooks, atlases, operative-video libraries, expert lectures. Adds depth, edge cases, regional adaptation, and *credibility with the MD panel* — never overrides Tier 0 on the critical path.

> **Scope discipline (from CLAUDE.md):** the MVP critical path is **EDH evacuation by a GMO**. Build Tier 0 *deeply* for that one procedure; treat the broader neurosurgery corpus (Tier 1) as breadth/credibility and post-hackathon roadmap. Don't try to ingest all of neurosurgery for the demo.

> ⚠️ **Licensing caveat (real, name it honestly):** the canonical *guidelines* (BTF, WHO, WFSA, WSES, Peshawar, Primary Trauma Care) are largely free/open or Creative-Commons and safe to distil into the KB with citation. The major *textbooks and atlases* (Youmans, Greenberg, Schmidek, Rhoton) are copyrighted — fine to **reference and learn from** for the hackathon, but a shipping product needs licensed or open-licensed content. The expert-contributor network (Tier 1) is how the real product sources proprietary procedural knowledge legitimately.

---

## TIER 0 — Canonical core (build the MVP bundle from these)

### A. The governing TBI guidelines (the spine)
| Source | What it gives Kyro | Access | Link |
|---|---|---|---|
| **BTF — Guidelines for the Management of Severe TBI, 4th ed.** (Carney et al., *Neurosurgery* 2017) | The master reference: ICP/CPP thresholds, blood-pressure targets, the whole severe-TBI management spine | Free PDF | [braintrauma.org](https://braintrauma.org/coma/guidelines/severe-tbi) · [full PDF](https://globalneuro.org/uploads/files/Guidelines_for_Management_of_Severe_TBI_4th_Edition.pdf) |
| **BTF — Surgical Management of TBI** | The operate-vs-observe decision rules: **EDH >30 cm³ → evacuate regardless of GCS; coma + anisocoria → operate ASAP** | Free | [braintrauma.org/surgical](https://braintrauma.org/coma/guidelines/surgical) |
| **Bullock et al. — Surgical Management of Acute Epidural Hematomas** (the chapter behind the thresholds) | The primary evidence source for every EDH surgical number Kyro cites | Free PDF | [PDF](https://seattleneurosciences.com/wp-content/uploads/2017/10/Surgical-Management-of-Acute-Epidural-Hematomas.pdf) |
| **BTF — 2020 Decompressive Craniectomy update** (RESCUEicp/DECRA-informed) | When decompression is/ isn't indicated for refractory ICP | Free PMC | [PMC7426189](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7426189/) |
| **Emergency Neurological Life Support (ENLS) — TBI Protocol** | Algorithmic first-hour management; herniation/anisocoria triggers | Free PDF | [neurocriticalcare.org](https://www.neurocriticalcare.org/Portals/0/Docs/ENLS/ENLS_V_4_0_Protocol_TBI_FINAL.pdf) |

### B. The LMIC / no-neurosurgeon consensus (this is HM's exact situation — load all of these)
| Source | What it gives Kyro | Access | Link |
|---|---|---|---|
| **⭐ Peshawar Recommendations** (Park & Khan 2019, WFNS) | Home-turf rulebook: **explicitly endorses supervised non-specialist EDH evacuation;** golden window (~30% mortality if drained <4 h vs ~90% after; best <70 min of a blown pupil) | **In repo** | `TBI Resources/Park & Khan 2019 - Peshawar...pdf` |
| **⭐ WSES consensus — Early management of isolated severe TBI in hospitals *without* neurosurgical capabilities** (Servadei, Rubiano et al.) | Literally the "GMO with no neurosurgeon" protocol; the single most on-point Tier-0 source after Peshawar | Free PMC | [PMC9830860](https://pmc.ncbi.nlm.nih.gov/articles/PMC9830860/) |
| **BOOTStraP / TBI management in limited-resource regions** (Rubiano et al.) | Stratified protocol across prehospital→ED→surgery→ICU when imaging/monitoring are absent | Open | [Brain Injury 2021](https://www.tandfonline.com/doi/full/10.1080/02699052.2021.1972149) |
| **Practical pearls for management of cranial injury in the developing world** | Concrete field pearls for exactly this setting | Springer | [link.springer.com](https://link.springer.com/article/10.1007/s10143-024-02822-1) |
| **Managing Severe TBI Across Resource Settings — Latin American Perspectives** | Beachhead-relevant low-resource protocol thinking | PubMed | [PMID 36635495](https://pubmed.ncbi.nlm.nih.gov/36635495/) |

### C. The procedure spine — EDH recognition → burr-hole evacuation (the demo's core content)
| Source | What it gives Kyro | Access | Link |
|---|---|---|---|
| **StatPearls — Epidural Hematoma** | Definitive free concept reference: pathophysiology, lucid interval, CT signs, surgical vs conservative | Free | [NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK518982/) |
| **⭐ Emergency Burr Holes: "How to do it"** | Step-by-step burr hole written for the **non-neurosurgeon** as a temporizing life-saving measure | Free PMC | [PMC3352313](https://pmc.ncbi.nlm.nih.gov/articles/PMC3352313/) |
| **Cranial Burr Holes & Emergency Craniotomy: Indications & Technique** (Military Medicine) | Clear indications + technique from a no-neurosurgeon setting | Free PDF | [Oxford/MilMed PDF](https://academic.oup.com/milmed/article-pdf/171/1/12/21978642/milmed.171.1.12.pdf) |
| **ACEP Now — ED Trephination (Burr Hole) for EDH** | Emergency-physician-level burr hole for epidural hematoma | Free | [acepnow.com](https://www.acepnow.com/article/emergency-department-trephination-burr-hole-for-epidural-hematoma/) |
| **LITFL — ED Burr Holes (Craniostomy) procedure** | Concise procedural walkthrough | Free | [litfl.com](https://litfl.com/procedure-craniostomy-instructions/) |
| **Emergency decompressive burr hole via intraosseous access (resource-limited)** | Frugal/improvised technique (echoes the case's hand-crank Hudson brace) | Free PMC | [PMC9126472](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9126472/) |
| **TeachMeSurgery — Extradural Haematoma** | Tidy textbook-style chapter (craniotomy/burr-hole) | Free | [teachmesurgery.com](https://teachmesurgery.com/neurosurgery/traumatic-injuries/extradural-haematoma/) |
| **Radiopaedia — Extradural Haematoma** | Annotated real CT cases (biconvex, swirl sign, suture limits) for the imaging/recognition node | Free | [radiopaedia.org](https://radiopaedia.org/articles/extradural-haemorrhage) |

### D. Initial assessment, stabilization & secondary-injury prevention (the 🟡 principles layer)
| Source | What it gives Kyro | Access | Link |
|---|---|---|---|
| **⭐ Primary Trauma Care Course Manual** | The GMO's bible: ABCs, c-spine, preventing secondary injury, head-injury chapter — *built for district hospitals* | Free PDF | [primarytraumacare.org](https://www.primarytraumacare.org/wp-content/uploads/2011/09/PTC_ENG.pdf) |
| **WFSA — Management of the Head-Injured Patient** (Anaesthesia Tutorial of the Week) | Non-specialist head-injury management; CC-licensed (KB-friendly) | Free, CC | [resources.wfsahq.org](https://resources.wfsahq.org/atotw/management-of-the-head-injured-patient/) |
| **WFSA — Management of Major Trauma** | Resource-aware trauma + "if no neurosurgeon, lateralizing signs → 3 burr holes / craniectomy" | Free PDF | [WFSA PDF](https://resources.wfsahq.org/wp-content/uploads/uia28-Management-of-major-trauma.pdf) |
| **Head Injury Management Guidelines for General Practitioners** | Written for the non-specialist GMO audience | Free PMC | [PMC3159366](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3159366/) |
| **WHO — Surgical Care at the District Hospital + IMEESC toolkit** | WHO minimum standards for surgery/trauma/anaesthesia at first-referral level; teaching slides included | Free/WHO | [WHO emergency & essential surgical care](https://www.gfmer.ch/mhealth/coursefiles2013/WHO-emergency-essential-surgical-care-Cherian-2013.pdf) |

### E. Perioperative & post-op adjuncts (rounds out the "full acute TBI window" Kyro covers)
| Source | What it gives Kyro | Access | Link |
|---|---|---|---|
| **Ketamine RSI for head injury** (LITFL) | Induction/intubation when the GMO must secure an airway without a neuro-anaesthetist | Free | [litfl.com](https://litfl.com/ketamine-rsi-for-head-injury/) |
| **Post-Traumatic Seizure Prophylaxis CPG** (levetiracetam, 7-day standard) | The seizure-prophylaxis flag node (HM's 6-month seizure) | Free | [McGovern Medical CPG](https://med.uth.edu/surgery/post-traumatic-seizure-prophylaxis-in-patients-with-traumatic-brain-injury-clinical-practice-guideline/) |
| **Updated Review of the Management of and Guidelines for TBI** (2025) | One-stop modern synthesis tying BTF + SIBICC + DC trials together | Free PMC | [PMC12525523](https://pmc.ncbi.nlm.nih.gov/articles/PMC12525523/) |

---

## TIER 1 — Enrichment, depth & credibility (the broader neurosurgery review)

### F. Standard reference textbooks (the field's canon — mostly paywalled)
| Text | Role | Note |
|---|---|---|
| **Youmans & Winn — Neurological Surgery** (8th ed., 4-vol) | The definitive comprehensive reference for the whole specialty | Copyrighted (Elsevier) — reference, don't ingest wholesale |
| **Greenberg — Handbook of Neurosurgery** | The single most-used practical bench reference | Copyrighted (Thieme) |
| **Schmidek & Sweet — Operative Neurosurgical Techniques** | Operative indications/methods/results | Copyrighted |
| **Rhoton — Cranial Anatomy & Surgical Approaches** | Albert L. Rhoton Jr.'s microsurgical anatomy (2,000+ images) — the anatomy gold standard | [Reference](https://www.amazon.com/Rhoton-Cranial-Anatomy-Surgical-Approaches/dp/1975226879) |

### G. Operative atlases & video libraries (open-access — high value, low cost)
| Source | What it gives Kyro | Access | Link |
|---|---|---|---|
| **⭐ The Neurosurgical Atlas** (Aaron Cohen-Gadol) | 510+ chapters, 1,200+ videos, 200+ grand-rounds webinars; *free for LMIC institutions via Research4Life*; "Principles of Cranial Surgery" volumes free to all | Partly free | [neurosurgicalatlas.com](https://www.neurosurgicalatlas.com/) · [YouTube](https://www.youtube.com/@neurosurgicalatlas) |
| **Hernesniemi's 1001 (& more) Microneurosurgical Videos** | 1,100+ HD operative videos; fully **open access** in *Surgical Neurology International* | Open | [SNI videobook](https://surgicalneurologyint.com/surgicalint-articles/the-open-access-video-collection-project-hernesniemis-1001-and-more-microsurgical-videos-of-neurosurgery-a-legacy-for-educational-purposes/) |
| **3D Atlas of Neurological Surgery — open-access list** | Curated index of *free* neurosurgery webinars/videos/databases | Open | [3datlasofneurologicalsurgery.org](https://3datlasofneurologicalsurgery.org/ressources/open-access-webinars-videos-and-databases-for-neurosurgery) |
| **Neurosurgical Focus: Video** (JNS) | Peer-reviewed operative-video journal | Open PMC | [PMC9541782](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9541782/) |

### H. Lecture series, courses & societies (professors + structured teaching)
| Source | What it gives Kyro | Link |
|---|---|---|
| **ACS / BTF — Fundamentals in the Management of TBI** course | The actual course that trains *non-neurosurgical providers* in severe TBI (also a competitor/complement for the business slide) | [facs.org](https://www.facs.org/quality-programs/trauma/education/fundamentals-in-the-management-of-traumatic-brain-injury-course/) |
| **CNS — Online Education** (Virtual Grand Rounds, Visiting Professor) | Weekly expert webinar lectures; free for resident members | [cns.org/onlineed](https://www.cns.org/onlineed) |
| **AANS Neurosurgery — YouTube** | Lectures, surgical demos, interviews with prominent neurosurgeons | search "AANS Neurosurgery" on YouTube |
| **EANS — Past Webinars** & **NREF — Online Courses** | European + research-foundation lecture archives | [nref.org](https://nref.org/education/online-courses-webinars/) |
| **Osmosis / AMBOSS / Sketchy / Medality** | Fast, structured concept teaching on EDH/TBI for the non-specialist | [Osmosis](https://www.osmosis.org/learn/Epidural_and_subdural_hematoma:_Nursing) · [AMBOSS TBI](https://www.amboss.com/us/knowledge/traumatic-brain-injury) |

### I. The task-shifting evidence base (justifies the whole premise + competitor map)
| Source | What it gives Kyro | Link |
|---|---|---|
| **Task-Shifting & Task-Sharing in Neurosurgery: International Survey across LMICs** | Top-3 task-shifted procedures are **burr holes, hematoma craniotomy, EVD**; documents the oversight gap Kyro fills | [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2590139719301000) |
| **Emergency Craniotomy & Burr-Hole Trephination — Cambodia capacity-building** | **General surgeons** trained → acute EDH 93%, acute SDH 89% favorable outcomes — proof-of-concept analog | [PMC9179964](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9179964/) |
| **Burr hole for extra-axial hematomas in a low-resource setting** | Real-world LMIC non-specialist burr-hole outcomes | [PMC10106472](https://pmc.ncbi.nlm.nih.gov/articles/PMC10106472/) |
| **Clark 2022 — Global Neurotrauma Outcomes Study** (Lancet Neurology) | The landmark that *admits it can't capture task-shifting/exploratory burr holes* — Kyro builds in its blind spot | **In repo** + [Lancet](https://www.thelancet.com/article/S1474-4422(22)00037-0/fulltext) |

---

## Named authorities / "professors" to anchor credibility (and seed the expert network)
Citing these people back to an MD panel is the credibility move (doc 04):
- **Aaron Cohen-Gadol** — The Neurosurgical Atlas (operative technique, open education).
- **Juha Hernesniemi** — microneurosurgery; the open 1001-videos legacy.
- **Albert L. Rhoton Jr.** — microsurgical/cranial anatomy gold standard.
- **Franco Servadei & Andrés Rubiano** — global neurotrauma in low-resource settings; WSES "no-neurosurgical-capability" consensus & BOOTStraP. *Ideal Tier-1 contributor archetypes.*
- **Ross Bullock** — author of the acute-EDH surgical guidelines.
- **M. Tariq Khan** — WFNS neurotrauma; Peshawar Recommendations.
- **⭐ Dr. Nawaz** — Head of Neurosurgery, Peshawar — *"Managing TBI in the Resource-Limited Setting"* lecture **already in this repo** (`Case deep dive tbi in a resource limited setting, trancript.txt`). Mine this for quotable, judge-credible, home-turf content.

---

## Validation datasets (category 4)
| Dataset | Use | Access | Link |
|---|---|---|---|
| **MIMIC-IV** (Beth Israel, ~90k ICU stays; TBI cohorts well-studied incl. trajectory analyses) | The **concordance study**: Kyro's guidance vs. real TBI clinical trajectories | Credentialed (CITI training + PhysioNet approval) | [PhysioNet](https://www.physionet.org/about/database/) |
| **CENTER-TBI / Global Neurotrauma Registry** | Roadmap: real LMIC neurotrauma trajectories for post-hackathon validation | Application-based | (registry websites) |

---

## In-repo assets already on hand (don't re-fetch)
- **`TBI Resources/`** — 12 distilled PDFs (see [02-evidence-base.md](02-evidence-base.md)); most KB-relevant: **Peshawar (Park & Khan)**, **Khellaf 2019** (mechanism/secondary injury), **Zarmer 2025** (diagnose-without-CT), **Clark 2022** (task-shifting blind spot), **Overview – LMIC Innovations** (prior-art/competitor map).
- **Dr. Nawaz Peshawar TBI lecture transcript** — primary-source expert content + credibility.
- **`docs/`** — the synthesized briefs that frame all of the above.

---

## Recommended ingestion priority for the weekend MVP bundle
The MVP needs only a **hand-built EDH canonical-core subgraph** (~a few dozen vetted chunks). Build it from these, in order:

1. **EDH procedure spine** → StatPearls EDH + "Emergency Burr Holes: How to do it" + Bullock surgical chapter + BTF Surgical Management (the operate-vs-transfer thresholds).
2. **The no-neurosurgeon decision layer** → Peshawar Recommendations + WSES no-neurosurgical-capability consensus.
3. **The 🟡 stabilize/secondary-injury principles** → Primary Trauma Care manual + ENLS TBI protocol + WFSA head-injury tutorial.
4. **Perioperative flags** → ketamine RSI + seizure prophylaxis CPG.
5. **Validation** → mentor-neurosurgeon sign-off against Peshawar; MIMIC-IV concordance.

Everything in Tier 1 is for the *vision* storyboard and the post-hackathon expert network — not the weekend build.
