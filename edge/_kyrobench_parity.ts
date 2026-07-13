/**
 * KyroBench / cross-plane engine parity at SCALE.
 *
 * The team's #1 stated project-killer is a cloud<->device divergence. Their existing parity
 * test covers a handful of hand cases. This runs the SAME large generated population through:
 *   - the on-device shipping TypeScript spine executor (this file), and
 *   - the Python reference executor (which already tagged every row with py_action/py_leaf).
 * and reports decision-level agreement (action AND reached leaf) over tens of thousands of cases.
 *
 * Run from edge/:
 *   node --experimental-sqlite --import tsx _kyrobench_parity.ts <population.json> [limit]
 */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { loadSpine, execute, type GatherHost, type L3, type Spine } from './e3/spineExecutor.ts';

const POP = process.argv[2] ?? '../../_kyrobench/out/population.json';
const LIMIT = process.argv[3] ? parseInt(process.argv[3], 10) : Infinity;

const data = JSON.parse(readFileSync(POP, 'utf-8'));
const bundlePath = `../cloud/bundles/${data.bundle}`;
const ndb = new DatabaseSync(bundlePath);
const opShim = { executeSync: (sql: string) => ({ rows: { _array: ndb.prepare(sql).all() } }) };
const spine: Spine = loadSpine(opShim);

// Fully-seeded cases: the host must never be asked. The L3 stub is never load-bearing here.
const noAsk: GatherHost = { async ask(f) { throw new Error(`unexpected ask: ${f}`); } };
const l3: L3 = {
  async cleanAsr(s) { return s; },
  async classifyAnswer(_f, u) { return u; },
  async phraseQuestion() { return '?'; },
  async synthesizeLeaf(n) { return `[${n.id}]`; },
};

const rows = data.rows.slice(0, LIMIT === Infinity ? data.rows.length : LIMIT);
let n = 0, actionAgree = 0, leafAgree = 0, both = 0, asked = 0;
let leafMismatchActionDiffers = 0;       // a leaf mismatch where the ACTION also differs (the dangerous kind)
const leafMismatchByAction: Record<string, number> = {};
const leafMismatchPairs: Record<string, number> = {};
const examples: any[] = [];

for (const row of rows) {
  n++;
  let r;
  try {
    r = await execute(spine, noAsk, l3, { seed: { ...row.evidence } });
  } catch (e) {
    asked++;
    continue;
  }
  const aOk = r.action === row.py_action;
  const lOk = r.leaf.id === row.py_leaf;
  if (aOk) actionAgree++;
  if (lOk) leafAgree++;
  if (aOk && lOk) { both++; continue; }
  // a mismatch (leaf and/or action)
  if (!aOk) leafMismatchActionDiffers++;
  const act = aOk ? row.py_action : `${row.py_action}!=${r.action}`;
  leafMismatchByAction[act] = (leafMismatchByAction[act] ?? 0) + 1;
  const pair = `${row.py_leaf}->${r.leaf.id}`;
  leafMismatchPairs[pair] = (leafMismatchPairs[pair] ?? 0) + 1;
  if (examples.length < 10) examples.push({ ts: `${r.action}@${r.leaf.id}`, py: `${row.py_action}@${row.py_leaf}`,
    mech: row.evidence.mechanism_class, gcs: [row.evidence.gcs_e, row.evidence.gcs_v, row.evidence.gcs_m] });
}

const pct = (x: number) => `${((100 * x) / n).toFixed(3)}%`;
console.log(`\nKYROBENCH CROSS-PLANE PARITY  (bundle: ${data.bundle})`);
console.log(`cases compared: ${n}   (gather-triggered/errored: ${asked})`);
console.log(`  ACTION agreement (TS == Python):       ${actionAgree}/${n} = ${pct(actionAgree)}`);
console.log(`  LEAF agreement   (same terminal node): ${leafAgree}/${n} = ${pct(leafAgree)}`);
console.log(`  ACTION AND LEAF identical:             ${both}/${n} = ${pct(both)}`);
console.log(`  leaf-mismatches where ACTION ALSO differs: ${leafMismatchActionDiffers}  (clinically-divergent count)`);
console.log(`  leaf-mismatch by action:`, JSON.stringify(leafMismatchByAction));
console.log(`  top leaf-mismatch pairs (py->ts):`, JSON.stringify(Object.fromEntries(
  Object.entries(leafMismatchPairs).sort((a, b) => b[1] - a[1]).slice(0, 8))));
const out = { kyrobench_cross_plane: { n, actionAgree, leafAgree, both, asked,
  leafMismatchActionDiffers, leafMismatchByAction, leafMismatchPairs, examples } };
const { writeFileSync } = await import('node:fs');
writeFileSync('../../_kyrobench/out/cross_plane.json', JSON.stringify(out, null, 2));
ndb.close();
console.log(`\n${JSON.stringify(out.kyrobench_cross_plane)}`);
process.exit(0);
