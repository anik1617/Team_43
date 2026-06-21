/**
 * useKyroEncounter — the ONE hook your UI calls.
 *
 * On mount it runs the REAL Kyro edge engine end-to-end against the signed mock bundle,
 * on a hardcoded *severe-HM* seed (the herniating-EDH case from the case report), and
 * returns the finished decision so a screen can just render it.
 *
 * It reuses the actual shipping engine — NOTHING here re-implements clinical logic:
 *   E1  open the signed mock bundle               (../engine/e1 via the kyroDb adapter)
 *   E3  loadSpine + execute  (deterministic tree)  ../engine/e3/spineExecutor
 *   E2  retrieve             (coverage signal)     ../engine/e2/retrieval
 *   E4  gate                 (🟢/🟡/🔴 badge)       ../engine/e4/abstentionGate
 *   E5  buildHandoff         (SBAR for the expert) ../engine/e5/handoff   (+ stateMachine fold)
 *
 * The only stubbed pieces are the two HARDWARE-GATED dependencies (a real device swaps these in):
 *   • L3 — language I/O only. synthesizeLeaf reads the leaf's AUTHORED cgt_strings recommendation
 *          from the bundle; cleanAsr / classifyAnswer are pass-throughs. The model NEVER decides.
 *   • knn — the BGE-M3 vec0 nearest-neighbour. Here it returns a deterministic EDH grounding
 *          hit-set so the COVERAGE MECHANICS run for real (the semantic ranking is what's mocked).
 *
 * Expected result on this seed: GUIDE @ L21c, badge 🟢 GREEN, with the mandatory N40 drill-site
 * abstain rider. (Locked by edge/tests/run.ts.)
 */

import { useEffect, useState } from 'react';

import { kyroDb } from './kyroDb';
import {
  loadSpine,
  execute,
  type GatherHost,
  type L3,
  type Spine,
  type ExecResult,
  type CgtNode,
} from '../engine/e3/spineExecutor';
import type { Env } from '../engine/e3/conditions';
import { gate, type Gated } from '../engine/e4/abstentionGate';
import { retrieve } from '../engine/e2/retrieval';
import { resolveRetrievalDeps } from './retrievalDeps';
import {
  InMemoryJournal,
  journalingHost,
  finalize,
  reduce,
} from '../engine/e5/stateMachine';
import { buildHandoff, type HandoffBrief } from '../engine/e5/handoff';

// ─────────────────────────────────────────────────────────────────────────────
// The severe-HM seed (the herniating-EDH case). Field names match the spine exactly.
// This is the canonical HM vignette from edge/tests/run.ts — it reaches GUIDE@L21c.
// ─────────────────────────────────────────────────────────────────────────────
const HM_SEVERE: Env = {
  mechanism: 'rta',
  mechanism_class: 'blunt',
  time_since_injury_hr: 3,
  gcs_e: 1,
  gcs_v: 2,
  gcs_m: 4,
  pupil_size_l_mm: 6,
  pupil_react_l: 'fixed',
  pupil_size_r_mm: 3,
  pupil_react_r: 'brisk',
  sbp_mmhg: 160,
  age_yr: 31,
  spo2_pct: 95,
  spo2_available: 'yes',
  blood_glucose: 0,
  glucose_available: 'no',
  lucid_interval: 'yes',
  focal_weakness_side: 'right',
  posturing: 'none',
  seizure_status: 'none',
  anticoag_antiplatelet: 'none',
  known_coagulopathy: 'no',
};

// Plain-language query used to seed retrieval (E2). Pure grounding text, no PHI.
const HM_QUERY = 'herniating EDH, lucid interval, blown left pupil, GCS dropping';

// ─────────────────────────────────────────────────────────────────────────────
// What the hook hands your UI. One flat object — render it however you like.
// ─────────────────────────────────────────────────────────────────────────────
export interface KyroDecision {
  action: string; // GUIDE / OBSERVE / STABILIZE_TRANSFER / ABSTAIN_STOP
  leafId: string; // the leaf the deterministic tree reached (e.g. "L21c")
  badge: Gated['badge']; // 'GREEN' | 'YELLOW' | 'RED' — the authoritative gate verdict
  label: string; // human label for the badge ("Protocol — operate-locally…", etc.)
  cleared: boolean; // may the product surface this as an actionable recommendation?
  drillAbstain: string | null; // the mandatory 🔴 N40 drill-site abstain line (GUIDE only)
  trace: string[]; // the node path — the tree's auditable reasoning
  recommendation: string; // the cited recommendation, worded from the leaf's authored string
  citation: string | null; // the leaf's source citation
  handoff: HandoffBrief; // the pre-briefed SBAR expert handoff (the hero artifact)
}

export interface UseKyroEncounter {
  loading: boolean;
  result: KyroDecision | null;
  error: Error | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stubbed, hardware-gated dependencies (a real device swaps these in).
// ─────────────────────────────────────────────────────────────────────────────

/** L3 = a mouth, not a brain. synthesizeLeaf reads the AUTHORED recommendation from the
 *  bundle (via kyroDb); the rest are pass-throughs. Strips the `[GREEN]/[RED]` render hint. */
function makeStubL3(): L3 {
  return {
    async cleanAsr(raw) {
      return raw;
    },
    async classifyAnswer(_field, utterance) {
      return utterance;
    },
    async phraseQuestion() {
      return '?';
    },
    async synthesizeLeaf(node: CgtNode) {
      const authored = kyroDb.readLeafText(node.id, 'en');
      return (authored ?? `(no authored text for ${node.id})`).replace(/^\[[^\]]*\]\s*/, '');
    },
  };
}

/** A no-ask GatherHost: every field is already in the seed, so it must never be asked. */
const NO_ASK_HOST: GatherHost = {
  async ask(field) {
    throw new Error(`useKyroEncounter: unexpected ask for "${field}" — seed is incomplete`);
  },
};

// E2's two hardware-gated deps (query embedder + vec0 knn) now live in ./retrievalDeps:
// resolveRetrievalDeps() returns the REAL BGE-M3 + sqlite-vec path on a real bge-m3 bundle when
// the GGUF loads, and the deterministic EDH stub hit-set otherwise (mock bundle / laptop demo).

// ─────────────────────────────────────────────────────────────────────────────
// The pipeline. Pure async function so it is trivially testable outside React too.
// ─────────────────────────────────────────────────────────────────────────────
async function runHmEncounter(): Promise<KyroDecision> {
  // E1 · open the verified mock bundle → an op-sqlite-shaped DB the engine reads.
  const db = await kyroDb.open();

  // E3 · load the deterministic spine + run the executor on the seeded severe-HM evidence.
  const spine: Spine = loadSpine(db);
  const l3 = makeStubL3();

  // Journal the encounter so we can build the SBAR handoff (E5) — the continuity primitive.
  let clockT = 0;
  const clock = () => ++clockT;
  const journal = new InMemoryJournal();
  journal.append({ t: 'started', ts: clock(), encounterId: 'ENC-HM-DEMO', lang: 'en' });
  const host = journalingHost(NO_ASK_HOST, journal, clock);

  const exec: ExecResult = await execute(spine, host, l3, { seed: HM_SEVERE });

  // E2 · retrieval coverage for the leaf the tree reached → the signal E4 gates on.
  // Resolve the hardware-gated deps (real BGE-M3 + vec0 on a real bundle+model; stub otherwise).
  // The query embed is async on device, so precompute the vector and hand retrieve() a sync accessor.
  const deps = await resolveRetrievalDeps(db);
  const qv = await deps.embedQuery(HM_QUERY);
  const ret = retrieve(db, HM_QUERY, exec.citation, () => qv, deps.knn);

  // E4 · the authoritative badge (🟢/🟡/🔴) from STRUCTURE + coverage. Pass the bundle's L40
  // drill-abstain string + the leaf's authored string for the audit cross-check.
  const gated: Gated = gate(exec, ret.coverage, {
    drillAbstainText: kyroDb.readLeafText('L40', 'en') ?? undefined,
    rawLeafString: kyroDb.readLeafText(exec.leaf.id, 'en') ?? undefined,
  });

  // E5 · record the conclusion + build the pre-briefed SBAR expert handoff.
  finalize(journal, exec, gated, clock);
  const handoff = buildHandoff(reduce(journal.load()), gated, clock());

  // Word the cited recommendation from the leaf the tree reached (L3's only output job).
  const recommendation = await l3.synthesizeLeaf(exec.leaf, exec.citation ? [exec.citation] : [], 'en');

  return {
    action: exec.action,
    leafId: exec.leaf.id,
    badge: gated.badge,
    label: gated.label,
    cleared: gated.cleared,
    drillAbstain: gated.drillSiteAbstain?.text ?? null,
    trace: exec.trace,
    recommendation,
    citation: exec.citation,
    handoff,
  };
}

/**
 * Run one severe-HM Kyro encounter on mount. Returns { loading, result, error }.
 * `result` is null while loading and on error.
 */
export function useKyroEncounter(): UseKyroEncounter {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<KyroDecision | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    runHmEncounter()
      .then((decision) => {
        if (!cancelled) {
          setResult(decision);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, result, error };
}
