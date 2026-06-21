/**
 * E6 — TWO-WAY VOICE demo. Kyro SPEAKS a question (TTS) → you answer by VOICE (whisper.cpp mic) →
 * L3 classifies → Kyro SPEAKS the read-back confirmation. A live spoken loop, the real on-device UX.
 *
 * Both halves are the on-device engines: whisper.cpp (= whisper.rn) for listening, and here SAPI
 * stands in for Piper for speaking. The model (Qwen) only cleans + classifies; the structured value
 * is what enters the deterministic tree.
 *
 * Run:  node --import tsx e6/converse.ts            (needs a mic + speakers)
 * Tip:  speak ONE short clinical phrase after each question, then pause.
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { makeSapiTts } from './tts.ts';
import { createQwenL3 } from '../l3/qwenL3.ts';
import type { CgtNode } from '../e3/spineExecutor.ts';

const WEXE = ['asr/bin/Release/whisper-cli.exe', 'asr/bin/whisper-cli.exe'].map((p) => resolve(p)).find(existsSync);
const WSTREAM = ['asr/bin/Release/whisper-stream.exe', 'asr/bin/whisper-stream.exe'].map((p) => resolve(p)).find(existsSync);
const WMODEL = resolve('asr/ggml-base.en.bin');
const GGUF = resolve('models/Qwen2.5-3B-Instruct-Q4_K_M.gguf');

const tts = makeSapiTts({ rate: 0 });

/** Capture ~`secs` of mic speech via whisper-stream; return the cleaned transcript. */
function listen(secs = 6): Promise<string> {
  return new Promise((res) => {
    if (!WSTREAM) return res('');
    const p = spawn(WSTREAM, ['-m', WMODEL, '--step', '1000', '--length', '5000', '-c', '0', '-t', '4']);
    let buf = '';
    p.stdout.on('data', (d) => { buf += d.toString(); });
    p.on('error', () => res(''));
    setTimeout(() => {
      p.kill();
      const t = buf.replace(/\[[^\]]*\]/g, '').replace(/###.*$/gm, '').replace(/\s+/g, ' ').trim();
      res(t);
    }, secs * 1000);
  });
}

const QUESTIONS: Array<{ field: string; ask: string }> = [
  { field: 'mechanism_class', ask: 'What caused the head injury? For example, a fall, a gunshot, or a blast.' },
  { field: 'pupil_react_l', ask: 'Describe the left pupil. Is it reacting to light, sluggish, or blown and fixed?' },
  { field: 'anticoag_antiplatelet', ask: 'Is the patient on any blood thinner, such as warfarin or aspirin?' },
];

const main = async () => {
  if (!WEXE || !WSTREAM) { console.error('whisper binaries not found under asr/bin'); process.exit(2); }
  console.log('loading Kyro (model)…');
  const l3 = await createQwenL3(GGUF);
  const node = (field: string): CgtNode => ({ id: 'voice', kind: 'gather', field, action: null, source_citation: null, trust_tier: null });

  await tts.speak('Kyro ready. I will ask a few questions. Speak your answer after each one.');
  for (const { field, ask } of QUESTIONS) {
    console.log(`\n🗣️  Kyro: ${ask}`);
    await tts.speak(ask);
    console.log('🎤 (listening ~6s — speak now…)');
    const heard = await listen(6);
    console.log(`👂 heard: "${heard || '(nothing)'}"`);
    const value = heard ? await l3.classifyAnswer(field, await l3.cleanAsr(heard), node(field)) : '(unclear)';
    const back = `I recorded ${field.replace(/_/g, ' ')} as ${value}.`;
    console.log(`✅ Kyro: ${back}`);
    await tts.speak(back);
  }
  await tts.speak('Thank you. Code decides the next step, not me. This is a demo of the voice loop.');
  await l3.dispose();
  console.log('\ndone.');
};
main();
