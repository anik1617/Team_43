# 13 — LMIC Context & the Western-vs-LMIC Divide (the foundation layer)

**Why this layer exists:** the entire reason Kyro is needed is that *how care is delivered in the West does not transfer to a low- or middle-income country (LMIC).* Western medicine assumes reliable power, a CT scanner, a specialist one phone call away, an ambulance, and insurance. In HM's rural Gilgit-Baltistan, **none of those hold.** This doc grounds the team in that divide — who LMICs are, how their systems/infrastructure/economics/culture actually work, and *how things are done differently* — so every design and pitch choice is defensible to a global-health-literate MD panel.

Consolidates an 8-agent harvest (~250 verified sources). Flags: 🟢 open/gov/CC · 🟡 free-but-copyrighted · 🔴 paywalled (abstract free). **Every section foregrounds the LMIC-vs-Western contrast + the Kyro implication.**

---

## ⭐ The divide at a glance (the centerpiece)
| Dimension | Western / high-income default | LMIC reality (esp. rural Gilgit-Baltistan) | Kyro's response |
|---|---|---|---|
| **Electricity** | ~100% access, <1 hr/yr outage | LIC avg **43% access**; GB **off-grid, 18–22 hr/day load-shedding**; towers run only when power does | Battery/solar, power-independent — never assume mains |
| **Connectivity** | 93% online; reliable broadband | LIC **27% online**, rural low-income **~16%**; Pakistan = **lowest mobile-internet penetration in South Asia** (52% usage gap); GB valleys 2G/none | Offline-first; the dropped call is the design premise |
| **Imaging** | CT on demand | ~60% of rural trauma centers lack CT; GB districts have none | Clinical (no-CT) diagnosis: GCS-P, pupils, frugal adjuncts |
| **The surgeon** | Neurosurgeon minutes away | Pakistan **0.14 neurosurgeons/100k**, 44% in Karachi+Lahore; **9 countries have zero** | Deliver a validated protocol to the GMO who's actually there |
| **Transfer** | Ambulance + redundant roads | GB: **no reliable ambulance**, one road (KKH) closes for days; trauma center 200 km | Operate-locally-when-safe; "STOP & transfer" when not |
| **Who pays** | Insurance pools risk | **~83% out-of-pocket in Pakistan**; an $8 transfer is a hardship; 1B+ face catastrophic spending | Near-zero patient cost; institution/philanthropy-funded |
| **The patient/family** | Individual autonomy, clinic-first | **Family/collective decisions**; traditional/spiritual healers first; "wait and see" | Family-mediated, low-literacy, explanatory-model-aware |
| **Imported tech** | Maintained, supported | **70–90% of donated equipment fails in 5 yrs**; "pilotitis" | Kyro is *data/software*, maintenance-free, locally-owned |
| **Guidelines** | HIC gold standard | Most TBI evidence is HIC-derived; doesn't fit the resources on hand | Resource-stratified paths (Rubiano/BOOTStraP/Peshawar) |

---

# PART A — Who LMICs are (definitions, classification, demographics)

### A1 · World Bank income classification (the canonical definition)
| Source | URL | Lic | Note |
|---|---|---|---|
| **WB Country & Lending Groups (FY26)** | https://datahelpdesk.worldbank.org/knowledgebase/articles/906519 | 🟢 | The canonical thresholds (Atlas method, 2024 GNI): **Low ≤$1,135 · Lower-middle $1,136–4,495 · Upper-middle $4,496–13,935 · High >$13,935.** |
| Understanding country income, FY26 (WB blog) | https://blogs.worldbank.org/en/opendata/understanding-country-income--world-bank-group-income-classifica | 🟢 | Thresholds adjusted yearly by SDR deflator; **Namibia dropped UMIC→LMIC in 2025**; confirms Pakistan moved from "South Asia" to the MENA grouping (income band unchanged). |
| How the WB classifies countries (Our World in Data) | https://ourworldindata.org/world-bank-income-groups-explained | 🟢 (CC-BY) | Plain-language explainer; the "high-income" line (~$13.9k) sits *far* below typical Western GNI/capita (US ~$80k+). |

### A2 · Where Pakistan sits & terminology
| Source | URL | Lic | Note |
|---|---|---|---|
| Pakistan = **Lower-Middle-Income**, GNI/capita ~$1,580 | (WB data, see A1) | 🟢 | ~1/50th of US GNI/capita. **Not** a Least Developed Country. |
| **"Time to stop referring to the 'developing world'"** (WB) | https://blogs.worldbank.org/en/opendata/time-stop-referring-developing-world | 🟢 | WB's own rationale (2016) for dropping "developing/developed." **Terminology guidance:** prefer "lower-middle-income / low-resource setting / name the place" over "developing country" or "Third World" with MD judges. |
| "Global South" should be retired (Carnegie) | https://carnegieendowment.org/posts/2023/08/the-term-global-south-is-surging | 🟡 | "Global South" carries political baggage; use precise framing. |

### A3 · Demographics & headline burden facts
| Source | URL | Lic | Note |
|---|---|---|---|
| Urbanization (Our World in Data) | https://ourworldindata.org/urbanization | 🟢 | LIC/LMIC majority still **rural**; HICs ~80%+ urban — Kyro's rural-first design targets the still-rural LMIC majority. |
| Demographic profile of the global poor (WB) | https://blogs.worldbank.org/en/opendata/the-demographic-profile-of-the-global-poor | 🟢 | The poor are disproportionately **rural (16% vs 5% urban poverty) and young** — exactly HM. |
| Pakistan demographics | https://www.worldometers.info/demographics/pakistan-demographics/ | 🟡 | ~255M (5th-largest); **median age ~22** (vs ~31 global, ~38+ West) → huge young at-risk-for-TBI cohort, few specialists. |
| **~80%+ of neurological deaths/disability occur in LMICs** (GBD) | https://pmc.ncbi.nlm.nih.gov/articles/PMC4115599/ | 🟢 | The single most load-bearing fact: the burden is where the specialists/ICUs/CTs aren't. |
| Neuro burden ~6× higher in LMICs (Frontiers, GBD) | https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2022.952161/full | 🟢 | Epilepsy 14×, cerebrovascular 8× vs high-income regions. |

---

# PART B — Health systems & how they differ from the West

### B1 · The WHO building blocks & the structural gap
| Source | URL | Lic | Note |
|---|---|---|---|
| WHO Health-System Building Blocks (2010) | https://apps.who.int/iris/bitstream/handle/10665/258734/9789241564052-eng.pdf | 🟢 | The 6 blocks (service delivery, workforce, info, products, financing, governance). In HICs all are mature/integrated; in LMICs each is individually fragile. *Position Kyro as strengthening "service delivery + information," not bypassing the system.* |
| NGOs filling the building blocks (scoping review) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11781716/ | 🟢 | LMIC systems lean on NGOs/external actors to fill blocks the state fills in HICs — validates Kyro's curated expert-contributor network as a recognized gap-filling pattern. |

### B2 · Financing — out-of-pocket vs Western insurance
| Source | URL | Lic | Note |
|---|---|---|---|
| **WHO UHC fact sheet** | https://www.who.int/news-room/fact-sheets/detail/universal-health-coverage-(uhc) | 🟢 | **2.1B faced financial hardship from health costs**; among the poorest, 3 of 4; rural hardship ~14% higher. HIC insurance buffers this almost entirely. |
| Financial risk protection from OOP in LMICs (review) | https://pmc.ncbi.nlm.nih.gov/articles/PMC9336110/ | 🟢 | OOP ≈ **40% of health spend in LMICs** vs low single digits in HICs. Why "just transfer" fails financially. |
| Financing surgery in LMICs | https://pmc.ncbi.nlm.nih.gov/articles/PMC12579420/ | 🟢 | LMIC surgery is predominantly OOP-financed — opposite of HIC bundled/insured payment. |

### B3 · Workforce — density, brain drain, task-sharing, the GMO
| Source | URL | Lic | Note |
|---|---|---|---|
| WHO HRH Workforce 2030 | https://www.observatoriorh.org/sites/default/files/webfiles/fulltext/2019/global_strategy_workforce2030_who.pdf | 🟢 | SDG threshold 4.45 doctors/nurses/midwives per 1,000; ~**18M** worker shortfall, concentrated in LMICs. |
| **Global neurosurgery workforce mapping** (J Neurosurg) | https://thejns.org/view/journals/j-neurosurg/141/1/article-p1.xml | 🟡 | Median **0.44 neurosurgeons/100k**; deficit ~**23,300**. Why a non-neurosurgeon is often the only operator. |
| Africa 0.11 vs W-Pacific 1.58/100k; **9 countries zero** | https://cnjournal.biomedcentral.com/articles/10.1186/s41016-025-00419-1 | 🟢 | Stark density gap. |
| **Task-sharing in neurosurgery: ~43% of LMICs already do burr holes** | https://www.researchgate.net/publication/343391433 | 🟡 | Mirrors HM's case — task-sharing is *existing LMIC practice*, expert-in-the-loop, not novel risk. |
| WHO CHW programme guideline | https://apps.who.int/iris/bitstream/handle/10665/275474/9789241550369-eng.pdf | 🟢 | CHWs/Lady Health Workers are a formal LMIC tier; "integrate, don't use as cheap substitute." |

### B4 · Care delivery — the district-hospital tier Kyro targets
| Source | URL | Lic | Note |
|---|---|---|---|
| First referral hospitals in LMICs (open mirror) | https://pmc.ncbi.nlm.nih.gov/articles/PMC11031140/ | 🟢 | The district/"first-referral" hospital is often the nearest acute care, frequently with no on-site physician — **Kyro's deployment tier.** |
| Pakistan service delivery / Lady Health Workers (WHO EMRO) | https://www.emro.who.int/pak/programmes/service-delivery-lady-health-workers.html | 🟢 | Pakistan's 3-tier structure (**BHU → THQ/DHQ → teaching hospital**) + 100,000+ LHWs; weak referral. Maps Kyro onto HM's actual system. |
| Broken referral chains (rural South Africa) | https://pmc.ncbi.nlm.nih.gov/articles/PMC12339770/ | 🟢 | Referrals break on transport/communication — the failure HM experienced. |

### B5 · Supply chains & "Kyro is data, not hardware"
| Source | URL | Lic | Note |
|---|---|---|---|
| Essential-medicine stockouts among CHWs (~49%) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9287964/ | 🟢 | Kyro guidance must **degrade gracefully** when a recommended drug/supply is absent. |
| WHO EML overview / **70–90% donated equipment fails** | https://rethinkpriorities.org/research-area/who-essential-medicines-list/ | 🟡 | The graveyard problem → **Kyro = data/software, not donated hardware** avoids the dominant LMIC failure mode. (See also Part F.) |
| DHIS2 — the de-facto LMIC health-info layer (80+ countries) | https://dhis2.org/health/ | 🟢 | Kyro's signed KB bundles can interoperate rather than reinvent. |

---

# PART C — Infrastructure (the hard data behind "offline-first")

### C1 · Electricity
| Source | URL | Lic | Note |
|---|---|---|---|
| Access to Energy (OWID/WB) | https://ourworldindata.org/energy-access | 🟢 | LICs avg **43% electricity access** vs ~100% in West. |
| IEA SDG7 — **750M with no electricity** | https://www.iea.org/reports/sdg7-data-and-projections/access-to-electricity | 🟢 | Power-independence is a hard requirement. |
| Pakistan outages: 81% of firms hit, avg **17 hr** | https://www.dawn.com/news/1573388 | 🟡 | West SAIDI often <1 hr/yr. |
| **GB: off national grid, 18–22 hr/day load-shedding** | https://www.arabnews.com/node/1854441/amp · https://stratheia.com/energy-crisis-in-gilgit-baltistan/ | 🟡 | In HM's exact region, "charge it overnight" is impossible → device must run on stored/solar power for days. |
| Off-grid solar could power 400M by 2030 (WB) | https://www.worldbank.org/en/news/press-release/2024/10/08/off-grid-solar | 🟢 | Solar-charge compatibility aligns with the real electrification path. |

### C2 · Connectivity
| Source | URL | Lic | Note |
|---|---|---|---|
| **ITU Facts & Figures 2024** — LIC **27%** online vs HIC **93%** | https://www.itu.int/itu-d/reports/statistics/2024/11/10/ff24-internet-use-in-urban-and-rural-areas/ | 🟢 | Rural low-income **~16%** online — Kyro's user is the least-connected intersection. |
| GSMA SOMIC 2024 — 3.1B "usage gap" | https://www.gsma.com/r/wp-content/uploads/2024/10/The-State-of-Mobile-Internet-Connectivity-Report-Key-Findings-2024.pdf | 🟡 | 95% of non-users live in LMICs — even with signal, people aren't online → offline UX essential. |
| **Pakistan = lowest mobile-internet penetration in South Asia** (GSMA) | https://www.gsmaintelligence.com/research/country-overview-pakistan-a-digital-future | 🟡 | 68% own a smartphone but **only 29% use mobile internet** (52% usage gap). |
| **GB: towers run only when power does** | https://www.dawn.com/news/1820893 · https://tribune.com.pk/story/2459447 | 🟡 | A teleconsult/cloud tool fails exactly as the GMO's call did. |

### C3 · Transport & terrain
| Source | URL | Lic | Note |
|---|---|---|---|
| 287M (29%) in SSA live >2 hr from a hospital | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5809715/ | 🟢 | The "golden hour" is unattainable — care must happen where the patient is. |
| Pakistan prehospital: 58% of ambulances carry O₂, paramedic training **3 days** | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3861820 | 🟢 | Prehospital care is minimal — the GMO is on their own. |
| **Karakoram Highway closes for days** (landslides/snow) | https://www.dawn.com/news/2008688 | 🟡 | Even the one road out can become impassable mid-emergency. |

### C4 · Devices & the offline-first precedent
| Source | URL | Lic | Note |
|---|---|---|---|
| **Mobile OS share Pakistan: Android 92.8% / iOS 7%** | https://gs.statcounter.com/os-market-share/mobile/pakistan | 🟢 | Build Android-first/only; target budget specs (cheap Transsion/Samsung/Xiaomi). |
| Cold chain fails in 98% of LMIC facilities | https://pmc.ncbi.nlm.nih.gov/articles/PMC4744085/ | 🟢 | The same power gaps that wreck cold chain wreck any mains-dependent device → power-independence is necessary, not optional. |
| **Simple — offline-first app, 11,400+ facilities, 3M+ patients** | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9843217/ | 🟢 | Precedent that offline-first clinical tools scale across LMICs — de-risks the architecture. |
| Pocket RAG — on-device medical RAG offline (arXiv) | https://arxiv.org/pdf/2602.13229 | 🟢 | Technical precedent for Kyro's offline GraphRAG on a phone. |

---

# PART D — Economics, poverty & financing (why the patient can't pay)

| Source | URL | Lic | Note |
|---|---|---|---|
| WB poverty update — line raised to **$3.00/day** | https://www.worldbank.org/en/news/factsheet/2025/06/05/june-2025-update-to-global-poverty-lines | 🟢 | ~838M in extreme poverty; most of the world's poor are in LMICs. (Cite $3/day current; acknowledge older $2.15.) |
| **Pakistan: ~83% out-of-pocket health spend; gov ~$16/capita** | https://data.worldbank.org/indicator/SH.XPD.OOPC.CH.ZS?locations=PK | 🟢 | OECD OOP averages ~20%. The patient *is* the health system's wallet. |
| Pakistan poverty rose to **25.3%** (2024-25); 44.7% at $4.20 line | https://www.arabnews.com/node/2616387/pakistan | 🟡 | Shocks push people down with no safety net (floods, inflation). |
| **LICs spend ~$17/capita on health vs ~$3,731 HIC** | https://www.worldbank.org/en/topic/health/publication/government-resources-projections-health-financing-report | 🟢 | The public payer is structurally broke → Kyro must be near-zero marginal cost. |
| **ODA fell 23.1% in 2025** (largest on record; US −56.9%) | https://www.oecd.org/en/data/insights/data-explainers/2026/04/a-historic-decline-in-foreign-aid-preliminary-2025-oda-data.html | 🟢 | Don't build on traditional bilateral aid; design for low cost + domestic/foundation funding. |
| WTP for care ~$1–2/month; 5–10% have coverage | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10021733/ | 🟢 | If anyone pays at point of use, the ceiling is ~$1–2 → revenue from institutions/grants, not patients. |
| Gates Foundation shapes global-health priorities | https://pmc.ncbi.nlm.nih.gov/articles/PMC12581034/ | 🟢 | Funders reward measurable, RCT-grade outcomes → informs Kyro's validation strategy. |
| Pakistan health devolved to provinces (18th Amendment, Lancet) | https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(13)60019-7/abstract | 🔴 | No unified national buyer → go-to-market **province-by-province (Gilgit-Baltistan first).** |

> **Business-model takeaway:** patient can't pay (extreme poverty + 83% OOP + $1–2/mo WTP), public payer is broke ($17/capita) and shrinking (ODA −23%), implementation is hard (devolution + leakage). → **Kyro = near-zero marginal cost, institution/philanthropy-funded, province-by-province, transparent/offline (a governance feature).**

---

# PART E — Culture & care-seeking behavior (the "human context" the rubric rewards)

| Source | URL | Lic | Note |
|---|---|---|---|
| Health-seeking behaviour in Pakistan (narrative review) | https://www.academia.edu/27161967/ | 🟡 | "Mushrooming" traditional/spiritual healers → care reached **late**, after other resorts. Kyro must assume late presentation and not shame prior choices. |
| Rural mothers: "magico-religious healing supersedes clinics" | https://pmc.ncbi.nlm.nih.gov/articles/PMC9845559/ | 🟢 | Design for **medical pluralism** — the family consults multiple systems at once. |
| **Family-centred consent vs Western individual autonomy** (Sri Lanka) | https://pmc.ncbi.nlm.nih.gov/articles/PMC6347869/ | 🟢 | South Asian consent is family-dependent → Kyro's consent/explanation flow must support **proxy/family-mediated decisions under time pressure.** |
| Mental illness attributed to **jinn/possession** | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5882841/ | 🟢 | Post-injury seizures (HM's 6-month event) may be read as possession → family education must pre-empt, **collaborate with religious figures, not replace them.** |
| **Epilepsy stigma in Pakistan** (marriage/work) | https://pubmed.ncbi.nlm.nih.gov/9579952/ | 🟢 | The seizure threatens social/marital standing; aftercare messaging must be stigma-aware and **discreet** (concealment drives non-adherence). |
| Kleinman's 8 Questions (explanatory-model tool) | https://thinkculturalhealth.hhs.gov/assets/pdfs/resource-library/arthur-kleinmans-eight-questions.pdf | 🟢 | Operationalize inside Kyro's family-intake to translate "hematoma/concussion" into local terms (esp. where no local word exists). |
| Gendered access: women need male permission to travel; "lady doctor" preference | https://pmc.ncbi.nlm.nih.gov/articles/PMC8508279/ | 🟢 | Escalation may stall pending a man's authorization → bring care *to* the patient (offline, on-device, in-home). |
| **Gilgit-Baltistan eHealth feasibility (BMC Nursing)** | https://pmc.ncbi.nlm.nih.gov/articles/PMC3599541/ | 🟢 | Peer-reviewed precedent that simple/offline digital tools help nurses in **this exact geography.** |
| **AKDN mental-health programme in GB** | https://pamirtimes.net/2025/10/06/82394/ | 🟡 | A real potential **local launch/distribution partner.** |

> ⚠️ Honest flag: no source *literally* proves "no local word for concussion" — that's explanatory-model inference (Kleinman + low-literacy concussion-comms work), not a hard citation. Don't overstate it.

---

# PART F — How medicine/surgery/tech is *done differently* (the heart of the ask)

### F1 · Frugal innovation — durable/portable/maintainable, not just cheap
| Source | URL | Lic | Note |
|---|---|---|---|
| **Frugal innovation in medicine** (Tran & Ravaud, BMC) | https://pmc.ncbi.nlm.nih.gov/articles/PMC4936019/ | 🟢 (CC BY) | The keystone definition: frugal devices are "**not simply low-cost versions**" — they're durable, portable, harsh-environment-capable, easy to maintain. Includes the **Arbutus drill cover** turning a $100 hardware drill into a surgical drill (90% cheaper) — *directly echoes the case's burr-hole.* |
| Reverse innovation — LMIC solutions flow back to HICs | https://pmc.ncbi.nlm.nih.gov/articles/PMC3986825/ | 🟢 | Reframes Kyro as a credible global product, not charity. |
| Embrace warmer — holds 37°C for hours w/o power | https://pmc.ncbi.nlm.nih.gov/articles/PMC4230002/ | 🟢 | The winning trait is **power-independence**, not low price. |

### F2 · Why Western guidelines don't transfer → resource-stratified care
| Source | URL | Lic | Note |
|---|---|---|---|
| **Paradigm Shift: standard-driven → resource-driven neurotrauma** (Rubiano) | https://ruralneuropractice.com/paradigm-shift-from-standard-driven-protocols-to-resource-driven-guidelines-for-neurotrauma-management-in-low-and-middle-income-countries/ | 🟢 | Best framing: "**many interventions validated in HICs are ineffective when implemented in LMICs.**" Ship resource-stratified paths, not one HIC gold standard. |
| **BOOTStraP** — resource-stratified TBI protocol (folding into Peshawar) | https://pmc.ncbi.nlm.nih.gov/articles/PMC13101607/ | 🟢 | The *content model* Kyro's KB should mirror — tiered by what's on hand. |
| 73% of neurosurgical RCTs are HIC-led (for ~90% of burden) | https://pmc.ncbi.nlm.nih.gov/articles/PMC7426187/ | 🟢 | The evidence base itself is mismatched → cite context-appropriate sources. |
| Pragmatic neuromonitoring w/o ICP monitor (Intensive Care Med) | https://link.springer.com/article/10.1007/s00134-026-08455-w | 🔴 | Substitutes for ICU tech — the case's no-ICP-monitor phase. |

### F3 · Improvised surgery, sterilization & anaesthesia
| Source | URL | Lic | Note |
|---|---|---|---|
| Reuse of "single-use" devices (infection-control reality) | https://pubmed.ncbi.nlm.nih.gov/22284382/ | 🟡 | Reuse happens; Kyro should advise **safe reprocessing**, not pretend single-use compliance. |
| Solar-thermal off-grid autoclave (validated, >121°C/30min) | https://www.researchgate.net/publication/230589715 | 🟡 | Power-independent sterilization is feasible/citable. |
| **ESM-Ketamine: safe anaesthesia with no anaesthetist** (193 surgeries) | https://link.springer.com/article/10.1007/s00268-015-3118-1 | 🔴 | Direct precedent for protocolized, task-shifted care to non-specialists. |

### F4 · Why tech pilots fail ("pilotitis," donated-equipment graveyards)
| Source | URL | Lic | Note |
|---|---|---|---|
| **70–90% of donated medical equipment fails in 5 yrs** (ICTworks) | https://www.ictworks.org/medical-equipment-breakdown-crisis/ | 🟢 | The killer "why won't this be another failed device?" rebuttal → Kyro is maintenance-free data, runs on what's there. |
| ICT4D "pilotitis" framework | https://www.ictworks.org/ict4d-pilotitis-causes-remedies-framework/ | 🟢 | Root cause = donor-dependence + no local ownership → bake in sustainability + local ownership (rubric cat 3). |
| Donated devices fail (NAM Perspectives) | https://nam.edu/perspectives/access-to-medical-devices-in-low-income-countries-addressing-sustainability-challenges-in-medical-device-donations/ | 🟢 | High-credibility (National Academy of Medicine) citation. |
| **WHO: Western tech "often inappropriate" for LMIC settings** | https://www.yunbaogao.cn/index/partFile/5/who/2022-04/5_28737.pdf | 🟢 | The authoritative one-sentence statement of the whole thesis — cite directly. |

### F5 · Design principles for LMIC-appropriate tech
| Source | URL | Lic | Note |
|---|---|---|---|
| HCD in public health in LMICs (narrative review) | https://pmc.ncbi.nlm.nih.gov/articles/PMC12352946/ | 🟢 | Justifies Kyro's co-design methodology rigorously. |
| Poor usability + unmet need = top mHealth failure (Kenya) | https://pmc.ncbi.nlm.nih.gov/articles/PMC7792108/ | 🟢 | Design around the GMO's perceived need + field usability, not technical elegance. |

---

# PART G — Pakistan / Gilgit-Baltistan / Namibia deep dive

### G1 · Pakistan health system & neurosurgery capacity
| Source | URL | Lic | Note |
|---|---|---|---|
| Healthcare in Pakistan (PMC) | https://pmc.ncbi.nlm.nih.gov/articles/PMC10332330/ | 🟢 | 3-tier (BHU→THQ/DHQ→teaching); ~5,290 BHUs (many non-functional); **70% rural but only ~30% of health resources rural.** |
| **Neurosurgeon distribution: ~450 total, 0.14/100k, 44% in Karachi+Lahore** | https://ecommons.aku.edu/pakistan_fhs_mc_surg_neurosurg/358 | 🟡 | WFNS minimum is 1/200k. Core "no neurosurgeon nearby" stat. |
| Health spend ~2.9% GDP / ~$37 per capita | https://data.worldbank.org/indicator/SH.XPD.CHEX.GD.ZS?locations=PK | 🟢 | Below WHO's ~$44 floor. |
| ~65% of trauma victims get **no** prehospital care | https://pmc.ncbi.nlm.nih.gov/articles/PMC12699741/ | 🟢 | The prehospital/transport gap the case turns on. |

### G2 · Gilgit-Baltistan specifics (the case setting)
| Source | URL | Lic | Note |
|---|---|---|---|
| **GB Healthcare Challenges** (Pak J Public Health) | https://pjph.org/index.php/pjph/article/download/47/35/ | 🟢 | **Best single GB source:** pop ~1.3M; **5 DHQ + 27 civil + 15 BHU + 2 RHC**; **doctor:pop 1:4,100 (vs 1:1,206 national)**; **MMR 600/100k**; no public psychiatrist except 1 at CMH Gilgit; literacy 43%. Quantifies the case's "no specialist, no rehab, long referral" reality. |
| Gilgit-Baltistan (geography/governance) | https://en.wikipedia.org/wiki/Gilgit-Baltistan | 🟡 | ~73,000 km²; pop ~1.7M; **self-governing but not a constitutional province** (governance limbo); borders Afghanistan/China. |
| Shina/Balti/Wakhi + Urdu lingua franca | https://en.wikipedia.org/wiki/Shina_language | 🟡 | Justifies multilingual/localization (Urdu+English MVP; tiny languages = honest roadmap). |
| **GB adopting "Hayat" digital health app** (AKU) | https://www.aku.edu/news/Pages/News_Details.aspx?nid=NEWS-002591 | 🟡 | GB authorities already accept mobile health tools — de-risks adoption / partner candidate. |

### G3 · Namibia (the beachhead)
| Source | URL | Lic | Note |
|---|---|---|---|
| Namibia overview (World Bank) | https://www.worldbank.org/en/country/namibia/overview | 🟢 | ~3.1M people, 825,000 km², driest/least-dense in SSA; **reclassified UMIC→LMIC in 2025** → same income tier as Pakistan; "distance not density" problem. |
| Health workforce above UHC threshold but maldistributed | https://pmc.ncbi.nlm.nih.gov/articles/PMC9109011/ | 🟢 | The gap is **distribution/specialist depth, not raw nurse counts** — sharpens the beachhead thesis. |
| Windhoek neurosurgery concentrated; rural air-evac to South Africa | https://en.wikipedia.org/wiki/Windhoek_Central_Hospital | 🟡 | Same urban-concentration / long-referral pattern as Pakistan. |

### G4 · Scalability analogs + the procedure precedent
| Source | URL | Lic | Note |
|---|---|---|---|
| Neurosurgery in Nepal (mountainous LMIC analog) | https://pmc.ncbi.nlm.nih.gov/articles/PMC10668070/ | 🟢 | Closest geographic/structural analog to GB — "this scales to Nepal." |
| Africa: 15% of neuro burden, <1% of neurosurgeons | https://pmc.ncbi.nlm.nih.gov/articles/PMC10990298/ | 🟢 | East Africa ~1 neurosurgeon per 9M (vs US 1:62,500). |
| **Tanzania (KCMC) burr-hole EDH/SDH: 75.6% good outcomes** | https://pmc.ncbi.nlm.nih.gov/articles/PMC10714222/ | 🟢 | Real-world proof the exact Kyro procedure works in a low-resource center, often without a neurosurgeon. |

---

# PART H — Equity & ethics (how to do this respectfully — critical for the MD panel)

### H1 · The frameworks to align with
| Source | URL | Lic | Note |
|---|---|---|---|
| SDG 3 / UHC (UN) | https://sdgs.un.org/goals/goal3 | 🟢 | Anchor Kyro to a UN-defined goal, not an outside agenda. |
| **WHO Global Strategy on Digital Health 2020–2027** | https://www.who.int/publications/i/item/9789240116870 | 🟢 | Demands accessible/affordable/scalable/sustainable, "fit for Member States with limited access to digital tech" — almost a spec sheet for offline Kyro. |
| **WHO Ethics & Governance of AI for Health** (6 principles) + LMM guidance | https://www.who.int/publications/i/item/9789240029200 · https://www.who.int/publications/i/item/9789240084759 | 🟢 | **Map Kyro 1:1:** provenance/source-citing = transparency & accountability; "STOP & transfer" = human oversight & safety; on-device data = autonomy/privacy/sovereignty. Highest-leverage move with AI-skeptical MDs. |
| Declaration of Astana (PHC renewal) | https://www.who.int/primary-health/conference-phc/declaration | 🟢 | PHC + task-shifting framing — Kyro *strengthens* primary/emergency care. |

### H2 · The critiques to pre-empt (don't get blindsided)
| Source | URL | Lic | Note |
|---|---|---|---|
| **"Colonialism in the new digital health agenda"** (BMJ GH) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10900325/ | 🟢 | Names *exactly Kyro's category* — digital "transformation" that ignores context/commercializes. Pre-empt: locally-owned, non-extractive, context-validated. |
| Countering helicopter/"parachute" research | https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1004099 | 🟢 | Outside-team risk. Defuse with **named local co-authorship** + benefit-return. |
| CARE Principles for Indigenous Data Governance | https://datascience.codata.org/articles/10.5334/dsj-2020-043 | 🟢 | Reframes "data never leaves the device" as **data sovereignty**, not just security. |
| Ten rules to stop perpetuating helicopter research | https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009277 | 🟢 | An operational checklist — use as Kyro's "how we avoid tech-colonialism" slide. |

### H3 · Sustainability/scale + the equity evidence cornerstone
| Source | URL | Lic | Note |
|---|---|---|---|
| ExpandNet/WHO — "Begin with the end in mind" (scale-up) | https://expandnet.net/wp-content/uploads/2021/06/ninestepsworksheets_6_1_2021.pdf | 🟢 | Design the pilot for scalability + local ownership from day one (rubric cat 3/4). |
| **⭐ Can Non-Neurosurgeons Operate on TBIs? (scoping review)** | https://pmc.ncbi.nlm.nih.gov/articles/PMC12095900/ | 🟢 (CC BY) | **Strongest single evidence fit:** 2,000+ interventions, 13 countries, general surgeons did burr holes/craniotomies w/ remote support, **no significant mortality difference, EDH outperforms SDH** (Kyro's exact target). Lead with this. |
| **Peshawar Recommendations / WFNS Peshawar Declaration** | https://docs.wixstatic.com/ugd/d9a674_1ba60c38a07341a7bbbe8b1e3f0ff507.pdf | 🟢 | Pakistan-authored (Park & Khan); endorses **task-sharing > task-shifting**, supervised non-specialists, "leverage telemedicine." The credibility cornerstone, in the judges' backyard. |

---

## 🎯 Design & pitch implications (the synthesis)
1. **Offline-first / power-independent is forced by the data, not a style choice** — GB is off-grid (18–22 hr blackouts), towers follow power, Pakistan has South Asia's worst mobile-internet penetration. The dropped call is the norm.
2. **Diagnose & decide without CT or a specialist** — 0.14 neurosurgeons/100k, 44% urban-clustered; the GMO is the operator. Clinical (GCS-P/pupils) + frugal adjuncts; "STOP & transfer" when uncertain.
3. **The patient can't pay; the public payer is broke and shrinking** — near-zero marginal cost, institution/philanthropy-funded, province-by-province (GB first).
4. **Kyro is data/software, not hardware** — sidesteps the 70–90% donated-equipment failure mode and "pilotitis." This is a Q&A-winning rebuttal.
5. **Resource-stratified, not HIC-standard** — mirror BOOTStraP/Peshawar; encode the resources-on-hand explicitly.
6. **Human context is a feature** — family-mediated decisions, medical pluralism (jinn/stigma), gendered access, low literacy → family-facing, low-literacy, explanatory-model-aware UX.
7. **Respect/ethics is a credibility moat** — map to WHO's 6 AI-ethics principles; pre-empt "digital colonialism" with named local co-authorship, data sovereignty (CARE), and local ownership. Task-*sharing*, not replacement.

## 📌 LMIC key-facts cheat sheet (the quotable numbers)
- **80%+** of neurological deaths/disability are in LMICs.
- Pakistan: **0.14 neurosurgeons/100k**, 44% in Karachi+Lahore; **~83% out-of-pocket** health spend; ~65% of trauma victims get no prehospital care.
- **Gilgit-Baltistan:** doctor:pop **1:4,100**; **MMR 600/100k**; **18–22 hr/day** load-shedding, off the national grid; literacy 43%.
- **LIC health spend ~$17/capita** vs **~$3,731 HIC**; **ODA −23% in 2025**.
- **70–90% of donated medical equipment fails** within 5 years.
- Tanzania burr-hole EDH/SDH: **75.6% good outcomes**; the non-neurosurgeon TBI review: **no significant mortality difference, EDH > SDH**.

## ✅ Verification flags
- **"Peshawar Recommendations"** exists in two forms: the 2019 Park & Khan **policy-recommendations PDF** (in this repo + above) and the 2024 **WFNS Peshawar *Declaration*** (Thieme, paywalled). Both endorse task-sharing; verify exact wording before quoting the Declaration.
- **$2.15 vs $3.00/day** poverty line — use $3/day (current, June 2025) but note older literature uses $2.15.
- Several cornerstone stats (Lancet Commission 5B, Dewan deficit, neurosurgeon-density papers) are 🔴 paywalled — abstracts/OA mirrors provided; cite via those.
- "No local word for concussion" is inference, not a hard citation — don't overstate.
