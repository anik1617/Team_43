/**
 * E5 — Pre-briefed expert handoff (the hero artifact).
 *
 * Deterministically renders the encounter state as an SBAR brief — the clinical handoff format
 * every MD recognizes (Situation / Background / Assessment / Recommendation). Generated PURELY
 * from `<evidence, hypotheses, trajectory>`; the model is NOT on this path (L3 may later polish
 * the prose IN-LANGUAGE, but it cannot change the content). On reconnect this is what Kyro hands
 * the neurosurgeon, so a dropped call costs zero re-gathering.
 *
 * The "hypotheses" leg of the triple = the active clinical concerns the deterministic tree is
 * weighing, surfaced from the derived evidence flags (herniation, anticoagulation, etc.).
 */

import { derive, type ExecResult } from '../e3/spineExecutor';
import type { Env } from '../e3/conditions';
import type { Gated, Badge } from '../e4/abstentionGate';
import { reduce, type EncounterState, type Event } from './stateMachine';

export interface HandoffBrief {
  encounterId: string;
  generatedAt: number;
  badge: Badge;
  sbar: { situation: string; background: string; assessment: string; recommendation: string };
  evidence: Record<string, string>;  // formatted key vitals (audit-friendly)
  hypotheses: string[];              // active clinical concerns (the differential the tree is weighing)
  trajectory: string[];              // the node path (the tree's auditable reasoning)
  abstaining: string | null;         // what Kyro explicitly is NOT doing (e.g. drill-site at N40)
  resumeToken: string;               // encounterId — rehydrate the full encounter via journal.load()
}

const s = (v: Env[string]): string => (v === undefined || v === null ? '?' : String(v));

/** Surface the active concerns from derived flags — deterministic, not model-inferred. */
export function deriveHypotheses(e: Env): string[] {
  const h: string[] = [];
  if (e.herniation_signs) h.push(`herniation surrogate present (${e.fixed_pupil_side !== 'none' ? `${e.fixed_pupil_side} pupil fixed` : e.bilateral_fixed ? 'bilateral fixed' : e.posturing !== 'none' ? 'posturing' : 'GCS declining'})`);
  if (e.lucid_interval === 'yes') h.push('lucid interval reported (classic EDH)');
  if (e.anticoag_antiplatelet && e.anticoag_antiplatelet !== 'none') h.push(`on ${s(e.anticoag_antiplatelet)} — coagulopathy risk`);
  if (e.hypoxic) h.push('hypoxia (SpO₂ < 94%)');
  if (e.hypoglycemic) h.push('hypoglycaemia (< 60 mg/dL)');
  if (e.sbp_at_target === false) h.push('below SBP target — resuscitate first');
  if (Number(e.age_yr) < 15) h.push('paediatric — adult thresholds do not apply');
  if (!h.length) h.push('no high-risk surgical cluster identified');
  return h;
}

/** Build the SBAR handoff from the final encounter state + the gate verdict. Deterministic. */
export function buildHandoff(state: EncounterState, gated: Gated, generatedAt: number): HandoffBrief {
  const e = derive({ ...state.evidence });      // derive on a copy → gcs_total, fixed_pupil_side, etc.
  const gcs = `${s(e.gcs_total)} (E${s(e.gcs_e)}V${s(e.gcs_v)}M${s(e.gcs_m)})`;
  const pupils = `L ${s(e.pupil_size_l_mm)}mm/${s(e.pupil_react_l)}, R ${s(e.pupil_size_r_mm)}mm/${s(e.pupil_react_r)}`;
  const hypotheses = deriveHypotheses(e);
  const abstaining = gated.drillSiteAbstain
    ? `drill-site / localization (node ${gated.drillSiteAbstain.node}) — imaging wall; neurosurgeon required`
    : gated.irreducibleStop ? `${gated.label} — handed to expert` : null;

  const evidence: Record<string, string> = {
    age: `${s(e.age_yr)} yr`, mechanism: `${s(e.mechanism)} (${s(e.mechanism_class)})`,
    time_since_injury: `${s(e.time_since_injury_hr)} h`, gcs: gcs, gcs_trend: s(e.gcs_trend),
    pupils, sbp: `${s(e.sbp_mmhg)} mmHg`, spo2: e.spo2_available === 'yes' ? `${s(e.spo2_pct)}%` : 'not measured',
    lucid_interval: s(e.lucid_interval), focal: s(e.focal_weakness_side), posturing: s(e.posturing),
    anticoagulation: s(e.anticoag_antiplatelet),
  };

  const badgeWord = gated.badge === 'GREEN' ? '🟢 Protocol' : gated.badge === 'YELLOW' ? '🟡 Principles' : '🔴 Stop';
  const conc = state.conclusion;

  return {
    encounterId: state.encounterId,
    generatedAt,
    badge: gated.badge,
    sbar: {
      situation: `${s(e.age_yr)}yo, ${s(e.mechanism)} ${s(e.time_since_injury_hr)}h ago. GCS ${gcs}, trend ${s(e.gcs_trend)}. Pupils: ${pupils}. Working concern: ${hypotheses[0]}.`,
      background: `Mechanism ${s(e.mechanism)}/${s(e.mechanism_class)}. Lucid interval: ${s(e.lucid_interval)}. Focal: ${s(e.focal_weakness_side)}. SBP ${s(e.sbp_mmhg)} mmHg, SpO₂ ${evidence.spo2}. Anticoagulation: ${s(e.anticoag_antiplatelet)}.`,
      assessment: `Deterministic guidance tree reached ${conc?.action ?? '?'} (leaf ${conc?.leafId ?? '?'}), badge ${badgeWord}. Active concerns: ${hypotheses.join('; ')}. Path: ${state.trajectory.join(' → ')}.`,
      recommendation: `${conc?.recommendation ?? '(pending)'}${abstaining ? ` Kyro ABSTAINS on ${abstaining}.` : ''}${conc?.citation ? ` [${conc.citation}]` : ''}`,
    },
    evidence, hypotheses, trajectory: state.trajectory.slice(), abstaining,
    resumeToken: state.encounterId,
  };
}

/** Convenience: build the handoff straight from a journal's events + the gate verdict. */
export function handoffFromJournal(events: Event[], gated: Gated, generatedAt: number): HandoffBrief {
  return buildHandoff(reduce(events), gated, generatedAt);
}

/** (kept for symmetry with E3/E4 imports — ExecResult is the source of the conclusion via finalize) */
export type { ExecResult };
