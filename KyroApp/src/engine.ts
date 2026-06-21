/**
 * runDecision(seed) — the REAL Kyro pipeline on a given evidence seed.
 * E1 open bundle → E3 spine execute → E2 coverage → E4 gate → E5 SBAR handoff.
 * L3 + knn are stubbed (hardware-gated); the tree decides. Returns the finished decision.
 */
import { kyroDb } from './kyroDb';
import { loadSpine, execute, type GatherHost, type L3, type CgtNode, type ExecResult } from '../engine/e3/spineExecutor';
import type { Env } from '../engine/e3/conditions';
import { gate, type Gated } from '../engine/e4/abstentionGate';
import { retrieve } from '../engine/e2/retrieval';
import { resolveRetrievalDeps } from './retrievalDeps';
import { InMemoryJournal, journalingHost, finalize, reduce } from '../engine/e5/stateMachine';
import { buildHandoff, type HandoffBrief } from '../engine/e5/handoff';
import { qwenL3, initModel, modelStatus } from './qwenL3';

export { initModel, modelStatus };

/**
 * Optionally reword a leaf's recommendation with the on-device Qwen model (the model's "mouth" job).
 * Returns null if the model isn't loaded — the UI then keeps the instant authored guideline text.
 * Never changes the decision: the tree already reached the leaf; this only rephrases the wording.
 */
export async function rewordRecommendation(leafId: string, citation: string | null): Promise<string | null> {
  if (modelStatus() !== 'ready') return null;
  try { return await qwenL3().synthesizeLeaf({ id: leafId } as CgtNode, citation ? [citation] : [], 'en'); }
  catch { return null; }
}

export interface KyroDecision {
  action: string; leafId: string; badge: Gated['badge']; label: string; cleared: boolean;
  drillAbstain: string | null; trace: string[]; recommendation: string; citation: string | null; handoff: HandoffBrief;
}

// query embedder + vec0 knn now resolved by ./retrievalDeps (real BGE-M3+vec0 on a real bundle, stub otherwise)

function stubL3(): L3 {
  return {
    async cleanAsr(s) { return s; },
    async classifyAnswer(_f, u) { return u; },
    async phraseQuestion() { return '?'; },
    async synthesizeLeaf(node: CgtNode) {
      return (kyroDb.readLeafText(node.id, 'en') ?? `(no authored text for ${node.id})`).replace(/^\[[^\]]*\]\s*/, '');
    },
  };
}

export async function runDecision(seed: Env): Promise<KyroDecision> {
  const db = await kyroDb.open();
  const spine = loadSpine(db);
  // Decision uses the deterministic authored leaf text — INSTANT, always correct. The model rewords
  // in the background via rewordRecommendation() so the result paints immediately (model rewording is
  // seconds on a phone). The tree decides either way; this is purely about render latency.
  const l3 = stubL3();

  let t = 0; const clock = () => ++t;
  const journal = new InMemoryJournal();
  journal.append({ t: 'started', ts: clock(), encounterId: 'ENC', lang: 'en' });
  const noAsk: GatherHost = { async ask(f) { throw new Error(`unexpected ask for ${f}`); } };
  const host = journalingHost(noAsk, journal, clock);

  const exec: ExecResult = await execute(spine, host, l3, { seed: { ...seed } });
  const deps = await resolveRetrievalDeps(db);
  const qv = await deps.embedQuery('head injury, herniation, EDH');
  const ret = retrieve(db, 'head injury, herniation, EDH', exec.citation, () => qv, deps.knn);
  const gated = gate(exec, ret.coverage, {
    drillAbstainText: kyroDb.readLeafText('L40', 'en') ?? undefined,
    rawLeafString: kyroDb.readLeafText(exec.leaf.id, 'en') ?? undefined,
  });
  finalize(journal, exec, gated, clock);
  const handoff = buildHandoff(reduce(journal.load()), gated, clock());
  const recommendation = await l3.synthesizeLeaf(exec.leaf, exec.citation ? [exec.citation] : [], 'en');

  return {
    action: exec.action, leafId: exec.leaf.id, badge: gated.badge, label: gated.label, cleared: gated.cleared,
    drillAbstain: gated.drillSiteAbstain?.text ?? null, trace: exec.trace, recommendation, citation: exec.citation, handoff,
  };
}
