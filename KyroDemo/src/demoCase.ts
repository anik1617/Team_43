/**
 * The scripted demo encounter. The patient, clinician, readings and specialist reply are scripted;
 * every guideline quote and number is real and sourced (see src/guidelines.ts).
 * Scenario follows the team's Loom script: a 17-year-old after a motorcycle crash at a
 * district hospital with no CT and no neurosurgeon; GCS 14 falls to 11.
 */

export const PATIENT = {
  id: 'KY-0417',
  label: 'Male, 17',
  mechanism: 'Motorcycle crash, unhelmeted',
  site: 'District Hospital · Emergency bay 2',
  arrived: '19:42',
  /** "about two hours ago" in the 19:45 history, so injury ≈ 17:45 (drives the TXA and 4-h clocks). */
  injured: '17:45',
  distance: '140 km',
};

/** What the clinician says into the phone. Each word is revealed in turn. */
export const TRANSCRIPT =
  'Seventeen year old male, motorcycle crash about two hours ago, no helmet. ' +
  'He lost consciousness for a minute or two at the scene, then was talking normally. ' +
  'Now he has a severe headache and has vomited twice. ' +
  'Eyes open spontaneously, he is confused, but obeys commands. ' +
  'Blood pressure one fifty over eighty five, heart rate fifty eight, sats ninety six percent on room air. ' +
  'Boggy swelling over the right temple.';

export type Extracted = { key: string; label: string; value: string; at: number; critical?: boolean; icon: string };

/** Fields Kyro extracts, and the word index in TRANSCRIPT at which each one "lands". */
export const EXTRACTED: Extracted[] = [
  { key: 'age', label: 'Age / sex', value: '17 · male', at: 3, icon: 'user' },
  { key: 'mech', label: 'Mechanism', value: 'Motorcycle crash, no helmet', at: 11, critical: true, icon: 'alert-triangle' },
  { key: 'time', label: 'Time since injury', value: '≈ 2 hours', at: 9, icon: 'clock' },
  { key: 'loc', label: 'Loss of consciousness', value: 'Yes · 1–2 min', at: 19, critical: true, icon: 'moon' },
  { key: 'lucid', label: 'Lucid interval', value: 'Yes · talking normally after', at: 26, critical: true, icon: 'sunrise' },
  { key: 'sx', label: 'Symptoms', value: 'Severe headache · vomited ×2', at: 36, icon: 'activity' },
  { key: 'gcs', label: 'GCS', value: '14  (E4 V4 M6)', at: 45, critical: true, icon: 'eye' },
  { key: 'bp', label: 'Blood pressure', value: '150 / 85 mmHg', at: 52, critical: true, icon: 'heart' },
  { key: 'hr', label: 'Heart rate', value: '58 bpm', at: 56, critical: true, icon: 'activity' },
  { key: 'spo2', label: 'SpO₂', value: '96 % on room air', at: 63, icon: 'wind' },
  { key: 'scalp', label: 'Scalp', value: 'Right temporal swelling', at: 69, icon: 'crosshair' },
];

export const READBACK = [
  { key: 'gcs', label: 'Glasgow Coma Scale', value: '14', detail: 'Eyes 4 · Verbal 4 · Motor 6' },
  { key: 'loc', label: 'Loss of consciousness', value: 'Yes', detail: '1–2 minutes, at the scene' },
  { key: 'lucid', label: 'Lucid interval', value: 'Yes', detail: 'Talking normally, then worsening' },
  { key: 'bp', label: 'Blood pressure', value: '150/85', detail: 'mmHg · systolic ≥ 110 ✓' },
  { key: 'hr', label: 'Heart rate', value: '58', detail: 'bpm · relative bradycardia' },
  { key: 'mech', label: 'Mechanism', value: 'High-energy', detail: 'Motorcycle, unhelmeted' },
];

export type Cite = { src: string; loc: string; quote: string };

export type TreeNode = {
  id: string;
  q: string;
  a: string;
  hit: boolean; // true = this answer pushed toward higher risk
  cite: Cite;
};

// Quotes are verbatim from passages in the signed knowledge bundle (cloud/bundles/edh-core-v1.kyro)
// or from the reasoning spine (docs/20-edh-cgt-spine.md, spine/edh-cgt.sql).
const C = {
  btfAirway: { src: 'ENLS TBI protocol v4.0', loc: 'Resuscitation', quote: 'If post-resuscitation GCS score ≤ 8 → rapid sequence intubation and activate institutional severe TBI protocol.' },
  nice: { src: 'Primary Trauma Care Manual', loc: 'Head injury · warning signs', quote: 'Watch out for: drowsiness or excessive sleepiness; confusion or disorientation; severe headache, vomiting or fever; limb weakness; inequality of pupils.' },
  peshEdh: { src: 'Bullock et al., Surgical Management of Acute EDH, 2006', loc: 'Clinical presentation', quote: 'The classically described "lucid interval," i.e., a patient who is initially unconscious, then wakes up and secondarily deteriorates, was observed in a total of 456 of 963 patients (47%) undergoing surgery for EDH.' },
  peshNoCt: { src: 'Peshawar Recommendations, 2019', loc: 'Time from injury to neurotrauma facility', quote: 'We recommend limiting hospital transport times for TBI to a period not exceeding four hours.' },
  peshLat: { src: 'Peshawar Recommendations, 2019', loc: 'Timing of surgery', quote: 'For best patient outcomes, surgery should be performed prior to neurologic decompensation, such as decreased mental status or anisocoria. However, if this has already occured, surgery should be performed as soon as possible.' },
  cushing: { src: 'ENLS TBI protocol v4.0', loc: 'Herniation signs', quote: 'Signs of brain herniation such as a dilated or non-reactive pupil, Cushing reflex (hypertension plus bradycardia) or extensor/decerebrate posturing.' },
  integrity: { src: 'Kyro spine · safety rule S1', loc: 'Completeness gate', quote: 'The tree cannot reach any terminal while a critical field is missing; a decision node reached with a missing critical field routes back to re-ask.' },
};

export function treePath(opts: { lateralizing: boolean; deteriorated: boolean }): TreeNode[] {
  const { lateralizing, deteriorated } = opts;
  return [
    { id: 'N0', q: 'Critical inputs present and confirmed?', a: 'Yes · 6/6 read back', hit: false, cite: C.integrity },
    { id: 'N1', q: 'GCS ≤ 8 (airway at risk)?', a: deteriorated ? 'No · GCS 11' : 'No · GCS 14', hit: false, cite: C.btfAirway },
    { id: 'N2', q: 'High-risk mechanism or red-flag symptoms?', a: 'Yes · unhelmeted crash, vomiting ×2', hit: true, cite: C.nice },
    { id: 'N3', q: 'Loss of consciousness with lucid interval?', a: 'Yes', hit: true, cite: C.peshEdh },
    { id: 'N4', q: 'Signs of raised ICP (BP ↑, HR ↓)?', a: deteriorated ? 'Yes · 168/90, HR 52' : 'Possible · 150/85, HR 58', hit: deteriorated, cite: C.cushing },
    { id: 'N5', q: 'Pupil asymmetry or lateralizing signs?', a: lateralizing ? 'Yes · R pupil 5 mm sluggish, L arm drift' : 'No · pupils equal and reactive', hit: lateralizing, cite: C.peshLat },
    { id: 'N6', q: 'CT available on site?', a: 'No', hit: true, cite: C.peshNoCt },
  ];
}

export const OBS_BASE = [
  { t: '19:50', min: 0, gcs: 14, pupils: 'Equal, reactive', bp: '150/85', hr: 58 },
  { t: '20:05', min: 15, gcs: 14, pupils: 'Equal, reactive', bp: '152/86', hr: 57 },
  { t: '20:20', min: 30, gcs: 13, pupils: 'Equal, reactive', bp: '158/88', hr: 55 },
];
export const OBS_DROP = { t: '20:35', min: 45, gcs: 11, pupils: 'R 5 mm sluggish', bp: '168/90', hr: 52 };

export const OBS_VOICE =
  'GCS eleven. Eyes open to voice, words inappropriate, localizes to pain. Right pupil five millimetres, sluggish. Left arm drifting. Pressure one sixty eight over ninety, pulse fifty two.';

export const SPECIALIST = {
  name: 'On-call neurosurgeon',
  site: 'Regional referral centre · 140 km',
  reply:
    'Reviewed the brief and the GCS trend. Agree this needs urgent transfer, I am accepting him. Keep the head up and BP above 110, and call me if GCS drops below 9 or the right pupil becomes fixed. The ambulance is being arranged now.',
};

export const RECENT = [
  { id: 'KY-0416', who: 'Female, 34', what: 'Fall from height', status: 'Observing', tone: 'amber' as const, when: '18:10' },
  { id: 'KY-0414', who: 'Male, 52', what: 'Assault, GCS 15', status: 'Discharged', tone: 'green' as const, when: 'Yesterday' },
  { id: 'KY-0413', who: 'Male, 8', what: 'Fall from tree', status: 'Transferred', tone: 'brand' as const, when: 'Yesterday' },
];
