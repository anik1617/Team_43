/**
 * L3 VALIDATION — does a stock Qwen2.5-3B-Q4 reliably do the model's hardest job (classify-answer)?
 *
 * This is the QUALITY de-risk: the architecture assumes a tiny model can map messy clinical speech
 * to the spine's structured vocab. Here we test that assumption directly, with grammar-constrained
 * decoding, on realistic rural-responder phrasings. Output ∈ vocab is GUARANTEED by the grammar;
 * what we measure is whether it picks the CORRECT in-vocab value (a wrong-but-in-vocab pick is the
 * residual risk that read-back confirmation exists to catch).
 *
 * Run:  node --import tsx l3/validateL3.ts [modelPath]
 */

import { createQwenL3 } from './qwenL3.ts';

const MODEL = process.argv[2] ?? 'models/Qwen2.5-3B-Instruct-Q4_K_M.gguf';

// (field, utterance, expected) — realistic phrasings a GMO/family might speak.
const CASES: Array<[string, string, string]> = [
  ['pupil_react_l', "his left pupil is blown, totally dilated and not reacting to my torch", 'fixed'],
  ['pupil_react_r', "the right one shrinks down quickly when I shine the light", 'brisk'],
  ['pupil_react_r', "right pupil is a bit slow to react", 'sluggish'],
  ['mechanism_class', "he was shot in the head with a pistol", 'penetrating'],
  ['mechanism_class', "rolled his motorbike, hit his head on the road", 'blunt'],
  ['mechanism_class', "there was an explosion at the quarry", 'blast'],
  ['lucid_interval', "he was talking and walking after the crash, then an hour later went unconscious", 'yes'],
  ['lucid_interval', "he's been knocked out cold since the moment it happened", 'no'],
  ['anticoag_antiplatelet', "he takes warfarin for his irregular heartbeat", 'warfarin'],
  ['anticoag_antiplatelet', "just a baby aspirin every day", 'antiplatelet'],
  ['anticoag_antiplatelet', "no blood thinners, nothing like that", 'none'],
  ['focal_weakness_side', "his right arm and leg aren't moving like the left", 'right'],
  ['posturing', "his arms are stiff and extending straight out", 'decerebrate'],
  ['seizure_status', "he's convulsing right now, full body", 'active-or-without-recovery'],
  ['gcs_e', "his eyes open when I shout at him", '3'],
];

const main = async () => {
  console.log(`loading ${MODEL} ...`);
  const t0 = Date.now();
  const l3 = await createQwenL3(MODEL);
  console.log(`loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  let pass = 0;
  for (const [field, utt, expected] of CASES) {
    const got = String(await l3.classifyAnswer(field, utt, { id: 'test', kind: 'gather', field, action: null, source_citation: null, trust_tier: null }));
    const ok = got === expected;
    if (ok) pass++;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${field.padEnd(22)} "${utt.slice(0, 46)}${utt.length > 46 ? '…' : ''}"`);
    if (!ok) console.log(`        expected ${expected}  got ${got}`);
  }
  console.log(`\nclassify-answer accuracy: ${pass}/${CASES.length} (${Math.round((pass / CASES.length) * 100)}%)`);
  await l3.dispose();
  process.exit(0);
};
main();
