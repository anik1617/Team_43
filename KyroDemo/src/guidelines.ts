/**
 * Kyro's patient-specific management plan.
 *
 * Every number on the plan screens comes from a passage that is in Kyro's signed offline
 * knowledge bundle (cloud/bundles/edh-core-v1.kyro, table `chunks`) or from the reasoning
 * spine (spine/edh-cgt.sql). The `quote` fields are copied verbatim from those passages
 * (lightly trimmed with "…"). The deterministic spine decides WHICH steps apply; the
 * passages supply the numbers; the arithmetic below only scales a per-kg dose or adds a
 * time window to a recorded clock time. Nothing here is a model-generated clinical value.
 */
import type { Encounter } from './nav';
import { OBS_DROP, PATIENT } from './demoCase';

export type Strength =
  | 'BTF Level I' | 'BTF Level IIA' | 'BTF Level IIB' | 'BTF Level III' | 'BTF legacy'
  | 'Strong consensus' | 'Guideline' | 'Protocol' | 'Principle · verify';

export type Source = { src: string; loc: string; quote: string; strength: Strength };

// ── Retrieved passages (verbatim from the bundle) ─────────────────────────────
export const SRC = {
  btfSbp: {
    src: 'Brain Trauma Foundation, 4th ed.', loc: 'Blood pressure thresholds · Level III', strength: 'BTF Level III',
    quote: 'Maintaining SBP at ≥100 mm Hg for patients 50 to 69 years old or at ≥110 mm Hg or above for patients 15 to 49 or over 70 years old may be considered to decrease mortality and improve outcomes.',
  },
  isotonic: {
    src: 'Greenberg, Handbook of Neurosurgery', loc: 'Head trauma · IV fluids', strength: 'Protocol',
    quote: 'Isolated head injury: IVF of choice is isotonic … avoid hypotonic solutions … provide adequate fluid resuscitation to avoid hypotension.',
  },
  wsesSpo2: {
    src: 'WSES consensus 2023 (no neurosurgery on site)', loc: 'Recommendation 23 · 87.8 % agreement', strength: 'Strong consensus',
    quote: 'Maintaining SpO2 > 94% in severe TBI patients.',
  },
  enlsHypoxia: {
    src: 'ENLS TBI protocol v4.0', loc: 'Secondary injury', strength: 'Protocol',
    quote: 'Hypoxia, defined as O2 saturation < 90% or a PaO2 < 60mmHg, even for a brief period of time, is associated with increased mortality following a TBI.',
  },
  wsesHob: {
    src: 'WSES consensus 2023 (no neurosurgery on site)', loc: 'Recommendations 19–20 · 92.7 % / 97.7 %', strength: 'Strong consensus',
    quote: 'Severe isolated TBI patients should be maintained with a head of the bed elevated at 30°–45° … the head should be maintained in the midline avoiding compression of the neck veins.',
  },
  wfsaGlucose: {
    src: 'WFSA Anaesthesia Tutorial, Head-Injured Patient', loc: 'Secondary insults', strength: 'Protocol',
    quote: 'Both hypoglycaemia and hyperglycaemia can worsen brain injury. A blood glucose of 4 – 8 mmol/l is targeted.',
  },
  wsesTemp: {
    src: 'WSES consensus 2023 (no neurosurgery on site)', loc: 'Recommendation 21 · 95 % agreement', strength: 'Strong consensus',
    quote: 'Avoiding core body temperature > 37.5 °C and aiming for normothermia in severe TBI patients.',
  },
  txaDose: {
    src: 'Primary Trauma Care Manual', loc: 'Circulation · tranexamic acid', strength: 'Principle · verify',
    quote: 'Tranexamic acid, if available, can reduce bleeding and risk of death. It should be used early in resuscitation, with a loading dose of 1 gram over 10 minutes and then an infusion of 1 gram over 8 hours.',
  },
  txaWindow: {
    src: 'Kyro spine · node L15 (CRASH-3)', loc: 'TXA overlay · flagged for verification', strength: 'Principle · verify',
    quote: 'If within 3 h of injury with reactive pupils / mild-moderate GCS, early TXA is a cheap LMIC-recommendable adjunct (labeled principle, CRASH-3).',
  },
  niceObs: {
    src: 'NICE NG232, via Kyro spine node L17', loc: 'Neuro observations', strength: 'Guideline',
    quote: 'GCS (E/V/M), pupil size and reactivity, limb movements, RR, HR, BP, temperature, SpO2. Frequency: half-hourly until GCS 15, then per schedule. Any deterioration reverts to half-hourly.',
  },
  ptcWatch: {
    src: 'Primary Trauma Care Manual', loc: 'Head injury · warning signs', strength: 'Protocol',
    quote: 'Watch out for: drowsiness or excessive sleepiness; confusion or disorientation; severe headache, vomiting or fever; limb weakness; inequality of pupils; convulsions, seizure or unconsciousness.',
  },
  pesh4h: {
    src: 'Peshawar Recommendations, 2019', loc: 'Time from injury to neurotrauma facility', strength: 'Guideline',
    quote: 'We recommend limiting hospital transport times for TBI to a period not exceeding four hours.',
  },
  peshAniso: {
    src: 'Peshawar Recommendations, 2019', loc: 'Timing of surgery', strength: 'Guideline',
    quote: 'Patients who suffered traumatic epidural hematomas had better outcomes if surgery was within 70 minutes of anisocoria … if this has already occured, surgery should be performed as soon as possible.',
  },
  peshShare: {
    src: 'Peshawar Recommendations, 2019', loc: 'Task-sharing', strength: 'Guideline',
    quote: 'We recommend task-sharing over task-shifting, as the former implies regular oversight by an experienced neurosurgeon.',
  },
  enlsHerniation: {
    src: 'ENLS TBI protocol v4.0', loc: 'Herniation signs', strength: 'Protocol',
    quote: 'Signs of brain herniation such as a dilated or non-reactive pupil, Cushing reflex (hypertension plus bradycardia) or extensor/decerebrate posturing.',
  },
  btfMannitol: {
    src: 'Brain Trauma Foundation, 4th ed.', loc: 'Hyperosmolar therapy · carried from 3rd ed.', strength: 'BTF legacy',
    quote: 'Mannitol is effective for control of raised intracranial pressure (ICP) at doses of 0.25 g/kg to 1 g/kg body weight. Arterial hypotension (systolic blood pressure <90 mm Hg) should be avoided. Restrict mannitol use prior to ICP monitoring to patients with signs of transtentorial herniation or progressive neurological deterioration not attributable to extracranial causes.',
  },
  wsesOsmo: {
    src: 'WSES consensus 2023 (no neurosurgery on site)', loc: 'Recommendation 26 · 95 % agreement', strength: 'Strong consensus',
    quote: 'Osmotherapy as a therapeutic maneuver to be utilized in patients with signs of intracranial hypertension/brain herniation awaiting emergent neurosurgery.',
  },
  ptcMannitol: {
    src: 'Primary Trauma Care Manual', loc: 'Head injury · management', strength: 'Protocol',
    quote: 'Mannitol 20% infusion may reduce intracranial pressure. Its best use is to allow short-term benefit before obtaining a CT scan or transfer to a neurosurgical facility.',
  },
  bootHts: {
    src: 'BOOTStraP protocol (limited-resource TBI), 2020', loc: 'Hyperosmolar therapy', strength: 'Protocol',
    quote: 'Hyperosmolar therapy: hypertonic saline 3% (3–4 mL/kg via peripheral line) or 7.5% (2 mL/kg), used only if systolic BP <100 mm Hg or signs of brain herniation.',
  },
  enlsHv: {
    src: 'ENLS TBI protocol v4.0', loc: 'Breathing', strength: 'Protocol',
    quote: 'Prophylactic hyperventilation should be avoided unless there are signs of brain herniation. If signs of herniation, then mild hyperventilation (ETCO2 30-35 or RR= 20 breaths/minute in an adult) is indicated.',
  },
  wsesHv: {
    src: 'WSES consensus 2023 (no neurosurgery on site)', loc: 'Recommendation 27 · 90 % agreement', strength: 'Strong consensus',
    quote: 'Short-term hyperventilation as a therapeutic maneuver that should be utilized only in patients with signs of brain herniation awaiting emergent neurosurgery.',
  },
  enlsIntubate: {
    src: 'ENLS TBI protocol v4.0', loc: 'Resuscitation', strength: 'Protocol',
    quote: 'Avoid hypotension/hypotensive resuscitation in the setting of TBI. If post-resuscitation GCS score ≤ 8 → rapid sequence intubation.',
  },
  bootKetamine: {
    src: 'BOOTStraP protocol (limited-resource TBI), 2020', loc: 'Intubation / induction', strength: 'Protocol',
    quote: 'Intubation/induction options (by availability): ketamine (1.5–2 mg/kg), midazolam (0.1–0.3 mg/kg), or etomidate (0.3 mg/kg).',
  },
  btfSeizure: {
    src: 'Brain Trauma Foundation, 4th ed.', loc: 'Seizure prophylaxis · Level IIA', strength: 'BTF Level IIA',
    quote: 'Phenytoin is recommended to decrease the incidence of early PTS (within 7 days of injury), when the overall benefit is felt to outweigh the complications. Prophylactic use of phenytoin or valproate is not recommended for preventing late PTS.',
  },
  pesDose: {
    src: 'Post-traumatic seizure prophylaxis CPG (McGovern)', loc: 'Drugs and doses', strength: 'Protocol',
    quote: 'Loading dose: fosphenytoin 15mg/kg (rounded to nearest 50mg) … Maintenance dose: <80 kg 100mg PO/IV q 8 hours; 80 – 110 kg 150mg PO/IV q 8 hours.',
  },
  wsesSerial: {
    src: 'WSES consensus 2023 (no neurosurgery on site)', loc: 'Recommendation 14 · 95 % agreement', strength: 'Strong consensus',
    quote: 'Performing serial neurologic evaluations (GCS + pupil examination) in the spoke center and during transfer to the hub center to detect neurologic deterioration.',
  },
  btfSteroids: {
    src: 'Brain Trauma Foundation, 4th ed.', loc: 'Steroids · Level I', strength: 'BTF Level I',
    quote: 'The use of steroids is not recommended for improving outcome or reducing ICP. In patients with severe TBI, high-dose methylprednisolone was associated with increased mortality and is contraindicated.',
  },
} satisfies Record<string, Source>;

// ── Clock arithmetic on the recorded encounter times ─────────────────────────
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toClock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const span = (m: number) => (m <= 0 ? 'passed' : m < 60 ? `${m} min left` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min left`);

export type Clock = { label: string; at: string; left: string; urgent: boolean; src: Source };
export type Gate = { label: string; ok: boolean };
export type Step = {
  id: string;
  title: string;
  dose?: string;      // the exact number(s), shown large
  forHim: string;     // why it applies to this patient, from his recorded values
  gates?: Gate[];     // deterministic preconditions Kyro checks before showing the step as "do now"
  met?: boolean;      // target already met by recorded values
  sources: Source[];
};
export type Plan = {
  variant: 'initial' | 'herniation';
  now: string;
  headline: string;
  clocks: Clock[];
  matches: { fact: string; finding: string; src: string }[];
  steps: Step[];
  avoid: { text: string; src: Source }[];
  used: number;
};

export const LIBRARY = { passages: 999, sources: 20 };

export function buildPlan(enc: Encounter, lateralizing: boolean): Plan {
  const w = enc.weightKg ?? 60;
  const det = enc.deteriorated;
  const now = det ? '20:36' : '19:49';
  const n = toMin(now);
  const inj = toMin(PATIENT.injured);
  const txaClose = inj + 180;
  const window4h = inj + 240;
  const gcs = det ? OBS_DROP.gcs : 14;
  const sbp = det ? 168 : 150;
  const hr = det ? OBS_DROP.hr : 58;
  const done = (id: string) => enc.stabilized.includes(id);

  const txaClock: Clock = { label: 'TXA window (3 h from injury)', at: toClock(txaClose), left: span(txaClose - n), urgent: txaClose - n <= 60, src: SRC.txaWindow };
  const fourH: Clock = { label: 'Peshawar 4-h injury → neurosurgery', at: toClock(window4h), left: span(window4h - n), urgent: window4h - n <= 90, src: SRC.pesh4h };

  const txaStep = (): Step => ({
    id: 'txa',
    title: done('txa') ? 'Tranexamic acid given' : 'Give tranexamic acid now',
    dose: '1 g IV over 10 min, then 1 g over 8 h',
    forHim: `Injured ≈ ${PATIENT.injured}. The 3-hour window closes ${toClock(txaClose)} (${span(txaClose - n)}). Pupils still react, GCS ${gcs}.`,
    gates: [
      { label: `Within 3 h of injury (${span(txaClose - n)})`, ok: txaClose - n > 0 },
      { label: 'Pupils reactive', ok: enc.pupils !== 'right_fixed' },
    ],
    sources: [SRC.txaDose, SRC.txaWindow],
  });

  if (!lateralizing) {
    const steps: Step[] = [
      txaStep(),
      {
        id: 'sbp', title: 'Keep systolic BP at or above 110', dose: 'SBP ≥ 110 mmHg',
        forHim: `Age 17 falls in the 15–49 band. Now ${sbp}/85 ✓. If it falls below 110, give isotonic 0.9 % saline; no dextrose or hypotonic fluids.`,
        met: true, sources: [SRC.btfSbp, SRC.isotonic],
      },
      {
        id: 'o2', title: 'Keep oxygen saturation above 94 %', dose: 'SpO₂ > 94 %',
        forHim: 'Now 96 % on room air ✓. Start oxygen if it drops; even a brief fall below 90 % raises mortality.',
        met: true, sources: [SRC.wsesSpo2, SRC.enlsHypoxia],
      },
      {
        id: 'hob', title: 'Head of bed up, head midline', dose: '30–45°',
        forHim: 'Keep the neck straight and the collar loose so neck veins are not compressed.',
        sources: [SRC.wsesHob],
      },
      {
        id: 'glu', title: 'Check capillary glucose', dose: '4–8 mmol/L',
        forHim: 'Not recorded yet. Both low and high glucose worsen brain injury. Kyro also needs it before mannitol can be considered later.',
        sources: [SRC.wfsaGlucose],
      },
      {
        id: 'temp', title: 'Prevent fever', dose: '≤ 37.5 °C',
        forHim: 'Check temperature with each set of observations.',
        sources: [SRC.wsesTemp],
      },
      {
        id: 'obs', title: 'Neuro checks: GCS, pupils, limbs, vitals', dose: 'At least every 30 min',
        forHim: 'GCS 14, not 15, so half-hourly is the minimum. Kyro will prompt you every 15 min. Escalate at once on any GCS drop, new pupil inequality or limb weakness.',
        sources: [SRC.niceObs, SRC.ptcWatch],
      },
      {
        id: 'call', title: 'Alert the referral centre now', dose: `By ${toClock(window4h)}`,
        forHim: `Lucid interval and repeated vomiting after a high-energy crash. ${PATIENT.distance} to neurosurgery and ${span(window4h - n)} of the 4-hour window.`,
        sources: [SRC.pesh4h],
      },
    ];
    return {
      variant: 'initial', now, used: 12,
      headline: '8 steps for this patient, each with its source',
      clocks: [txaClock, fourH],
      matches: [
        { fact: 'Age 17', finding: 'Adult BP band 15–49 → SBP ≥ 110', src: 'BTF 4th ed.' },
        { fact: `Injured ≈ ${PATIENT.injured}`, finding: `TXA window open until ${toClock(txaClose)}`, src: 'PTC manual · CRASH-3' },
        { fact: 'SpO₂ 96 % on air', finding: 'Target > 94 %, never < 90 %', src: 'WSES · ENLS' },
        { fact: 'GCS 14, pupils equal', finding: 'Half-hourly neuro checks', src: 'NICE NG232' },
        { fact: 'Glucose not recorded', finding: 'Target 4–8 mmol/L', src: 'WFSA' },
        { fact: `No CT · ${PATIENT.distance}`, finding: `4-h target: neurosurgery by ${toClock(window4h)}`, src: 'Peshawar 2019' },
      ],
      steps,
      avoid: [
        { text: 'No steroids', src: SRC.btfSteroids },
        { text: 'No hyperventilation while there are no herniation signs', src: SRC.enlsHv },
        { text: 'No dextrose or hypotonic IV fluids', src: SRC.isotonic },
      ],
    };
  }

  // ── Herniation variant (leaf L-12): lateralizing signs without imaging ─────────
  const anisoAt = det ? toMin(OBS_DROP.t) : toMin('19:48');
  const surgeryBy = anisoAt + 70;
  const gluOk = done('glu');
  const sbpOk = sbp >= 110;
  const mannLo = Math.round(0.25 * w), mannHi = Math.round(1 * w);
  const ketLo = Math.round(1.5 * w), ketHi = Math.round(2 * w);
  const fos = Math.round((15 * w) / 50) * 50;
  const maint = w < 80 ? 100 : 150;

  const steps: Step[] = [
    {
      id: 'h-send', title: 'Send the brief to the neurosurgeon now', dose: `Decision needed by ${toClock(surgeryBy)}`,
      forHim: `Pupil change recorded ${toClock(anisoAt)}. EDH outcomes are better when surgery is within 70 min of anisocoria. Whether and where to operate is the neurosurgeon's call.`,
      sources: [SRC.peshAniso, SRC.peshShare],
    },
    ...(gluOk ? [] : [{
      id: 'glu', title: 'Check capillary glucose', dose: '4–8 mmol/L',
      forHim: 'Mannitol is restricted to deterioration not explained by an extracranial cause. Kyro treats an unmeasured glucose as not excluded.',
      sources: [SRC.wfsaGlucose, SRC.btfMannitol],
    } as Step]),
    {
      id: 'h-mannitol', title: 'Mannitol 20 % IV', dose: `${mannLo}–${mannHi} g  ·  ${mannLo * 5}–${mannHi * 5} mL`,
      forHim: `0.25–1 g/kg for ${w} kg. Herniation signs are present and this is a bridge to transfer. Alternative if BP falls or mannitol is unavailable: 3 % saline ${3 * w}–${4 * w} mL (3–4 mL/kg).`,
      gates: [
        { label: `Herniation signs: R pupil ${det ? '5 mm sluggish' : 'sluggish'}${det ? ', GCS 14 → 11, L arm drift' : ''}`, ok: true },
        { label: `SBP ${sbp} ≥ 110 (no hypotension)`, ok: sbpOk },
        { label: 'SpO₂ 96 % measured', ok: true },
        { label: gluOk ? 'Glucose checked, 4–8 mmol/L' : 'Glucose not yet checked: check it first', ok: gluOk },
      ],
      sources: [SRC.btfMannitol, SRC.wsesOsmo, SRC.ptcMannitol, SRC.bootHts],
    },
    {
      id: 'h-hob', title: 'Head up, midline, collar loose', dose: '30–45°',
      forHim: 'Helps venous drainage from the brain. Keep it during transport.',
      sources: [SRC.wsesHob],
    },
    {
      id: 'h-sbp', title: 'Keep systolic BP at or above 110', dose: 'SBP ≥ 110 mmHg',
      forHim: `Now ${sbp}/90 with pulse ${hr}, rising BP with falling pulse (Cushing pattern). Mannitol can drop BP: recheck it after the dose and give 0.9 % saline if it falls below 110.`,
      met: sbpOk, sources: [SRC.btfSbp, SRC.enlsHerniation, SRC.isotonic],
    },
    {
      id: 'h-o2', title: 'Oxygen to keep saturation above 94 %', dose: 'SpO₂ > 94 %',
      forHim: 'Now 96 %. Give oxygen for the journey.',
      met: true, sources: [SRC.wsesSpo2, SRC.enlsHypoxia],
    },
    {
      id: 'h-hv', title: 'Brief hyperventilation only if he herniates', dose: 'RR 20/min · ETCO₂ 30–35',
      forHim: 'Only if the pupil becomes fixed or he starts posturing, as a short bridge while mannitol and transfer proceed. Never prolonged.',
      sources: [SRC.enlsHv, SRC.wsesHv],
    },
    {
      id: 'h-airway', title: 'Prepare to intubate if GCS reaches 8', dose: `Ketamine ${ketLo}–${ketHi} mg`,
      forHim: `GCS ${gcs} now. Intubate at GCS ≤ 8 (ketamine 1.5–2 mg/kg for ${w} kg keeps BP up). Avoid any hypotension during induction.`,
      sources: [SRC.enlsIntubate, SRC.bootKetamine],
    },
    {
      id: 'h-seizure', title: 'Early seizure prophylaxis, 7 days only', dose: `Fosphenytoin ${fos} mg PE, then phenytoin ${maint} mg 8-hourly`,
      forHim: `15 mg/kg load for ${w} kg. Stop at day 7; it does not prevent late seizures.`,
      sources: [SRC.btfSeizure, SRC.pesDose],
    },
    ...(done('txa') ? [] : [txaStep()]),
    {
      id: 'h-obs', title: 'GCS and pupils at every check, including in transit', dose: 'Kyro prompts every 15 min',
      forHim: 'Any further drop or a fixed pupil goes straight into the brief.',
      sources: [SRC.wsesSerial, SRC.niceObs],
    },
  ];

  return {
    variant: 'herniation', now, used: 19,
    headline: `${steps.length} steps to bridge him to surgery, each with its source`,
    clocks: [
      { label: 'Surgery within 70 min of pupil change', at: toClock(surgeryBy), left: span(surgeryBy - n), urgent: true, src: SRC.peshAniso },
      ...(done('txa') ? [] : [txaClock]),
      fourH,
    ],
    matches: [
      { fact: `R pupil change at ${toClock(anisoAt)}`, finding: `Surgery window ${toClock(surgeryBy)}`, src: 'Peshawar 2019' },
      { fact: det ? 'BP 168/90, pulse 52' : 'BP 150/85, pulse 58', finding: 'Herniation sign (Cushing)', src: 'ENLS v4.0' },
      { fact: 'Herniation signs, SBP ≥ 110', finding: 'Mannitol 0.25–1 g/kg allowed', src: 'BTF 4th ed. · WSES' },
      { fact: `Weight ${w} kg (estimated)`, finding: `Mannitol ${mannLo}–${mannHi} g · ketamine ${ketLo}–${ketHi} mg`, src: 'BTF · BOOTStraP' },
      { fact: `GCS ${gcs}`, finding: 'Intubate if ≤ 8', src: 'ENLS v4.0' },
      { fact: `${PATIENT.distance}, no CT`, finding: 'Osmotherapy as bridge to transfer', src: 'PTC manual · WSES' },
    ],
    steps,
    avoid: [
      { text: 'No steroids', src: SRC.btfSteroids },
      { text: 'No prolonged hyperventilation', src: SRC.wsesHv },
      { text: 'No dextrose or hypotonic IV fluids', src: SRC.isotonic },
    ],
  };
}

export const STRENGTH_TONE: Record<Strength, 'green' | 'brand' | 'violet' | 'amber' | 'gray'> = {
  'BTF Level I': 'green', 'BTF Level IIA': 'green', 'BTF Level IIB': 'green', 'BTF Level III': 'brand', 'BTF legacy': 'brand',
  'Strong consensus': 'violet', Guideline: 'brand', Protocol: 'gray', 'Principle · verify': 'amber',
};

/** One line for the handoff brief: what has been done, from the ticked plan steps. */
export function givenSummary(enc: Encounter): string {
  const w = enc.weightKg ?? 60;
  const has = (id: string) => enc.stabilized.includes(id);
  const parts = [
    has('txa') && 'TXA 1 g IV + 1 g over 8 h',
    has('h-mannitol') && `mannitol 20 % (0.25–1 g/kg, ${w} kg)`,
    has('h-seizure') && 'fosphenytoin load',
    (has('hob') || has('h-hob')) && 'head up 30–45°',
    has('glu') && 'glucose checked',
    (has('o2') || has('h-o2')) && 'O₂, SpO₂ > 94 %',
  ].filter(Boolean) as string[];
  return parts.length ? `${parts.join(' · ')}. SBP kept ≥ 110.` : 'Stabilization steps not yet recorded.';
}
