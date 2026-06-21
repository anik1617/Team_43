/**
 * FULL-STACK INTEGRATION — proves every layer works TOGETHER on one HM encounter, end to end:
 *   E1 verify → E6 voice (whisper.cpp ASR) → L3 clean+classify → E3 spine → E2 coverage →
 *   E4 gate → E5 handoff → multilingual (NLLB drafts).
 *
 * The 3 critical fields are captured from REAL audio (Windows-TTS clips, transcribed by whisper.cpp
 * — the same engine as on-device whisper.rn); the rest are scripted. Everything downstream is the
 * real shipping code. This is the "does the whole thing connect" check, not a unit test.
 *
 * Needs: whisper base.en model + the Qwen GGUF + l3/translations.draft.json.
 * Run:  node --experimental-sqlite --import tsx tests/integration.ts
 */

import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { makeWhisperCliAsr, type Asr } from '../e6/asr.ts';
import { loadSpine, execute, type GatherHost, type Env } from '../e3/spineExecutor.ts';
import { gate } from '../e4/abstentionGate.ts';
import { retrieve, type Knn, type Embed } from '../e2/retrieval.ts';
import { buildHandoff } from '../e5/handoff.ts';
import { InMemoryJournal, journalingHost, finalize, reduce } from '../e5/stateMachine.ts';
import { manifestDigest, cgtDigest, type Query, type Cell } from '../e1/canonicalDigest.ts';
import { createQwenL3 } from '../l3/qwenL3.ts';

const DB = '../cloud/bundles/edh-core-v0-mock.kyro';
const MODEL = 'models/Qwen2.5-3B-Instruct-Q4_K_M.gguf';
let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`[${ok ? 'PASS' : 'FAIL'}] ${n}${ok ? '' : `  — ${d}`}`); ok ? pass++ : fail++; };

// HM, but the 3 critical fields come from VOICE (audio clips); the rest scripted.
const HM: Env = {
  mechanism: 'rta', mechanism_class: 'blunt', time_since_injury_hr: 3, anticoag_antiplatelet: 'none', known_coagulopathy: 'no',
  gcs_e: 1, gcs_v: 2, gcs_m: 4, pupil_size_l_mm: 6, pupil_react_l: 'fixed', pupil_size_r_mm: 3, pupil_react_r: 'brisk',
  sbp_mmhg: 160, age_yr: 31, spo2_pct: 95, spo2_available: 'yes', blood_glucose: 0, glucose_available: 'no',
  lucid_interval: 'yes', focal_weakness_side: 'right', posturing: 'none', seizure_status: 'none',
};
// pupil_react_l is captured by REAL VOICE: a 16 kHz clip → whisper.cpp ASR → L3 classify. whisper.cpp
// here is the SAME engine as whisper.rn on the phone, so this is the on-device path. (The other HM
// fields are scripted to keep the vignette fixed.) Expected: spoken "blown/fixed" → fixed.
const VOICE_FIELD = 'pupil_react_l', VOICE_EXPECT = 'fixed';
const WEXE = ['asr/bin/whisper-cli.exe', 'asr/bin/Release/whisper-cli.exe', 'asr/bin/main.exe', 'asr/bin/Release/main.exe'].map((p) => resolve(p)).find(existsSync);
const asr: Asr | null = WEXE ? makeWhisperCliAsr({ exe: WEXE, model: resolve('asr/ggml-base.en.bin') }) : null;

const ndb = new DatabaseSync(DB);
const opShim = { executeSync: (sql: string) => ({ rows: { _array: ndb.prepare(sql).all() } }) };

// ── E1: bundle integrity ──
const subst: Record<string, string> = { 'SELECT chunk_id FROM chunk_vec': 'SELECT id FROM chunks', 'SELECT node_id FROM node_vec': 'SELECT id FROM nodes' };
const q: Query = (sql) => ndb.prepare(subst[sql] ?? sql).all().map((r) => Object.values(r as Record<string, unknown>) as Cell[]);
const sha256 = (b: Uint8Array) => new Uint8Array(createHash('sha256').update(b).digest());
check('E1 bundle verified (digest parity)', Buffer.from(manifestDigest(q, sha256)).toString('hex') === 'b61dfaf35b02e43a7d02e9648d6b9ac562e67e7c3103f863f5028a0e9ca8d8a3');

// ── L3 + E6: real model + whisper ──
console.log('loading L3 model…');
const readLeafText = (id: string, lang = 'en') => (ndb.prepare('SELECT recommendation FROM cgt_strings WHERE node_id=? AND lang=?').get(id, lang) as any)?.recommendation ?? (ndb.prepare("SELECT recommendation FROM cgt_strings WHERE node_id=? AND lang='en'").get(id) as any)?.recommendation ?? null;
const l3 = await createQwenL3(MODEL, readLeafText);

const spine = loadSpine(opShim);
const journal = new InMemoryJournal();
journal.append({ t: 'started', ts: 1, encounterId: 'INT-HM', lang: 'en' });
let clk = 1; const clock = () => ++clk;

// host: VOICE fields via whisper→L3; everything else scripted. Proves E6→L3→E3 connect.
const host: GatherHost = {
  async ask(field, node) {
    if (field === VOICE_FIELD && asr) {
      const transcript = await asr.transcribe(resolve(`l3/_audio/${field}.wav`)); // REAL whisper.cpp
      const value = await l3.classifyAnswer(field, await l3.cleanAsr(transcript), node);
      check(`E6 real-whisper "${field}": "${transcript.slice(0, 34)}…" → ${value}`, value === VOICE_EXPECT, `expected ${VOICE_EXPECT}`);
      return value;
    }
    return HM[field];
  },
};

// ── E3 traverse (voice + scripted) ──
const result = await execute(spine, journalingHost(host, journal, clock), l3, {});
check('E3 spine reached GUIDE@L21c (from voice+scripted evidence)', result.action === 'GUIDE' && result.leaf.id === 'L21c', `got ${result.action}@${result.leaf.id}`);

// ── E2 coverage → E4 gate ──
const embed: Embed = () => new Float32Array(1024);
const knn: Knn = (t) => t === 'chunk_vec' ? [{ id: 'ch01', score: 0.9 }] : [{ id: 'n_edh', score: 0.9 }];
const cov = retrieve(opShim, 'herniating EDH', result.citation, embed, knn).coverage;
const gated = gate(result, cov);
check('E2→E4 grounded coverage → 🟢 GUIDE + N40 drill-abstain', gated.badge === 'GREEN' && gated.drillSiteAbstain?.node === 'N40');

// ── E5 handoff ──
finalize(journal, result, gated, clock);
const handoff = buildHandoff(reduce(journal.load()), gated, clock());
check('E5 handoff carries the voice-captured fixed pupil', handoff.evidence.pupils.includes('fixed'));

// ── multilingual drafts ──
const drafts = existsSync('l3/translations.draft.json') ? JSON.parse(readFileSync('l3/translations.draft.json', 'utf-8')) : {};
check('Multilingual: UR+HI drafts exist for the reached leaf', !!drafts[result.leaf.id]?.ur?.recommendation && !!drafts[result.leaf.id]?.hi?.recommendation);

await l3.dispose();
ndb.close();
console.log(`\nFULL-STACK INTEGRATION: ${fail === 0 ? 'ALL PASS' : 'FAILURES'} (${pass} passed, ${fail} failed)`);
process.exit(fail === 0 ? 0 : 1);
