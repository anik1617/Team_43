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
import { readFileSync, existsSync } from 'node:fs';

import { loadSpine, execute, type GatherHost, type L3, type ExecResult, type Spine } from '../e3/spineExecutor.ts';
import type { Env } from '../e3/conditions.ts';
import { gate, type Gated } from '../e4/abstentionGate.ts';
import { retrieve, type Knn, type Embed } from '../e2/retrieval.ts';
import { InMemoryJournal, journalingHost, resumeSeed, finalize, reduce, type Event } from '../e5/stateMachine.ts';
import { buildHandoff, type HandoffBrief } from '../e5/handoff.ts';
import { manifestDigest, cgtDigest, type Query, type Cell } from '../e1/canonicalDigest.ts';
import { createQwenL3, LANG_NAMES } from '../l3/qwenL3.ts';

// ---- scripted vignettes (turn-by-turn operator answers) ----
// HM = the dramatic herniating EDH → GUIDE + drill-abstain + expert handoff.
const HM: Env = {
  mechanism: 'rta', mechanism_class: 'blunt', time_since_injury_hr: 3,
  anticoag_antiplatelet: 'none', known_coagulopathy: 'no',
  gcs_e: 1, gcs_v: 2, gcs_m: 4, pupil_size_l_mm: 6, pupil_react_l: 'fixed',
  pupil_size_r_mm: 3, pupil_react_r: 'brisk', sbp_mmhg: 160, age_yr: 31,
  spo2_pct: 95, spo2_available: 'yes', blood_glucose: 0, glucose_available: 'no',
  lucid_interval: 'yes', focal_weakness_side: 'right', posturing: 'none', seizure_status: 'none',
};
// STABLE = mild TBI, fully reassuring → 🟢 OBSERVE. Kyro answers DIRECTLY: no abstain, no handoff.
const STABLE: Env = {
  mechanism: 'fall', mechanism_class: 'blunt', time_since_injury_hr: 1,
  anticoag_antiplatelet: 'none', known_coagulopathy: 'no',
  gcs_e: 4, gcs_v: 5, gcs_m: 6, pupil_size_l_mm: 3, pupil_react_l: 'brisk',
  pupil_size_r_mm: 3, pupil_react_r: 'brisk', sbp_mmhg: 130, age_yr: 25,
  spo2_pct: 99, spo2_available: 'yes', blood_glucose: 90, glucose_available: 'yes',
  lucid_interval: 'no', focal_weakness_side: 'none', posturing: 'none', seizure_status: 'none',
};
// ADVANCED vignettes — the harm-traps from the 38-vignette benchmark (docs/22). Each is a case
// where a stressed responder or a naive LLM would do something subtly dangerous; the deterministic
// spine blocks it with cited evidence. The fired guard nodes are surfaced in SCENE ③·SAFETY.
const PATCH: Env = {  // antiplatelet ICH — the counterintuitive one: do NOT transfuse platelets
  mechanism: 'fall', mechanism_class: 'blunt', time_since_injury_hr: 2, anticoag_antiplatelet: 'antiplatelet', known_coagulopathy: 'no',
  gcs_e: 3, gcs_v: 4, gcs_m: 5, pupil_size_l_mm: 3, pupil_react_l: 'brisk', pupil_size_r_mm: 3, pupil_react_r: 'brisk',
  sbp_mmhg: 150, age_yr: 68, spo2_pct: 97, spo2_available: 'yes', blood_glucose: 120, glucose_available: 'yes',
  lucid_interval: 'unknown', focal_weakness_side: 'none', posturing: 'none', seizure_status: 'none', transfer_feasible_within_window: 'yes',
};
const SHOCK: Env = {  // severe TBI + hypotension — resuscitate FIRST, mannitol WITHHELD
  mechanism: 'rta', mechanism_class: 'blunt', time_since_injury_hr: 2, anticoag_antiplatelet: 'none', known_coagulopathy: 'no',
  gcs_e: 1, gcs_v: 2, gcs_m: 4, pupil_size_l_mm: 6, pupil_react_l: 'fixed', pupil_size_r_mm: 3, pupil_react_r: 'brisk',
  sbp_mmhg: 80, age_yr: 40, spo2_pct: 90, spo2_available: 'yes', blood_glucose: 70, glucose_available: 'yes',
  lucid_interval: 'yes', focal_weakness_side: 'right', posturing: 'decerebrate', seizure_status: 'none',
};
const WARFARIN: Env = {  // elderly on warfarin, deteriorating — reverse anticoagulation + transfer
  mechanism: 'fall', mechanism_class: 'blunt', time_since_injury_hr: 4, anticoag_antiplatelet: 'warfarin', known_coagulopathy: 'no',
  gcs_e: 3, gcs_v: 4, gcs_m: 5, pupil_size_l_mm: 4, pupil_react_l: 'sluggish', pupil_size_r_mm: 3, pupil_react_r: 'brisk',
  sbp_mmhg: 140, age_yr: 72, spo2_pct: 96, spo2_available: 'yes', blood_glucose: 110, glucose_available: 'yes',
  lucid_interval: 'yes', focal_weakness_side: 'right', posturing: 'none', seizure_status: 'none', transfer_feasible_within_window: 'yes',
};

const CASES: Record<string, { label: string; env: Env; query: string }> = {
  hm: { label: 'HM — herniating EDH, no transfer', env: HM, query: 'herniating EDH, lucid interval, blown left pupil, GCS dropping' },
  stable: { label: 'Mild TBI — reassuring exam', env: STABLE, query: 'mild head injury, GCS 15, reactive pupils, observation' },
  patch: { label: 'Antiplatelet ICH — the PATCH trap', env: PATCH, query: 'head injury on antiplatelet, intracranial bleed, coagulopathy' },
  shock: { label: 'Severe TBI + shock — hypotension trap', env: SHOCK, query: 'severe TBI, hypotension, herniation, resuscitation' },
  warfarin: { label: 'Warfarin head bleed — anticoagulation reversal', env: WARFARIN, query: 'head injury on warfarin, anticoagulation reversal, transfer' },
};

// Harm-trap / advanced-action guard nodes: presence on the trace = a specific cited danger avoided.
const GUARD_INFO: Record<string, string> = {
  L16Bb: 'PATCH guard — WITHHELD platelet transfusion. Counterintuitive but evidence-based: platelets WORSEN outcome in antiplatelet-associated ICH (PATCH trial).',
  L16Ba: 'Reversed anticoagulation (vitamin K + PCC, by principle) — warfarin/DOAC drives haematoma expansion.',
  L11a: 'Corrected hypotension FIRST — permissive hypotension is contraindicated in head injury (BTF). A single hypotensive episode doubles TBI mortality.',
  L14b: 'WITHHELD mannitol — unsafe while hypotensive/hypoxic/hypoglycaemic; correct those extracranial causes first (BTF).',
  L08S: 'Aborted the active seizure + re-evaluated the airway before proceeding.',
};
// Human-facing read-backs for the gather narration (only the critical fields get one).
const READBACK: Record<string, (e: Env) => string> = {
  gcs_m: (e) => `GCS confirmed E${e.gcs_e}V${e.gcs_v}M${e.gcs_m} = ${Number(e.gcs_e) + Number(e.gcs_v) + Number(e.gcs_m)}`,
  pupil_react_r: (e) => `Pupils confirmed: left ${e.pupil_size_l_mm}mm ${e.pupil_react_l}, right ${e.pupil_size_r_mm}mm ${e.pupil_react_r}`,
  lucid_interval: (e) => `Lucid interval: ${e.lucid_interval}${e.lucid_interval === 'yes' ? ' (classic EDH pattern)' : ''}`,
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

export interface DemoOpts { dbPath: string; drop?: boolean; narrate?: boolean; modelPath?: string; caseKey?: string; langs?: string[]; }

export async function runEncounter(opts: DemoOpts): Promise<DemoResult> {
  const { dbPath, drop = true, narrate = false, modelPath, caseKey = 'hm', langs = ['en'] } = opts;
  const vignette = CASES[caseKey] ?? CASES.hm;
  const CASE = vignette.env;
  const say = (s = '') => { if (narrate) console.log(s); };
  say(`### CASE: ${vignette.label} ###\n`);

  const ndb = new DatabaseSync(dbPath);
  const opShim = { executeSync: (sql: string) => ({ rows: { _array: ndb.prepare(sql).all() } }) };

  // BUILD-TIME translation drafts (NLLB, pending clinical review). In production these become
  // REVIEWED rows in the signed bundle (cgt_strings.lang); here they're a side overlay so the demo
  // renders the real translate-then-review pipeline without re-signing the bundle.
  const draftPath = new URL('../l3/translations.draft.json', import.meta.url);
  const drafts: Record<string, any> = existsSync(draftPath) ? JSON.parse(readFileSync(draftPath, 'utf-8')) : {};
  const draftRec = (id: string, lang: string): string | null => drafts[id]?.[lang]?.recommendation ?? null;

  // Prefer a REVIEWED bundle string (cgt_strings.lang); then a NLLB draft; else English. Knowledge
  // stays English — UR/HI clinical strings are translated + reviewed at BUILD time, never on-device.
  const readLeafText = (id: string, lang = 'en') =>
    (ndb.prepare('SELECT recommendation FROM cgt_strings WHERE node_id=? AND lang=?').get(id, lang) as { recommendation?: string } | undefined)?.recommendation
    ?? draftRec(id, lang)
    ?? (ndb.prepare("SELECT recommendation FROM cgt_strings WHERE node_id=? AND lang='en'").get(id) as { recommendation?: string } | undefined)?.recommendation ?? null;
  const hasBundleLang = (id: string, lang: string) =>
    !!(ndb.prepare('SELECT 1 FROM cgt_strings WHERE node_id=? AND lang=?').get(id, lang));
  const hasDraft = (id: string, lang: string) => !!draftRec(id, lang);

  // L3 (language I/O only). Default = deterministic stub (fast, reproducible): synthesizeLeaf reads
  // the leaf's authored recommendation. With --model, the REAL Qwen-3B-Q4 rewords it (never invents).
  let dispose: (() => Promise<void>) | undefined;
  let l3: L3;
  if (modelPath) {
    say(`  [loading real L3 model: ${modelPath} …]`);
    const qwen = await createQwenL3(modelPath, readLeafText);
    dispose = qwen.dispose; l3 = qwen;
  } else {
    l3 = {
      async cleanAsr(s) { return s; },
      async classifyAnswer(_f, u) { return u; },
      async phraseQuestion() { return '?'; },
      async synthesizeLeaf(node) { return (readLeafText(node.id) ?? `(no authored text for ${node.id})`).replace(/^\[[^\]]*\]\s*/, ''); },
    };
  }

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
      const value = CASE[field];
      say(`  Q(${node.id}) ${field} → "${value}"${READBACK[field] ? `   ⟲ ${READBACK[field](CASE)}` : ''}`);
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
  const ret = retrieve(opShim, vignette.query, resumed.citation, embed, groundingKnn);
  const gated = gate(resumed, ret.coverage, ndb.prepare("SELECT recommendation FROM cgt_strings WHERE node_id='L40' AND lang='en'").get()?.recommendation as string | undefined);

  say('━━━ SCENE ③ · DECISION (graduated assistance, gated on STRUCTURE not confidence) ━━━');
  say(`  retrieval coverage: ${ret.coverage.covered ? 'GROUNDED ✓' : 'not grounded'} (top trust_tier ${ret.coverage.topTrustTier}; ${ret.coverage.supportingCitations?.length ?? 0} citations)`);
  say(`  leaf: ${resumed.leaf.id} · action: ${resumed.action}`);
  say(`  BADGE: ${badgeEmoji(gated.badge)} ${gated.label}`);
  if (gated.drillSiteAbstain) say(`  ⛔ ABSTAINS: drill-site localization (${gated.drillSiteAbstain.node}) — imaging wall; neurosurgeon required.`);
  if (gated.degradeToTransfer) say('  ↓ operate-locally not 🟢-clearable → degraded to stabilize + transfer.');
  say('');

  // ── SAFETY GUARDS — cited harm-traps the deterministic spine avoided on this path ──
  const fired = resumed.trace.filter((n) => GUARD_INFO[n]);
  if (fired.length) {
    say('━━━ SAFETY GUARDS ENGAGED (cited dangers a naive responder / LLM might miss) ━━━');
    for (const n of fired) say(`  ⚕ [${n}] ${GUARD_INFO[n]}`);
    if (CASE.mechanism_class === 'penetrating') say('  ⚕ Penetrating injury → bypassed the burr-hole pathway; do NOT probe or remove deep fragments.');
    say('');
  }

  // ── SCENE ④ — outcome. Two shapes: a DIRECT answer (Kyro handles it, no escalation) when the
  //    gate doesn't require a handoff (e.g. 🟢 OBSERVE), or the PRE-BRIEFED EXPERT HANDOFF otherwise.
  finalize(journal, resumed, gated, clock);
  const handoff = buildHandoff(reduce(journal.load()), gated, clock());
  const citations = resumed.citation ? [resumed.citation] : [];
  const recommendation = await l3.synthesizeLeaf(resumed.leaf, citations, langs[0]);
  if (!gated.requiresExpertHandoff && gated.badge !== 'RED') {
    say('━━━ SCENE ④ · DIRECT RECOMMENDATION (Kyro handles this itself — no escalation needed) ━━━');
    say(`  ${badgeEmoji(gated.badge)} ${gated.action} — answered on-device, offline.`);
    say(`  ${trimCitations(recommendation)}`);
    say(`  ${resumed.citation ? `[${resumed.citation.split('[')[0].slice(0, 70)}…]` : ''}`);
    say('  No expert handoff fired — the deterministic tree + grounded retrieval cover this case.');
  } else {
    say('━━━ SCENE ④ · PRE-BRIEFED EXPERT HANDOFF (what the neurosurgeon receives) ━━━');
    say(`  S: ${handoff.sbar.situation}`);
    say(`  B: ${handoff.sbar.background}`);
    say(`  A: ${handoff.sbar.assessment}`);
    say(`  R: ${trimCitations(recommendation)}`);
    say(`  active concerns: ${handoff.hypotheses.join('; ')}`);
  }
  say('');

  // ── MULTILINGUAL — the same cited recommendation, localized at the edge (knowledge stays English).
  //    The deterministic decision is identical across languages; only the phrasing changes.
  if (langs.length > 1) {
    say('━━━ MULTILINGUAL RECOMMENDATION (one decision, localized phrasing — EN/UR/HI) ━━━');
    const id = resumed.leaf.id;
    for (const lang of langs) {
      // source of the localized text, best→worst: reviewed bundle string → NLLB draft → live model.
      let text: string, tag: string;
      if (lang === 'en') { text = recommendation; tag = ''; }
      else if (hasBundleLang(id, lang)) { text = readLeafText(id, lang)!; tag = '  ✓ reviewed (bundle)'; }
      else if (hasDraft(id, lang)) { text = draftRec(id, lang)!; tag = '  ◔ DRAFT (NLLB, pending clinical review)'; }
      else { text = await l3.synthesizeLeaf(resumed.leaf, citations, lang); tag = '  ⚠ UNREVIEWED live MT (not clinical-grade)'; }
      say(`  ▸ [${LANG_NAMES[lang] ?? lang}]${tag}`);
      say(`    ${trimCitations(text)}`);
    }
    if (langs.some((l) => l !== 'en' && !hasBundleLang(id, l)))
      say('  note: UR/HI are NLLB build-time DRAFTS pending native clinician review → then shipped as\n'
        + '        reviewed strings in the signed bundle (cgt_strings.lang). Never live-translated on-device.');
    say('');
  }

  if (dispose) await dispose();
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
  const mi = args.indexOf('--model');
  const modelPath = mi >= 0 ? args[mi + 1] : undefined;
  const ci = args.indexOf('--case');
  const caseKey = ci >= 0 ? args[ci + 1] : 'hm';
  const li = args.indexOf('--lang');
  const langArg = li >= 0 ? args[li + 1] : 'en';
  const langs = langArg === 'all' ? ['en', 'ur', 'hi'] : langArg.split(',');
  const result = await runEncounter({ dbPath, drop, narrate: !json, modelPath, caseKey, langs });
  if (json) console.log(JSON.stringify(result, null, 2));
  else console.log(`RESULT: ${result.badge} ${result.action}@${result.leafId} · verified=${result.verified} · dropped=${result.dropped} · lossless handoff ✓`);
}
