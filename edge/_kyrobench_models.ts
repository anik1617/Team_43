/**
 * KyroBench / Module D (models) — on-device language-layer throughput.
 * Measures the stock Qwen2.5-3B-Q4 (the shipping L3 model) load time, time-to-first-token,
 * prefill + decode tokens/sec, and peak process RSS, on this machine's CPU.
 *
 * Run from edge/:  node --import tsx _kyrobench_models.ts
 */
import { writeFileSync } from 'node:fs';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

const MODEL = 'models/Qwen2.5-3B-Instruct-Q4_K_M.gguf';
const PROMPT = 'You are a rural medical officer assistant. In two sentences, summarize the immediate '
  + 'priorities for a head-injury patient with a GCS of 7 and a blown left pupil.';

function rssMB() { return Math.round(process.memoryUsage().rss / 1e6); }

const t0 = performance.now();
const llama = await getLlama();
const model = await llama.loadModel({ modelPath: MODEL });
const ctx = await model.createContext({ contextSize: 1024 });
const session = new LlamaChatSession({ contextSequence: ctx.getSequence() });
const loadMs = performance.now() - t0;
const rssAfterLoad = rssMB();

// warmup (kernels / allocations)
await session.prompt('Say OK.', { maxTokens: 4 });

// timed generation
session.setChatHistory([]);
const N = 96;
let firstTokenMs = 0;
const g0 = performance.now();
let count = 0;
const text = await session.prompt(PROMPT, {
  maxTokens: N,
  temperature: 0,
  onTextChunk: () => { if (count === 0) firstTokenMs = performance.now() - g0; count++; },
});
const genMs = performance.now() - g0;
const outTokens = model.tokenize(text).length;
const decodeTps = outTokens / ((genMs - firstTokenMs) / 1000);
const totalTps = outTokens / (genMs / 1000);

const out = {
  kyrobench_models: {
    model: 'Qwen2.5-3B-Instruct-Q4_K_M.gguf',
    device: 'x86 CPU (desktop) — phone target will be slower',
    load_ms: Math.round(loadMs),
    rss_after_load_mb: rssAfterLoad,
    peak_rss_mb: rssMB(),
    time_to_first_token_ms: Math.round(firstTokenMs),
    output_tokens: outTokens,
    gen_wall_ms: Math.round(genMs),
    decode_tokens_per_s: Math.round(decodeTps * 10) / 10,
    end_to_end_tokens_per_s: Math.round(totalTps * 10) / 10,
  },
};
console.log(JSON.stringify(out, null, 2));
writeFileSync('../../_kyrobench/out/models.json', JSON.stringify(out, null, 2));
await model.dispose();
process.exit(0);
