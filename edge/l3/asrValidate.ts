/**
 * E6 ASR validation — REAL whisper.cpp on the laptop, end of the voice chain: clinical clip →
 * whisper transcript → L3 clean → L3 constrained-classify → structured value. Proves both halves:
 * (1) can whisper transcribe clinical English, (2) does L3 recover the right vocab value. The engine
 * (whisper.cpp) + model (ggml-base.en) are IDENTICAL to whisper.rn on the phone, so this transfers.
 *
 * Run:  node --import tsx l3/asrValidate.ts
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeWhisperCliAsr, type Asr } from '../e6/asr.ts';
import { createQwenL3 } from './qwenL3.ts';

const GGUF = 'models/Qwen2.5-3B-Instruct-Q4_K_M.gguf';
const WMODEL = resolve('asr/ggml-base.en.bin');  // absolute paths — Windows Node spawn EPERMs on relative exe
const EXE = ['asr/bin/whisper-cli.exe', 'asr/bin/Release/whisper-cli.exe', 'asr/bin/main.exe', 'asr/bin/Release/main.exe', 'asr/bin/whisper.exe']
  .map((p) => resolve(p)).find(existsSync);

if (!EXE) { console.error('whisper exe not found under asr/bin — download not finished?'); process.exit(2); }
console.log(`whisper: ${EXE}\nmodel:   ${WMODEL}\n`);

const CASES: Array<{ f: string; expect: string }> = [
  { f: 'pupil_react_l', expect: 'fixed' },
  { f: 'pupil_react_r', expect: 'brisk' },
  { f: 'mechanism_class', expect: 'penetrating' },
  { f: 'anticoag_antiplatelet', expect: 'warfarin' },
  { f: 'lucid_interval', expect: 'yes' },
  { f: 'seizure_status', expect: 'active-or-without-recovery' },
];

const asr: Asr = makeWhisperCliAsr({ exe: EXE, model: WMODEL });
console.log('loading L3…');
const l3 = await createQwenL3(GGUF);

let asrOk = 0, clsOk = 0;
for (const { f, expect } of CASES) {
  const wav = resolve(`l3/_audio/${f}.wav`);
  const transcript = await asr.transcribe(wav);                 // REAL whisper.cpp ASR
  const value = await l3.classifyAnswer(f, await l3.cleanAsr(transcript), { id: 't', kind: 'gather', field: f, action: null, source_citation: null, trust_tier: null });
  const heardSomething = transcript.length > 3;
  const classified = String(value) === expect;
  if (heardSomething) asrOk++;
  if (classified) clsOk++;
  console.log(`[${classified ? 'PASS' : 'FAIL'}] ${f.padEnd(22)} whisper="${transcript}"  → ${value}${classified ? '' : ` (expected ${expect})`}`);
}

console.log(`\nASR transcribed: ${asrOk}/${CASES.length}   |   end-to-end classify: ${clsOk}/${CASES.length}`);
await l3.dispose();
process.exit(0);
