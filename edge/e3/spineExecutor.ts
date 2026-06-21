/**
 * E3 — Spine executor (the heart of the edge stream).
 *
 * CODE-DRIVEN traversal of the L1 Clinical Guidance Tree (cgt_*) loaded from the bundle.
 * At each node it decides advance / act / ask. The deterministic tree REASONS and sits in
 * veto position; the model (L3) does ONLY four narrow I/O jobs and never moves the conversation.
 *
 * Validated end-to-end against the live v4 spine by `edge/e3/conformance.py`
 * (HM→GUIDE, peds→STABILIZE_TRANSFER, invalid→ABSTAIN_STOP — all pass).
 */

import { evalCondition, type Env } from './conditions';

// ---- spine shape (read from the bundle's cgt_* tables) ----
export interface CgtNode { id: string; kind: string; field: string | null; action: string | null; source_citation: string | null; trust_tier: number | null; }
export interface CgtEdge { src: string; dst: string; condition: string; }
export interface Spine { nodes: Map<string, CgtNode>; edges: CgtEdge[]; rootId: string; }

/** Load cgt_* from an open op-sqlite DB (the LoadedBundle.db from E1). */
export function loadSpine(db: { executeSync: (sql: string) => { rows?: { _array?: any[] } } }): Spine {
  const rows = (sql: string) => db.executeSync(sql).rows?._array ?? [];
  const nodes = new Map<string, CgtNode>();
  for (const r of rows('SELECT id,kind,field,action,source_citation,trust_tier FROM cgt_nodes')) nodes.set(r.id, r as CgtNode);
  const edges = rows('SELECT src_id,dst_id,condition FROM cgt_edges').map((r: any) => ({ src: r.src_id, dst: r.dst_id, condition: r.condition }));
  const rootId = (rows('SELECT root_id FROM cgt_meta')[0]?.root_id) as string;
  return { nodes, edges, rootId };
}

// ---- L3: language I/O ONLY — a mouth, not a brain ----
export interface L3 {
  cleanAsr(raw: string): Promise<string>;                                   // 1. tidy the spoken text
  classifyAnswer(field: string, utterance: string, node: CgtNode): Promise<Env[string]>; // 2. utterance → structured value
  phraseQuestion(node: CgtNode, lang: string): Promise<string>;             // 3. ask the next field (in-language)
  synthesizeLeaf(node: CgtNode, citations: string[], lang: string): Promise<string>;     // 4. word the cited recommendation
}

/** Voice/UI host for a gather node — abstracts ASR + read-back. Tests pass a scripted map. */
export interface GatherHost { ask(field: string, node: CgtNode): Promise<Env[string]>; }

export interface ExecResult { action: string; leaf: CgtNode; recommendation: string; trace: string[]; citation: string | null; }

// ---- derivation layer: derived fields from raw evidence ----
// ⚠️ [VERIFY-MENTOR] herniation_signs, the hypoglycaemia threshold, and gcs_trend source are
// encoded to match the spine's intent — counter-sign at clinical validation (mirrors conformance.py).
export function derive(e: Env): Env {
  const num = (k: string) => Number(e[k]);
  e.gcs_total = num('gcs_e') + num('gcs_v') + num('gcs_m');
  const lf = e.pupil_react_l === 'fixed', rf = e.pupil_react_r === 'fixed';
  e.bilateral_fixed = lf && rf;
  e.fixed_pupil_side = lf && !rf ? 'left' : rf && !lf ? 'right' : 'none';
  if (e.gcs_trend === undefined) e.gcs_trend = num('gcs_total') < Number(e.patient_baseline ?? 15) ? 'declining' : 'stable';
  e.hypoxic = e.spo2_available === 'yes' && num('spo2_pct') < 94;
  e.spo2_unknown = e.spo2_available === 'no';
  e.hypoglycemic = e.glucose_available === 'yes' && num('blood_glucose') < 60;   // [VERIFY-MENTOR] threshold
  e.glucose_unknown = e.glucose_available === 'no';
  const age = num('age_yr'), sbp = num('sbp_mmhg');
  e.sbp_at_target = !((age >= 50 && age <= 69 && sbp < 100) || (((age >= 15 && age <= 49) || age > 70) && sbp < 110));
  e.herniation_signs = e.fixed_pupil_side !== 'none' || !!e.bilateral_fixed || e.posturing !== 'none' || e.gcs_trend === 'declining'; // [VERIFY-MENTOR]
  const defaults: Env = { patient_baseline: 15, redflag_fired: false, red_terminal_reached: false,
    field_supplied: true, field_revalidated: true, gcs_valid: true, pupils_valid: true, bp_valid: true,
    all_critical_fields_present: true, any_critical_field_missing: false, gcs_recapture_conflict: false,
    same_pupil_react_fixed_AND_brisk: false, two_sbp_entries_diff_gt_40: false,
    cross_time_pupil_or_gcs_reversal_implausible: false, pupil_change: false, new_focal_asymmetry: false,
    persistent_vomiting: 'no', severe_or_increasing_headache: 'no', agitation: 'no',
    second_observer_confirmed: 'no', teleconsult_available: 'no', transfer_feasible_within_window: 'no' };
  for (const k in defaults) if (e[k] === undefined) e[k] = defaults[k];
  // S3 validation: out-of-range GCS components fail validity → drives the safe abstain
  if (!(num('gcs_e') >= 1 && num('gcs_e') <= 4 && num('gcs_v') >= 1 && num('gcs_v') <= 5 && num('gcs_m') >= 1 && num('gcs_m') <= 6)) {
    e.gcs_valid = false; e.all_critical_fields_present = false; e.any_critical_field_missing = true;
  }
  return e;
}

const ABSTAIN_FALLBACK = 'N99'; // any faulting/unresolved condition fails closed to the abstain terminal

/**
 * Run the encounter. `host` supplies field values at gather nodes (voice+ASR+classify+read-back);
 * `l3` words the final recommendation. `seed` pre-fills evidence (used by headless tests).
 */
export async function execute(spine: Spine, host: GatherHost, l3: L3, opts: { lang?: string; seed?: Env } = {}): Promise<ExecResult> {
  const lang = opts.lang ?? 'en';
  const env: Env = derive({ ...(opts.seed ?? {}) });
  let cur = spine.rootId;
  const trace: string[] = [];

  for (let step = 0; step < 80; step++) {
    const node = spine.nodes.get(cur);
    if (!node) throw new Error(`spine: missing node ${cur}`);
    trace.push(cur);

    // ACT/terminal: a node carrying an action is a leaf — synthesize + return.
    if (node.action) {
      const recommendation = await l3.synthesizeLeaf(node, node.source_citation ? [node.source_citation] : [], lang);
      return { action: node.action, leaf: node, recommendation, trace, citation: node.source_citation };
    }

    // ASK: a gather node captures its field(s) (if not already known), then re-derive.
    if ((node.kind === 'gather' || node.kind === 'evidence') && node.field) {
      for (const f of node.field.split(';')) {
        if (env[f] === undefined) env[f] = await host.ask(f, node);
      }
      derive(env);
    }

    // ADVANCE: follow the first edge whose condition holds. A faulting condition fails closed.
    let next: string | undefined;
    for (const e of spine.edges) {
      if (e.src !== cur) continue;
      let fired = false;
      try { fired = evalCondition(e.condition, env); }
      catch { next = ABSTAIN_FALLBACK; break; } // unresolved/parse fault → safe abstain (fail-closed)
      if (fired) { next = e.dst; break; }
    }
    if (next === undefined) { next = ABSTAIN_FALLBACK; } // no edge fired → never a dead end
    cur = next;
  }
  throw new Error('spine: traversal did not terminate (loop guard)');
}
