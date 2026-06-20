# 02 — Evidence Base (the 12 TBI resources)

All 12 PDFs are in `../TBI Resources/`. Each was read in full and distilled below. Think of them as four layers that stack into our pitch's argument: **how big the problem is → why the system fails → what's happening inside HM's skull → what we could do about it.**

> ⚠️ A correction worth knowing: the two "Park" files are **not** duplicates. `Park & Khan 2019` is the actual Peshawar guideline; the file labeled `Park 2019` is a *different* 2026 WHA78 commentary arguing TBI is chronic + should be notifiable.

---

## Layer 1 — The scale (epidemiology: "HM is a statistic, not a freak accident")

### Wang 2025 — Global Burden of TBI/SCI/Skull Fracture *(use these as our freshest numbers)*
Global Burden of Disease analysis, 204 countries, 1990–2021 (Frontiers in Public Health, Aug 2025).
- **Falls = cause #1, road crashes = #2** (HM's rollover = textbook #2). Highest burden in **men 15–39** (HM is 31). **South Asia incl. Pakistan: ~4.15M new TBIs/yr, +64.8% since 1990** — among the fastest-rising.
- 2021: TBI 37.93M prevalent, ~20.84M new/yr. Per-person incidence is *down 25%* since 1990 → prevention works where applied, fails where HM lives.
- Quotables: India <1 neurosurgeon/100,000; **60% of rural trauma centers lack CT scanners**; delayed care worsens outcomes.

### Fact Sheet — TBI Global Burden
- ~69M sustain a TBI yearly; **LMIC death rates 3–4× higher** than rich countries; pooled LMIC mortality 16.7% (31 LMICs, 59,000+ patients). Mostly young men in road crashes; it's a *lifelong* condition (seizures, depression). → HM's survival is statistically *exceptional*.

### Hyder 2007 — Global Perspective *(foundational, but dated)*
- Coined the **"silent epidemic"** and the **"double hazard"**: LMICs have *more* injuries AND *weaker* systems. Cites Pakistan directly; only **2% of disabled people in LMICs can access rehab**. ⚠️ Data is 1990s–2006 — use for *framing/concepts*, cite Wang 2025 for live numbers.

### Ackah 2021 — Pediatric TBI in Sub-Saharan Africa
- Meta-analysis, 40,685 children. Killer finding: the same childhood head injury kills **1% in well-resourced South Africa vs 18% in West Africa — an 18× gap driven by the system, not the wound.** ⚠️ Pediatric/Africa — cite for the "system decides who dies" thesis, not adult specifics.

> **Layer 1 takeaway for the pitch:** *HM's survival was luck; his disability was the system.* An EDH is survivable — death/disability come from delay, no imaging, no surgeon, no rehab. Reframes the story from "tragedy" to "fixable system failure."

---

## Layer 2 — Why the system fails (capacity, outcomes, policy)

### Clark 2022 — Global Neurotrauma Outcomes Study *(the landmark — and a gift)*
Biggest-ever global study of emergency brain surgery: 1,635 patients, 159 hospitals, 57 countries (Lancet Neurology).
- Brain bleeds need surgery within **4 hours**; real-world median wait was **13 hours**. Death odds ~2.8× higher in poorer countries; only **3% of patients ever reached rehab**; 45% arrived by private vehicle (no ambulance).
- **The gift:** it *explicitly admits* it under-counts rural patients and **could not capture "task-shifting to general surgeons" or "exploratory burr holes"** — literally HM's story. We'd be building in the blind spot of the landmark study.

### Fact Sheet — LMIC Neurosurgical Capacity *(Pakistan ammunition)*
- **20× surgeon gap** (rich vs poor); 29 countries have zero. **Pakistan: ~1 neurosurgeon per 714,000 people, 44% clustered in Karachi + Lahore**; ~38 rehab consultants for 230M+ people. Crucially: *electronic records + protocols cut deaths even without more surgeons* → supports a **systems/software** solution, not "we need more surgeons."

### Global Coalition for TBI 2026 — TBI on the Global Health Agenda
- Advocacy to make TBI a **WHO-recognized chronic, notifiable disease**. **89% of TBIs are in LMICs**; up to **60–80% of survivors get no rehab**; projected >US$1.1T cost to LMICs (2015–2030). Gives the policy scaffolding (WHO IGAP → a 2027 World Health Assembly resolution).

---

## Layer 3 — The clinical science (what's physically happening to HM)

### Khellaf 2019 — Recent Advances in TBI *(our medical primer)*
Clinical review (Journal of Neurology). Explains the **one mechanism**:
- **Primary injury** (the impact) vs the deadlier, *preventable* **secondary injury** (hours of rising pressure choking off blood flow). Skull = closed box → clot raises **intracranial pressure (ICP)** → past ~20–25 mmHg the brain is squeezed → **herniation** = lethal.
- Sobering: decades of *drugs* (steroids, progesterone) largely failed; what saves lives is cheap and mechanical — releasing pressure fast — plus **tranexamic acid (TXA)**, a cheap WHO-essential drug that slows bleeding.
- → HM's **lucid interval = textbook secondary injury**; the burr-hole was crude decompression — the right principle, improvised.

---

## Layer 4 — What we could build (the solution space)

### Zarmer 2025 — Advances in TBI Diagnosis & Treatment *(the "diagnose without a CT" goldmine)*
Narrative review (J Clin Med 2025).
- Standout: **GFAP + UCH-L1 blood biomarkers** — proteins that leak from injured brain cells, detectable in a **finger-prick blood test**. ALERT-TBI trial: ~98–100% sensitivity; **can flag injury even when CT looks normal.** Turns "guess by pupils" into an objective test.
- Also: **NIRS** (light sensor for brain oxygen, no drilling), **portable transcranial Doppler ultrasound**, **machine-learning triage from 3–4 inputs** (phone-runnable). Invasive ICU monitors = NOT low-resource.

### Overview — LMIC Neurosurgical Innovations *(THE menu / our prior-art & competitor map)*
Catalog of already-deployed frugal tools:
- **Infrascanner** (handheld bleed detector; 88.9% sensitivity), **smartphone ultrasound** (5-hour training), **Hyperfine portable MRI** (already used in Pakistan), **Indonesia national task-sharing program** (VR → 3D-printed skull → tele-proctored surgery), **3D-printed skulls (~$145)** for burr-hole practice, **AI "Virtual Operative Assistant,"** **tele-neurosurgery** (avoids up to 44% of transfers), **mHealth rehab apps**.
- ⚠️ Critical design constraint: **high-speed surgical drills had a 100% breakage rate** in the field — durability/power-independence isn't optional.
- **Most of these assume connectivity (tele-proctoring) — that's the gap we'd exploit with an offline tool.**

### Peshawar Recommendations (Park & Khan 2019) *(our home-turf rulebook)*
Consensus guideline **written in Peshawar, Pakistan**, by the WFNS neurotrauma chair.
- **Explicitly endorses a supervised non-specialist evacuating an epidural hematoma** — exactly what HM's GMO did. Quantifies the golden hours: **~30% mortality if drained <4h vs ~90% after; best within 70 minutes of a blown pupil.**
- Prefers **task-SHARING** (non-specialist under a neurosurgeon's remote oversight) over **task-SHIFTING** (no oversight). Pre-endorses telemedicine, AI decision support, frugal kits (e.g. **$35 shunt vs $650, equal outcomes**), and family-delivered rehab.
- → Lets us say our solution is **established Pakistani consensus, not improvisation.** Huge for credibility.

---

## The three "well-armed" solution lanes

Reading across all 12, the pain points cluster into three lanes that each already have *both* a problem-proof and a partial existing tool in these papers:

| Lane | Strongest backing | The gap left open for us |
|---|---|---|
| **Diagnose without a CT** | Zarmer (biomarkers), Innovations (Infrascanner/ultrasound), Peshawar | A durable, offline, low-literacy point-of-care decision tool |
| **Guide a non-surgeon through the burr-hole** ← our lead | Peshawar (blesses it), Clark (admits it's invisible), Innovations (task-sharing programs) | Real-time guidance that **survives a dropped phone call** |
| **Rehab / chronic care with no professionals** | Global Coalition + fact sheets (60–80% gap), Innovations (mHealth/CHW) | Family-as-therapist training that works offline |

**The recurring villain across every layer:** unreliable connectivity and power. Telemedicine "works" in all these papers — but HM's actual teleconsult *dropped twice.* Whatever we pick, **"works when the network and grid don't" is the differentiator the existing tools keep missing.**
