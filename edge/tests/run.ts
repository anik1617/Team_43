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
import { expandGraph, communitiesOf, computeCoverage, retrieve, type Knn, type Embed, type RetrievedChunk } from '../e2/retrieval.ts';
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

// ---------- NEGATIVE / EDGE SAFETY GUARDS: lock the 4 doc-22 tagged traps + both irreducible stops ----------
// Trap-guards (PATCH no-platelets, hypotension-first, mannitol-withheld) are INTERMEDIATE nodes, so we
// assert on the TRACE, not just the leaf. Expected leaves/traces are PROBED against the live spine, never
// guessed (see tests/_probe.ts). A regression here = a safety guard silently dropped.
{
  const run = async (seed: Env) => execute(spine, noAsk, l3, { seed });
  const has = (r: { trace: string[] }, node: string) => r.trace.includes(node);

  // C14 — antiplatelet ICH: the PATCH harm-trap (L16Bb) MUST fire (no platelet transfusion).
  const c14 = await run({ ...HM, anticoag_antiplatelet: 'antiplatelet' });
  check('TRAP C14 antiplatelet → PATCH no-platelets guard (L16Bb) on path', has(c14, 'L16Bb'));
  check('TRAP C14 → still GUIDE but operate funnels to N40 abstain', c14.action === 'GUIDE' && gate(c14, COVERED).drillSiteAbstain?.node === 'N40');

  // B6 — warfarin: reverse-coagulopathy leaf (L16Ba) on path; routes to grounded transfer.
  const b6 = await run({ ...HM, anticoag_antiplatelet: 'warfarin', lucid_interval: 'no', focal_weakness_side: 'none', gcs_e: 4, gcs_v: 5, gcs_m: 6 });
  check('TRAP B6 warfarin → reverse-coagulopathy guard (L16Ba) on path', has(b6, 'L16Ba'));
  check('TRAP B6 → STABILIZE_TRANSFER, expert handoff', b6.action === 'STABILIZE_TRANSFER' && gate(b6, COVERED).requiresExpertHandoff);

  // D1 — hypotension trap: resuscitate FIRST (L11a) and mannitol WITHHELD while hypotensive (L14b).
  const d1 = await run({ ...HM, sbp_mmhg: 80 });
  check('TRAP D1 hypotension → resuscitate-first (L11a) on path', has(d1, 'L11a'));
  check('TRAP D1 hypotension → mannitol withheld (L14b) on path, NOT L14a', has(d1, 'L14b') && !has(d1, 'L14a'));

  // C6 — penetrating/GSW: MUST bypass the entire EDH operate gate (never N16B/N20/N21/N40 → never blind-drill).
  const c6 = await run({ ...HM, mechanism: 'gsw', mechanism_class: 'penetrating' });
  check('TRAP C6 GSW → bypasses EDH operate gate (no N20/N21/N40/N16B)',
    c6.action === 'STABILIZE_TRANSFER' && !has(c6, 'N20') && !has(c6, 'N21') && !has(c6, 'N40') && !has(c6, 'N16B'));

  // N97 — bilateral fixed pupils + coma: irreducible 🔴 (futility-aware), never blind-drills.
  const n97 = await run({ ...HM, pupil_react_r: 'fixed' });
  const gn97 = gate(n97, COVERED);
  check('IRREDUCIBLE N97 bilateral-fixed → 🔴 ABSTAIN_STOP, irreducible, not cleared',
    n97.leaf.id === 'N97' && gn97.badge === 'RED' && gn97.irreducibleStop && !gn97.cleared);

  // N99 — SBP out of physiologic range: invalid-input irreducible 🔴.
  const n99 = await run({ ...HM, sbp_mmhg: 350 });
  const gn99 = gate(n99, COVERED);
  check('IRREDUCIBLE N99 SBP-out-of-range → 🔴 ABSTAIN_STOP, irreducible', n99.leaf.id === 'N99' && gn99.badge === 'RED' && gn99.irreducibleStop);

  // B-stable — mild/stable: OBSERVE 🟢, with mannitol NOT given (L14c) and NO hyperventilation (L16Hb).
  const obs = await run({ ...HM, gcs_e: 4, gcs_v: 5, gcs_m: 6, pupil_react_l: 'brisk', pupil_size_l_mm: 3, lucid_interval: 'no', focal_weakness_side: 'none', posturing: 'none' });
  check('STABLE → OBSERVE@L23, no mannitol (L14c) + no hyperventilation (L16Hb)',
    obs.action === 'OBSERVE' && obs.leaf.id === 'L23' && has(obs, 'L14c') && has(obs, 'L16Hb'));

  // Transfer-feasible herniation: abstain LOCAL op, transfer instead (L21a STABILIZE_TRANSFER, not GUIDE).
  const tf = await run({ ...HM, transfer_feasible_within_window: 'yes' });
  check('Herniation + transfer feasible → L21a STABILIZE_TRANSFER (abstain local op)', tf.action === 'STABILIZE_TRANSFER' && tf.leaf.id === 'L21a');
}

// ---------- E2: retrieval mechanics (pure graph + coverage) + the L1↔L2 loop closure ----------
// vec-NN is injected (op-sqlite vec0 on device); here it's a deterministic stub, so we test the
// graph expansion / trust ordering / coverage logic — and that REAL coverage drives E4's badge.
{
  const opShimRet = { executeSync: (sql: string) => ({ rows: { _array: ndb.prepare(sql).all() } }) };

  // graph expansion over the real mock graph: seed n_edh, 1 hop → n_lucid + n_herniation, cite ch01.
  const exp1 = expandGraph(opShimRet, ['n_edh'], 1);
  check('E2 expand n_edh 1-hop → reaches n_lucid + n_herniation',
    exp1.nodes.includes('n_lucid') && exp1.nodes.includes('n_herniation') && exp1.chunkIds.includes('ch01'));
  const exp2 = expandGraph(opShimRet, ['n_edh'], 2);
  check('E2 expand 2-hop → reaches n_gcs/n_anisocoria via n_herniation', exp2.nodes.includes('n_gcs') && exp2.chunkIds.includes('ch04'));
  check('E2 communitiesOf → c_edh_core', communitiesOf(opShimRet, exp1.nodes).includes('c_edh_core'));

  // coverage thresholding (pure): tier-0 above threshold = covered; tier-1-only or sub-threshold = not.
  const o = { kChunks: 6, kNodes: 4, hops: 1, groundingThreshold: 0.30, maxTrustTier: 0 };
  const mk = (tier: number, score: number): RetrievedChunk => ({ id: 'x', kind: 'text_unit', text: 't', source_citation: 'WFNS Peshawar 2019', trust_tier: tier, score, via: 'vector' });
  check('E2 coverage: tier-0 above threshold → covered', computeCoverage('Peshawar', [mk(0, 0.9)], o).covered === true);
  check('E2 coverage: tier-1 only (maxTrustTier 0) → NOT covered', computeCoverage('Peshawar', [mk(1, 0.9)], o).covered === false);
  check('E2 coverage: tier-0 sub-threshold → NOT covered', computeCoverage('Peshawar', [mk(0, 0.1)], o).covered === false);

  // full retrieve() with stubbed knn → the loop closure: retrieval coverage feeds E4's badge.
  const embed: Embed = () => new Float32Array(1024);
  const groundingKnn: Knn = (table) => table === 'chunk_vec' ? [{ id: 'ch01', score: 0.9 }] : [{ id: 'n_edh', score: 0.8 }];
  const emptyKnn: Knn = () => [];

  const covered = retrieve(opShimRet, 'herniating EDH, blown left pupil', 'Peshawar Sec D', embed, groundingKnn);
  check('E2 retrieve (grounding) → covered, cites a tier-0 source', covered.coverage.covered && covered.coverage.topTrustTier === 0);
  const uncovered = retrieve(opShimRet, 'herniating EDH', 'Peshawar Sec D', embed, emptyKnn);
  check('E2 retrieve (no hits) → not covered', uncovered.coverage.covered === false);

  // LOOP CLOSURE: HM's GUIDE leaf + REAL retrieval coverage → E4 badge (not a hand-passed boolean).
  const hmGreen = gate(results['HM herniating EDH'], covered.coverage);
  check('E2→E4 loop: grounded coverage → 🟢 GUIDE', hmGreen.badge === 'GREEN' && hmGreen.cleared);
  const hmDegrade = gate(results['HM herniating EDH'], uncovered.coverage);
  check('E2→E4 loop: ungrounded coverage → 🟡 degrade-to-transfer', hmDegrade.badge === 'YELLOW' && hmDegrade.degradeToTransfer);
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
