/**
 * The scripted demo encounter. Everything here is SIMULATED for a concept demo:
 * the patient, the clinician, the readings, and the specialist reply are invented.
 * Scenario follows the team's Loom script: a 17-year-old after a motorcycle crash at a
 * district hospital with no CT and no neurosurgeon; GCS 14 falls to 11.
 */

export const PATIENT = {
  id: 'KY-0417',
  label: 'Male, 17',
  mechanism: 'Motorcycle crash, unhelmeted',
  site: 'District Hospital · Emergency bay 2',
  arrived: '19:42',
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

const C = {
  btfAirway: { src: 'Brain Trauma Foundation, 4th ed.', loc: 'Airway & ventilation', quote: 'Patients with GCS ≤ 8 require definitive airway protection.' },
  nice: { src: 'NICE NG232 Head injury, 2023', loc: 'Risk factors for intracranial injury', quote: 'Dangerous mechanism, more than one episode of vomiting and loss of consciousness are risk factors for intracranial injury.' },
  peshEdh: { src: 'Peshawar Recommendations, 2019', loc: 'Extradural haematoma', quote: 'A lucid interval followed by deterioration should be treated as an expanding extradural haematoma until proven otherwise.' },
  peshNoCt: { src: 'Peshawar Recommendations, 2019', loc: 'Settings without CT', quote: 'Where imaging is unavailable, serial neurological examination and early referral are the basis of management.' },
  peshLat: { src: 'Peshawar Recommendations, 2019', loc: 'Clinical localisation', quote: 'New pupillary asymmetry or contralateral weakness indicates a time-critical lesion requiring neurosurgical decision.' },
  cushing: { src: 'BTF 4th ed. / ATLS 10th ed.', loc: 'Raised ICP', quote: 'Hypertension with relative bradycardia may signal rising intracranial pressure.' },
  integrity: { src: 'Kyro safety rules v1.4', loc: 'Input validation', quote: 'All critical fields must be in range and confirmed by read-back before traversal.' },
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

export const STABILIZE = [
  { id: 'hob', title: 'Head of bed up 30°', sub: 'Neck neutral, collar loose', src: 'BTF 4th ed.' },
  { id: 'o2', title: 'Oxygen to keep SpO₂ > 94 %', sub: 'Avoid any hypoxia', src: 'BTF 4th ed.' },
  { id: 'sbp', title: 'Keep systolic BP ≥ 110 mmHg', sub: 'Treat hypotension first', src: 'BTF 4th ed.' },
  { id: 'fluids', title: 'Isotonic fluids only', sub: 'No dextrose / hypotonic fluids', src: 'Peshawar 2019' },
  { id: 'glucose', title: 'Check blood glucose', sub: 'Target 6–10 mmol/L', src: 'Peshawar 2019' },
  { id: 'airway', title: 'Prepare airway', sub: 'Intubate if GCS falls to ≤ 8', src: 'BTF 4th ed.' },
];

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
