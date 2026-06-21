/**
 * EDGE TEST RUNNER — exercises the REAL shipping TypeScript (not the Python oracles).
 *
 * The Python conformance harnesses (e3/e4/e5 conformance.py) prove the LOGIC; this proves the
 * actual .ts implements that logic — catching typos, bad imports, type-stripping breakage, and
 * any drift between the Python twin and the shipping code. Loads the real signed mock bundle and
 * drives loadSpine / execute / derive / gate / reduce / resumeSeed / buildHandoff / the canonical
 * digests directly.
 *
 * Run:  node --experimental-sqlite --experimental-strip-types edge/tests/run.ts
 *       (or: npm --prefix edge test)
 */

import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

import { loadSpine, execute, type GatherHost, type L3, type Spine } from '../e3/spineExecutor.ts';
import type { Env } from '../e3/conditions.ts';
import { gate, type Coverage } from '../e4/abstentionGate.ts';
import { InMemoryJournal, journalingHost, resumeSeed, finalize, reduce, type Event } from '../e5/stateMachine.ts';
import { buildHandoff } from '../e5/handoff.ts';
import { manifestDigest, cgtDigest, type Query, type Cell } from '../e1/canonicalDigest.ts';

// ---------- harness ----------
let passed = 0, failed = 0;
function check(name: string, cond: boolean, detail = '') {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${detail && !cond ? `  — ${detail}` : ''}`);
  cond ? passed++ : failed++;
}

const DB = process.argv[2] ?? 'cloud/bundles/edh-core-v0-mock.kyro';
const ndb = new DatabaseSync(DB);
// Shim that satisfies op-sqlite's executeSync shape so the REAL loadSpine runs unmodified.
const opShim = { executeSync: (sql: string) => ({ rows: { _array: ndb.prepare(sql).all() } }) };

// ---------- test seeds (identical to the Python oracles) ----------
const HM: Env = {
  mechanism: 'rta', mechanism_class: 'blunt', time_since_injury_hr: 3,
  gcs_e: 1, gcs_v: 2, gcs_m: 4, pupil_size_l_mm: 6, pupil_react_l: 'fixed',
  pupil_size_r_mm: 3, pupil_react_r: 'brisk', sbp_mmhg: 160, age_yr: 31,
  spo2_pct: 95, spo2_available: 'yes', blood_glucose: 0, glucose_available: 'no',
  lucid_interval: 'yes', focal_weakness_side: 'right', posturing: 'none', seizure_status: 'none',
  anticoag_antiplatelet: 'none', known_coagulopathy: 'no',
};
const PEDS: Env = { ...HM, age_yr: 10 };
const INVALID: Env = { ...HM, gcs_e: 7 };

// host that must never be asked (all fields seeded); L3 stub words the leaf.
const noAsk: GatherHost = { async ask(f) { throw new Error(`unexpected ask for ${f}`); } };
const l3: L3 = {
  async cleanAsr(s) { return s; },
  async classifyAnswer(_f, u) { return u; },
  async phraseQuestion() { return '?'; },
  async synthesizeLeaf(node) { return `[stub leaf ${node.id}]`; },
};

const spine: Spine = loadSpine(opShim);
check('E1/E3 loadSpine: real spine loaded from bundle', spine.nodes.size > 0 && spine.edges.length > 0,
  `nodes=${spine.nodes.size} edges=${spine.edges.length}`);

// ---------- E3: real executor reaches the right leaf ----------
const COVERED: Coverage = { covered: true };
const UNCOVERED: Coverage = { covered: false };

const cases: Array<[string, Env, string, string]> = [
  ['HM herniating EDH', HM, 'GUIDE', 'L21c'],
  ['Pediatric (age<15)', PEDS, 'STABILIZE_TRANSFER', 'N98'],
  ['Invalid GCS', INVALID, 'ABSTAIN_STOP', 'N99'],
];

const results: Record<string, Awaited<ReturnType<typeof execute>>> = {};
for (const [name, seed, action, leaf] of cases) {
  const r = await execute(spine, noAsk, l3, { seed });
  results[name] = r;
  check(`E3 ${name} → ${action}@${leaf}`, r.action === action && r.leaf.id === leaf, `got ${r.action}@${r.leaf.id}`);
}

// ---------- E4: real gate badges ----------
const g = (name: string, cov: Coverage) => gate(results[name], cov);
{
  const hm = g('HM herniating EDH', COVERED);
  check('E4 HM (covered) → 🟢 GUIDE + N40 drill rider', hm.badge === 'GREEN' && hm.drillSiteAbstain?.node === 'N40' && hm.cleared);
  const hmU = g('HM herniating EDH', UNCOVERED);
  check('E4 HM (uncovered) → 🟡, degrade-to-transfer, not cleared', hmU.badge === 'YELLOW' && hmU.degradeToTransfer && !hmU.cleared);
  const peds = g('Pediatric (age<15)', COVERED);
  check('E4 peds → 🟡 STABILIZE_TRANSFER (tier-2 forces 🟡)', peds.badge === 'YELLOW' && peds.action === 'STABILIZE_TRANSFER' && peds.drillSiteAbstain === null);
  const inv = g('Invalid GCS', COVERED);
  check('E4 invalid → 🔴 irreducible, not cleared', inv.badge === 'RED' && inv.irreducibleStop && !inv.cleared);
}

// ---------- E5: real journal → drop → resume → same leaf → handoff ----------
{
  const clock = (() => { let t = 0; return () => ++t; })();
  const journal = new InMemoryJournal();
  journal.append({ t: 'started', ts: clock(), encounterId: 'ENC-HM-001', lang: 'en' });

  // Capture fields live through the REAL journalingHost (scripted answers from HM).
  const scripted: GatherHost = { async ask(f) { return HM[f]; } };
  const recHost = journalingHost(scripted, journal, clock);
  // Drive a real gather: execute with NO seed → host.ask fires per field → each is journaled.
  const full = await execute(spine, recHost, l3, {});
  check('E5 live gather reached GUIDE@L21c', full.action === 'GUIDE' && full.leaf.id === 'L21c');

  // ---- DROP mid-encounter: keep only events up to & incl. the right-pupil capture ----
  const all = journal.load();
  const dropIdx = all.findIndex((e) => e.t === 'evidence' && e.field === 'pupil_react_r');
  const truncated: Event[] = all.slice(0, dropIdx + 1);
  const seed = resumeSeed(truncated);
  check('E5 pre-drop evidence survived (left pupil fixed in journal)', seed.pupil_react_l === 'fixed' && 'pupil_react_r' in seed);

  // ---- RECONNECT: resume the REAL executor from the journaled seed (rest re-asked) ----
  const resumed = await execute(spine, scripted, l3, { seed });
  check('E5 resume reached SAME leaf as uninterrupted run', resumed.action === full.action && resumed.leaf.id === full.leaf.id,
    `got ${resumed.action}@${resumed.leaf.id}`);

  // ---- finalize + handoff from the REAL builders ----
  const gated = gate(resumed, COVERED);
  finalize(journal, resumed, gated, clock);
  const brief = buildHandoff(reduce(journal.load()), gated, clock());
  check('E5 handoff SBAR names GCS 7', brief.sbar.situation.includes('GCS 7 '));
  check('E5 handoff names left fixed pupil', brief.evidence.pupils.includes('L 6mm/fixed'));
  check('E5 handoff ABSTAINS at N40', brief.abstaining != null && brief.abstaining.includes('N40'));
  check('E5 handoff badge GREEN + hypotheses non-empty', brief.badge === 'GREEN' && brief.hypotheses.length > 0);
}

// ---------- E1 digest parity (real canonicalDigest vs cloud golden hexes) ----------
{
  const GOLDEN = {
    manifest: 'b61dfaf35b02e43a7d02e9648d6b9ac562e67e7c3103f863f5028a0e9ca8d8a3',
    cgt: 'd3dcdecbee5df4b01fa1a07c298b7e929d432dfa964cf5a6f16ddbfa8707f154',
  };
  // node:sqlite can't read vec0 → read the id-lists from the proven-equal base tables (see parity.ts).
  const subst: Record<string, string> = {
    'SELECT chunk_id FROM chunk_vec': 'SELECT id FROM chunks',
    'SELECT node_id FROM node_vec': 'SELECT id FROM nodes',
  };
  const q: Query = (sql) => ndb.prepare(subst[sql] ?? sql).all().map((r) => Object.values(r as Record<string, unknown>) as Cell[]);
  const sha256 = (b: Uint8Array): Uint8Array => new Uint8Array(createHash('sha256').update(b).digest());
  check('E1 manifest digest == cloud golden', Buffer.from(manifestDigest(q, sha256)).toString('hex') === GOLDEN.manifest);
  check('E1 cgt digest == cloud golden', Buffer.from(cgtDigest(q, sha256)).toString('hex') === GOLDEN.cgt);
}

ndb.close();
console.log(`\nRESULT: ${failed === 0 ? 'ALL PASS' : 'FAILURES'} (${passed} passed, ${failed} failed)`);
process.exit(failed === 0 ? 0 : 1);
