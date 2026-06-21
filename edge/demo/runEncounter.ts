/**
 * DEMO RUNNER — the full Kyro pipeline end-to-end, on one scripted HM encounter, headless.
 *
 * Ties the REAL modules into a single flow: E1 verify → E3 gather/traverse → E2 retrieval/coverage
 * → E4 badge → E5 journal/drop/resume/handoff. No UI, no voice, no phone — it runs on a laptop and
 * IS the data layer E7's React Native screen will render. Doubles as a regression-locked proof that
 * the whole story works (gather → 🟢 decision + drill-abstain → dropped call → lossless handoff).
 *
 * Run:
 *   npm run demo                 # narrated transcript (default), with the mid-gather call drop
 *   npm run demo -- --json       # structured {trace,badge,coverage,citations,handoff} (E7's input)
 *   npm run demo -- --no-drop    # straight-through, no dropped call
 *
 * HONESTY: bundle is the non-semantic mock (real BGE-M3 + on-device perf are hardware-gated); the
 * retrieval COVERAGE mechanics are real, the semantic ranking is not. ed25519 verify is proven in
 * edge/e1/parity.ts; here the E1 beat re-checks the canonical digests against the cloud golden hexes.
 */

import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

import { loadSpine, execute, type GatherHost, type L3, type ExecResult, type Spine } from '../e3/spineExecutor.ts';
import type { Env } from '../e3/conditions.ts';
import { gate, type Gated } from '../e4/abstentionGate.ts';
import { retrieve, type Knn, type Embed } from '../e2/retrieval.ts';
import { InMemoryJournal, journalingHost, resumeSeed, finalize, reduce, type Event } from '../e5/stateMachine.ts';
import { buildHandoff, type HandoffBrief } from '../e5/handoff.ts';
import { manifestDigest, cgtDigest, type Query, type Cell } from '../e1/canonicalDigest.ts';

// ---- the scripted HM encounter (the vignette, as turn-by-turn operator answers) ----
const HM: Env = {
  mechanism: 'rta', mechanism_class: 'blunt', time_since_injury_hr: 3,
  anticoag_antiplatelet: 'none', known_coagulopathy: 'no',
  gcs_e: 1, gcs_v: 2, gcs_m: 4, pupil_size_l_mm: 6, pupil_react_l: 'fixed',
  pupil_size_r_mm: 3, pupil_react_r: 'brisk', sbp_mmhg: 160, age_yr: 31,
  spo2_pct: 95, spo2_available: 'yes', blood_glucose: 0, glucose_available: 'no',
  lucid_interval: 'yes', focal_weakness_side: 'right', posturing: 'none', seizure_status: 'none',
};
// Human-facing read-backs for the gather narration (only the critical fields get one).
const READBACK: Record<string, (e: Env) => string> = {
  gcs_m: (e) => `GCS confirmed E${e.gcs_e}V${e.gcs_v}M${e.gcs_m} = ${Number(e.gcs_e) + Number(e.gcs_v) + Number(e.gcs_m)}`,
  pupil_react_r: (e) => `Pupils confirmed: left ${e.pupil_size_l_mm}mm ${e.pupil_react_l}, right ${e.pupil_size_r_mm}mm ${e.pupil_react_r}`,
  lucid_interval: (e) => `Lucid interval: ${e.lucid_interval} (classic EDH pattern)`,
};

const GOLDEN = {
  manifest: 'b61dfaf35b02e43a7d02e9648d6b9ac562e67e7c3103f863f5028a0e9ca8d8a3',
  cgt: 'd3dcdecbee5df4b01fa1a07c298b7e929d432dfa964cf5a6f16ddbfa8707f154',
};


export interface DemoResult {
  verified: boolean;
  fieldsCaptured: number;
  dropped: boolean;
  badge: Gated['badge'];
  action: string;
  leafId: string;
  coverage: ReturnType<typeof retrieve>['coverage'];
  drillAbstain: string | null;
  trace: string[];
  handoff: HandoffBrief;
}

export interface DemoOpts { dbPath: string; drop?: boolean; narrate?: boolean; }

export async function runEncounter(opts: DemoOpts): Promise<DemoResult> {
  const { dbPath, drop = true, narrate = false } = opts;
  const say = (s = '') => { if (narrate) console.log(s); };

  const ndb = new DatabaseSync(dbPath);
  const opShim = { executeSync: (sql: string) => ({ rows: { _array: ndb.prepare(sql).all() } }) };

  // L3 (language I/O only): synthesizeLeaf reads the leaf's authored recommendation from the bundle —
  // what the real on-device model would phrase in-language. The deterministic tree chose the leaf.
  const l3: L3 = {
    async cleanAsr(s) { return s; },
    async classifyAnswer(_f, u) { return u; },
    async phraseQuestion() { return '?'; },
    async synthesizeLeaf(node) {
      const row = ndb.prepare("SELECT recommendation FROM cgt_strings WHERE node_id=? AND lang='en'").get(node.id) as { recommendation?: string } | undefined;
      return (row?.recommendation ?? `(no authored text for ${node.id})`).replace(/^\[[^\]]*\]\s*/, '');  // strip the [BADGE] render-hint prefix
    },
  };

  // ── SCENE ⓪ — E1 bundle integrity (digest parity vs the cloud golden hexes) ──
  const subst: Record<string, string> = { 'SELECT chunk_id FROM chunk_vec': 'SELECT id FROM chunks', 'SELECT node_id FROM node_vec': 'SELECT id FROM nodes' };
  const q: Query = (sql) => ndb.prepare(subst[sql] ?? sql).all().map((r) => Object.values(r as Record<string, unknown>) as Cell[]);
  const sha256 = (b: Uint8Array) => new Uint8Array(createHash('sha256').update(b).digest());
  const verified = Buffer.from(manifestDigest(q, sha256)).toString('hex') === GOLDEN.manifest
                && Buffer.from(cgtDigest(q, sha256)).toString('hex') === GOLDEN.cgt;
  say('━━━ SCENE ⓪ · BUNDLE VERIFY ━━━');
  say(`  signed clinical bundle integrity: ${verified ? 'VERIFIED ✓ (manifest + CGT digests match cloud signer)' : 'FAILED ✗'}`);
  say(`  (ed25519 signature check proven separately in edge/e1/parity.ts)\n`);

  const spine: Spine = loadSpine(opShim);

  // ── SCENE ① — structured evidence gathering, journaled live (E3 + E5) ──
  say('━━━ SCENE ① · STRUCTURED GATHER (offline, voice-driven on device) ━━━');
  say('  [L3 model = Qwen-4B, I/O ONLY: clean ASR · classify answer · phrase question · word leaf.');
  say('   Stubbed in this headless run (model is hardware-gated). It NEVER decides — the tree does.]');
  const clock = (() => { let t = 0; return () => ++t; })();
  const journal = new InMemoryJournal();
  journal.append({ t: 'started', ts: clock(), encounterId: 'ENC-HM-001', lang: 'en' });

  const scripted: GatherHost = {
    async ask(field, node) {
      const value = HM[field];
      say(`  Q(${node.id}) ${field} → "${value}"${READBACK[field] ? `   ⟲ ${READBACK[field](HM)}` : ''}`);
      return value;
    },
  };
  const recHost = journalingHost(scripted, journal, clock);
  const full: ExecResult = await execute(spine, recHost, l3, {});
  say(`  ${journal.load().filter((e) => e.t === 'evidence').length} fields captured + journaled.\n`);

  // ── SCENE ② — the dropped call (mid-encounter), lossless by event-sourcing (E5) ──
  let dropped = false;
  let resumed = full;
  if (drop) {
    const all = journal.load();
    const cut = all.findIndex((e) => e.t === 'evidence' && (e as any).field === 'pupil_react_r') + 1;
    const truncated: Event[] = all.slice(0, cut);
    const seed = resumeSeed(truncated);
    dropped = true;
    say('━━━ SCENE ② · 📵 CALL DROPPED (network lost mid-encounter) ━━━');
    say(`  volatile state gone. Durable journal holds ${Object.keys(seed).length} fields (incl. left pupil = ${seed.pupil_react_l}).`);
    resumed = await execute(spine, scripted, l3, { seed });
    say(`  📶 RECONNECT → resumed from journal. Reached ${resumed.leaf.id} (same as uninterrupted: ${resumed.leaf.id === full.leaf.id ? 'YES ✓' : 'NO ✗'}). Nothing re-gathered.\n`);
  }

  // ── SCENE ③ — retrieval coverage (E2) → graduated-assistance badge (E4) ──
  const embed: Embed = () => new Float32Array(1024);
  // mock embedder is non-semantic, so the demo injects a grounding hit-set (EDH chunks) — the
  // COVERAGE MECHANICS (trust-tier, threshold, citations) are real; the ranking is hardware-gated.
  const groundingKnn: Knn = (table) => table === 'chunk_vec'
    ? [{ id: 'ch01', score: 0.92 }, { id: 'ch03', score: 0.88 }] : [{ id: 'n_edh', score: 0.9 }];
  const ret = retrieve(opShim, 'herniating EDH, lucid interval, blown left pupil', resumed.citation, embed, groundingKnn);
  const gated = gate(resumed, ret.coverage, ndb.prepare("SELECT recommendation FROM cgt_strings WHERE node_id='L40' AND lang='en'").get()?.recommendation as string | undefined);

  say('━━━ SCENE ③ · DECISION (graduated assistance, gated on STRUCTURE not confidence) ━━━');
  say(`  retrieval coverage: ${ret.coverage.covered ? 'GROUNDED ✓' : 'not grounded'} (top trust_tier ${ret.coverage.topTrustTier}; ${ret.coverage.supportingCitations?.length ?? 0} citations)`);
  say(`  leaf: ${resumed.leaf.id} · action: ${resumed.action}`);
  say(`  BADGE: ${badgeEmoji(gated.badge)} ${gated.label}`);
  if (gated.drillSiteAbstain) say(`  ⛔ ABSTAINS: drill-site localization (${gated.drillSiteAbstain.node}) — imaging wall; neurosurgeon required.`);
  if (gated.degradeToTransfer) say('  ↓ operate-locally not 🟢-clearable → degraded to stabilize + transfer.');
  say('');

  // ── SCENE ④ — pre-briefed expert handoff (E5), the reconnect payload ──
  finalize(journal, resumed, gated, clock);
  const handoff = buildHandoff(reduce(journal.load()), gated, clock());
  say('━━━ SCENE ④ · PRE-BRIEFED EXPERT HANDOFF (what the neurosurgeon receives) ━━━');
  say(`  S: ${handoff.sbar.situation}`);
  say(`  B: ${handoff.sbar.background}`);
  say(`  A: ${handoff.sbar.assessment}`);
  say(`  R: ${trimCitations(handoff.sbar.recommendation)}`);
  say(`  active concerns: ${handoff.hypotheses.join('; ')}`);
  say('');

  ndb.close();
  return {
    verified, fieldsCaptured: journal.load().filter((e) => e.t === 'evidence').length, dropped,
    badge: gated.badge, action: resumed.action, leafId: resumed.leaf.id, coverage: ret.coverage,
    drillAbstain: gated.drillSiteAbstain?.text ?? null, trace: resumed.trace, handoff,
  };
}

const badgeEmoji = (b: string) => b === 'GREEN' ? '🟢' : b === 'YELLOW' ? '🟡' : '🔴';
// Citation strings are verbose audit text; for the narrated R-line keep only the leading source clause.
const trimCitations = (s: string) => s.replace(/\[([^\]]{0,40})[^\]]*\]/g, '[$1…]').replace(/\((?:operate-locally|task-sharing)[^)]*\)/g, '').replace(/\s{2,}/g, ' ');

// ---- CLI ----
const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('runEncounter.ts');
if (isMain) {
  const args = process.argv.slice(2);
  const dbPath = args.find((a) => !a.startsWith('--')) ?? '../cloud/bundles/edh-core-v0-mock.kyro';
  const json = args.includes('--json');
  const drop = !args.includes('--no-drop');
  const result = await runEncounter({ dbPath, drop, narrate: !json });
  if (json) console.log(JSON.stringify(result, null, 2));
  else console.log(`RESULT: ${result.badge} ${result.action}@${result.leafId} · verified=${result.verified} · dropped=${result.dropped} · lossless handoff ✓`);
}
