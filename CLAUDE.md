# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is **Team 43's** project repo for the **Mission:Brain Global Neurosurgery Hackathon 2026**. It is **not a conventional software codebase** — it is a competition workspace. The deliverable is a **5-minute business pitch** (plus optional MVP/prototype and validation evidence) for a solution that improves traumatic brain injury (TBI) / neurosurgical care for patients in **low- and middle-income countries (LMICs)**, grounded in a specific clinical case.

As of this writing the repo is in the **brainstorming / pre-implementation phase**: it contains only the case materials (`Case Report and Hackathon Challenge/`), a minimal `README.md`, and a Python `.gitignore`. There is no build system, test suite, or application code yet. Do not invent build/lint/test commands — there are none until we choose a stack and scaffold it. The `.gitignore` is the standard GitHub Python template, which signals the anticipated implementation language is **Python**, but nothing is committed to that yet.

## Source-of-truth documents (read these before proposing anything)

All three live in `Case Report and Hackathon Challenge/` (PDFs):

- **`Hackathon Case Report - InstantImpact LastingDisability.pdf`** — the clinical case vignette. Large (~26 MB) because of embedded images; the text is only ~9 pages. To read it, extract text with PyMuPDF rather than the Read tool (which rejects >20 MB):
  ```bash
  python -c "import fitz; d=fitz.open('Case Report and Hackathon Challenge/Hackathon Case Report - InstantImpact LastingDisability.pdf'); print('\n'.join(p.get_text() for p in d))"
  ```
- **`Instructions.pdf`** — scope, what to build, what NOT to do.
- **`Judging Criteria & Rubric.pdf`** — the six scoring categories. Optimize the pitch and any build against these.

A Participant Access Drive with extra resources is linked in `Instructions.pdf`.

## The case in one paragraph (so any solution stays grounded)

**HM**, a 31-year-old subsistence farmer in rural **Gilgit-Baltistan, Pakistan**, has years of unrecognized repetitive head impacts (recreational soccer) plus 3–4 years of behavioral/cognitive decline his family attributes to stress. A road-traffic rollover causes an acute head injury with a textbook **lucid interval → uncal herniation** (blown left pupil, contralateral weakness, GCS dropping 14 → 7). There is **no ambulance, no imaging, no neurosurgeon** nearby — nearest Basic Health Unit is nurse-led with no labs/imaging; nearest GMO 45 km away; nearest trauma center 200 km away. A general medical officer (GMO) with no neurosurgical training performs an **improvised emergency burr-hole** (hand-crank Hudson brace, phone guidance that keeps dropping) and evacuates an epidural hematoma, saving HM's life. HM survives but is left with **permanent cognitive, motor, behavioral, and psychiatric deficits**, **no rehabilitation services** within 200 km, an untrained family caregiver, social stigma, medical debt, and a first seizure six months later.

The journey spans **prevention → prehospital recognition → transport/triage → diagnosis without imaging → surgical task-shifting → perioperative monitoring → postoperative management → rehabilitation → systems/policy**.

## The 11 candidate pain points (from the case)

Pick **one (at most two)** — a narrow, deep solution beats a broad, shallow one.

1. **Prehospital Recognition** — help family/bystanders distinguish a neuro emergency from "he just needs rest."
2. **Prevention & Education** — community TBI/concussion awareness, "invisible symptoms" messaging.
3. **Early Detection of Chronic Mild TBI** — surface cumulative sports brain injury where there's no medical infrastructure.
4. **Diagnosis Without Imaging** — diagnose an epidural hematoma without CT (point-of-care tool / decision aid / portable imaging alternative).
5. **Transport & Triage** — operate locally vs. transfer when there's no imaging and long transfer times.
6. **Surgical Task-Shifting** — train/guide a non-neurosurgeon through a life-saving procedure in real time (training model, sim, or live guidance).
7. **Perioperative Monitoring** — monitor a post-neurosurgical patient with no ICP monitor, CT, or ICU.
8. **"ROR" / Frugal Surgical Technology** — low-cost, power-independent instrument/kit improving emergency surgery safety.
9. **Postoperative Management** — detect complications, prevent infection, manage meds with minimal resources.
10. **Rehabilitation** — deliver cognitive/physical/psychological rehab with no rehab professionals (telehealth, CHWs, family training).
11. **Systems & Policy** — referral networks, data systems, financial protection, advocacy.

(We may also define our own pain point if we can justify it.)

## Hard design constraints (a solution that ignores these loses)

Every idea built or pitched here must survive the case's real-world setting:

- **Unreliable/absent internet** and **intermittent electricity** — cannot depend on reliable high-speed connectivity or continuous power. Offline-first / power-independent is strongly favored. Any cloud/sync dependency must justify how it's met.
- **Minimal trained personnel** — nurse-led units, GMOs, untrained family caregivers; design for non-specialists.
- **Extreme poverty & no safety net** — an $8 transfer is a hardship; no insurance, no social welfare. Cost and financing matter.
- **Geographic & cultural barriers** — mountainous terrain, long distances, stigma, no local concept of "concussion."
- Solutions should be **scalable/adaptable** to other rural settings, other LMICs, or other neurological emergencies, and reflect **human/cultural context**, not just technical feasibility.

## How work here is judged (optimize for this rubric)

5-min pitch + 2-min Q&A. Six categories, 5 points each (30 total):

1. **Problem Identification & Clarity** — focused pain point tied to the case; stakeholders named; complexity understood.
2. **Innovation** — directly addresses the pain point; novel; improves outcomes vs. status quo; feasible; good UX.
3. **Business Model, Market Analysis, Launch Strategy** — sustainable model; competitors & market; launch plan + beachhead.
4. **Validation** — prototype / MVP / experiment; can it scale and impact lives.
5. **Presentation** — clear, on-time, strong Q&A, credible team.
6. **Inspiration** — "how disappointed would you be if this never existed?"

**Implication for anything we build:** prioritize a demonstrable **MVP/prototype** (category 4) and keep it **evidence-informed** (cite TBI/global-surgery/LMIC-health literature). When in doubt, build the smallest thing that makes the pitch's core claim tangible.

## Working conventions for this repo

- **Don't try to solve the whole case.** Scope to the chosen pain point(s).
- Keep large source PDFs in `Case Report and Hackathon Challenge/`; reference them rather than duplicating their content.
- When a stack is chosen, scaffold it conventionally (Python per `.gitignore`) and **update this file** with the real build/run/test commands at that point.
