/**
 * The interactive gather — the key decision-driving fields asked one at a time, with tappable
 * clinical options. The rest of the spine's fields use a sensible baseline. Answers + baseline +
 * derived values → the Env seed the real engine runs on. Your spoken answers / taps steer the tree.
 */
import type { Env } from '../engine/e3/conditions';

export interface Opt { label: string; value: string | number; sub?: string }
export interface GatherStep {
  key: string;                 // unique step id
  prompt: string;              // the question Kyro asks
  hint?: string;               // small helper line
  controls: Array<{ field: string; label?: string; options: Opt[] }>;  // 1-2 controls per step
}

export const STEPS: GatherStep[] = [
  {
    key: 'mechanism', prompt: 'What caused the head injury?', hint: 'Mechanism of injury',
    controls: [{ field: 'mechanism_class', options: [
      { label: 'Road traffic', value: 'blunt' }, { label: 'Fall', value: 'blunt' },
      { label: 'Gunshot', value: 'penetrating', sub: 'penetrating' }, { label: 'Blast', value: 'blast' },
    ] }],
  },
  {
    key: 'gcs', prompt: 'Glasgow Coma Scale', hint: 'Score each component',
    controls: [
      { field: 'gcs_e', label: 'Eye (1–4)', options: [{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }] },
      { field: 'gcs_v', label: 'Verbal (1–5)', options: [{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }, { label: '5', value: 5 }] },
      { field: 'gcs_m', label: 'Motor (1–6)', options: [{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }, { label: '5', value: 5 }, { label: '6', value: 6 }] },
    ],
  },
  {
    key: 'pupils', prompt: 'Pupil reaction to light', hint: 'Both sides',
    controls: [
      { field: 'pupil_react_l', label: 'Left', options: [{ label: 'Brisk', value: 'brisk' }, { label: 'Sluggish', value: 'sluggish' }, { label: 'Fixed', value: 'fixed', sub: 'blown' }] },
      { field: 'pupil_react_r', label: 'Right', options: [{ label: 'Brisk', value: 'brisk' }, { label: 'Sluggish', value: 'sluggish' }, { label: 'Fixed', value: 'fixed', sub: 'blown' }] },
    ],
  },
  {
    key: 'lucid', prompt: 'Was there a lucid interval?', hint: 'Coherent after injury, then declined',
    controls: [{ field: 'lucid_interval', options: [{ label: 'Yes', value: 'yes', sub: 'classic EDH' }, { label: 'No', value: 'no' }, { label: 'Unknown', value: 'unknown' }] }],
  },
  {
    key: 'bp', prompt: 'Systolic blood pressure', hint: 'mmHg',
    controls: [{ field: 'sbp_mmhg', options: [{ label: '< 90', value: 80, sub: 'shock' }, { label: '90–110', value: 100 }, { label: '110–140', value: 130 }, { label: '> 140', value: 160 }] }],
  },
  {
    key: 'thinner', prompt: 'On any blood thinner?', hint: 'Anticoagulant / antiplatelet',
    controls: [{ field: 'anticoag_antiplatelet', options: [{ label: 'None', value: 'none' }, { label: 'Warfarin', value: 'warfarin' }, { label: 'Aspirin', value: 'antiplatelet', sub: 'antiplatelet' }, { label: 'Unknown', value: 'unknown' }] }],
  },
  {
    key: 'focal', prompt: 'Focal signs', hint: 'One-sided weakness · abnormal posturing',
    controls: [
      { field: 'focal_weakness_side', label: 'Weak side', options: [{ label: 'None', value: 'none' }, { label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }] },
      { field: 'posturing', label: 'Posturing', options: [{ label: 'None', value: 'none' }, { label: 'Flexor', value: 'decorticate' }, { label: 'Extensor', value: 'decerebrate' }] },
    ],
  },
];

/** Non-asked fields — a clean adult baseline so the spine reaches a real decision. */
const BASELINE: Env = {
  mechanism: 'injury', time_since_injury_hr: 3, known_coagulopathy: 'no', age_yr: 35,
  spo2_pct: 96, spo2_available: 'yes', blood_glucose: 100, glucose_available: 'yes', seizure_status: 'none',
};

/** Build the Env seed from collected answers + baseline + derived pupil sizes. */
export function buildSeed(answers: Record<string, string | number>): Env {
  const e: Env = { ...BASELINE, ...answers };
  e.pupil_size_l_mm = e.pupil_react_l === 'fixed' ? 6 : 3;
  e.pupil_size_r_mm = e.pupil_react_r === 'fixed' ? 6 : 3;
  return e;
}
