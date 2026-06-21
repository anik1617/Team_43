/**
 * runDecision(seed) — the REAL Kyro pipeline on a given evidence seed.
 * E1 open bundle → E3 spine execute → E2 coverage → E4 gate → E5 SBAR handoff.
 * L3 + knn are stubbed (hardware-gated); the tree decides. Returns the finished decision.
 */
import { kyroDb } from './kyroDb';
import { loadSpine, execute, type GatherHost, type L3, type CgtNode, type ExecResult } from '../engine/e3/spineExecutor';
import type { Env } from '../engine/e3/conditions';
import { gate, type Gated } from '../engine/e4/abstentionGate';
import { retrieve, type Knn, type Embed } from '../engine/e2/retrieval';
import { InMemoryJournal, journalingHost, finalize, reduce } from '../engine/e5/stateMachine';
import { buildHandoff, type HandoffBrief } from '../engine/e5/handoff';
import { qwenL3, initModel, modelStatus } from './qwenL3';

export { initModel, modelStatus };

export interface KyroDecision {
  action: string; leafId: string; badge: Gated['badge']; label: string; cleared: boolean;
  drillAbstain: string | null; trace: string[]; recommendation: string; citation: string | null; handoff: HandoffBrief;
}

const GROUNDING_KNN: Knn = (table) =>
  table === 'chunk_vec' ? [{ id: 'ch01', score: 0.92 }, { id: 'ch03', score: 0.88 }] : [{ id: 'n_edh', score: 0.9 }];
const EMBED: Embed = () => new Float32Array(1024);

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
  // Qwen rewords the leaf if the model is loaded; else the authored guideline text (always works).
  const l3 = modelStatus() === 'ready' ? qwenL3() : stubL3();

  let t = 0; const clock = () => ++t;
  const journal = new InMemoryJournal();
  journal.append({ t: 'started', ts: clock(), encounterId: 'ENC', lang: 'en' });
  const noAsk: GatherHost = { async ask(f) { throw new Error(`unexpected ask for ${f}`); } };
  const host = journalingHost(noAsk, journal, clock);

  const exec: ExecResult = await execute(spine, host, l3, { seed: { ...seed } });
  const ret = retrieve(db, 'head injury, herniation, EDH', exec.citation, EMBED, GROUNDING_KNN);
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
