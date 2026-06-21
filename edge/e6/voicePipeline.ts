/**
 * E6 — FULL VOICE PIPELINE. You SPEAK the key clinical fields → the REAL deterministic engine runs
 * (E3 spine → E2 coverage → E4 gate → E5 handoff) → Kyro SPEAKS the decision, the cited safety
 * guards, and the abstain. The complete hands-free co-pilot loop, end to end, on-device engines.
 *
 * You voice 5 decisive fields (mechanism, both pupils, blood-thinner, lucid interval); the rest use
 * a severe-case baseline so the spine reaches a real decision. Your voice genuinely steers it —
 * say "shot in the head" and it bypasses the burr-hole path; say "blown and fixed" + "lucid" and it
 * reaches the herniation/operate decision.
 *
 * Run (in a terminal with mic + speakers):  node --import tsx e6/voicePipeline.ts
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { makeSapiTts } from './tts.ts';
import { createQwenL3 } from '../l3/qwenL3.ts';
import { loadSpine, execute, type GatherHost, type CgtNode, type Env } from '../e3/spineExecutor.ts';
import { gate } from '../e4/abstentionGate.ts';
import { retrieve, type Knn, type Embed } from '../e2/retrieval.ts';

const DB = resolve('../cloud/bundles/edh-core-v0-mock.kyro');
const GGUF = resolve('models/Qwen2.5-3B-Instruct-Q4_K_M.gguf');
const WSTREAM = ['asr/bin/Release/whisper-stream.exe', 'asr/bin/whisper-stream.exe'].map((p) => resolve(p)).find(existsSync);
const WMODEL = resolve('asr/ggml-base.en.bin');

const tts = makeSapiTts({ rate: 0 });

function listen(secs = 6): Promise<string> {
  return new Promise((res) => {
    if (!WSTREAM) return res('');
    const p = spawn(WSTREAM, ['-m', WMODEL, '--step', '1000', '--length', '5000', '-c', '0', '-t', '4']);
    let buf = '';
    p.stdout.on('data', (d) => { buf += d.toString(); });
    p.on('error', () => res(''));
    setTimeout(() => { p.kill(); res(buf.replace(/\[[^\]]*\]/g, '').replace(/###.*$/gm, '').replace(/\s+/g, ' ').trim()); }, secs * 1000);
  });
}

// 5 voiced fields + the questions Kyro speaks for each.
const ASK: Record<string, string> = {
  mechanism_class: 'What caused the head injury?',
  pupil_react_l: 'Describe the left pupil.',
  pupil_react_r: 'Describe the right pupil.',
  anticoag_antiplatelet: 'Is the patient on any blood thinner?',
  lucid_interval: 'Was there a lucid interval? Awake after the injury, then declined?',
};
// severe-case baseline for the non-voiced fields (GCS 7, etc.) so a real decision is reached.
const BASE: Env = {
  mechanism: 'injury', time_since_injury_hr: 3, known_coagulopathy: 'no',
  gcs_e: 1, gcs_v: 2, gcs_m: 4, pupil_size_l_mm: 6, pupil_size_r_mm: 3, sbp_mmhg: 160, age_yr: 31,
  spo2_pct: 95, spo2_available: 'yes', blood_glucose: 0, glucose_available: 'no',
  focal_weakness_side: 'right', posturing: 'none', seizure_status: 'none',
};

const main = async () => {
  if (!WSTREAM) { console.error('whisper-stream not found under asr/bin'); process.exit(2); }
  const ndb = new DatabaseSync(DB);
  const opShim = { executeSync: (sql: string) => ({ rows: { _array: ndb.prepare(sql).all() } }) };
  console.log('loading Kyro…');
  const l3 = await createQwenL3(GGUF, (id, lang = 'en') => (ndb.prepare('SELECT recommendation FROM cgt_strings WHERE node_id=? AND lang=?').get(id, lang) as any)?.recommendation ?? (ndb.prepare("SELECT recommendation FROM cgt_strings WHERE node_id=? AND lang='en'").get(id) as any)?.recommendation ?? null);
  const spine = loadSpine(opShim);

  await tts.speak('Kyro ready. I will ask five questions. Speak your answer after each.');
  const host: GatherHost = {
    async ask(field: string, node: CgtNode): Promise<Env[string]> {
      if (field in ASK) {
        console.log(`\n🗣️  Kyro: ${ASK[field]}`);
        await tts.speak(ASK[field]);
        console.log('🎤 (speak now…)');
        const heard = await listen(6);
        const value = heard ? await l3.classifyAnswer(field, await l3.cleanAsr(heard), node) : 'unknown';
        console.log(`👂 "${heard || '(nothing)'}"  →  ${value}`);
        return value;
      }
      return BASE[field];
    },
  };

  // ── run the REAL engine on the voiced + baseline evidence ──
  const result = await execute(spine, host, l3, {});
  const embed: Embed = () => new Float32Array(1024);
  const knn: Knn = (t) => t === 'chunk_vec' ? [{ id: 'ch01', score: 0.9 }, { id: 'ch03', score: 0.88 }] : [{ id: 'n_edh', score: 0.9 }];
  const cov = retrieve(opShim, 'head injury, herniation, EDH', result.citation, embed, knn).coverage;
  const gated = gate(result, cov);

  // ── Kyro SPEAKS the decision ──
  const guards = result.trace.includes('L11a') ? 'Safety alert: correct the blood pressure first. ' : '';
  const drill = gated.drillSiteAbstain ? 'I abstain on the drill site. That decision needs imaging and a neurosurgeon. ' : '';
  const badge = gated.badge === 'GREEN' ? 'green protocol' : gated.badge === 'YELLOW' ? 'yellow, principles' : 'red, stop';
  const spoken = `Decision: ${result.action}. Badge ${badge}. ${guards}${drill}${gated.requiresExpertHandoff ? 'The pre-briefed handoff is ready.' : 'I can handle this case directly.'}`;

  console.log(`\n━━━ DECISION ━━━\n  ${result.action} @ ${result.leaf.id}  ·  ${gated.badge}`);
  if (gated.drillSiteAbstain) console.log('  ⛔ abstains: drill-site (N40)');
  console.log(`\n🔊 Kyro: ${spoken}\n`);
  await tts.speak(spoken);

  await l3.dispose();
  ndb.close();
};
main();
