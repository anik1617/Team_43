/**
 * Qwen L3 (llama.rn) — the on-device model, used ONLY for the model's I/O jobs:
 * reword the leaf's authored recommendation, and classify a free-form (voice) answer to a vocab.
 * The deterministic tree still decides. Loads a GGUF if present; falls back to the authored text if
 * the model isn't on the device — so the app always works.
 *
 * Model file: push a Qwen-*-Q4 GGUF to the app's external files dir, e.g.
 *   adb push Qwen2.5-3B-Instruct-Q4_K_M.gguf /sdcard/Android/data/com.kyroapp/files/qwen.gguf
 */
import { initLlama, type LlamaContext } from 'llama.rn';
import type { L3, CgtNode } from '../engine/e3/spineExecutor';
import type { Env } from '../engine/e3/conditions';
import { kyroDb } from './kyroDb';

export const MODEL_PATH = '/storage/emulated/0/Android/data/com.kyroapp/files/qwen.gguf';

let ctx: LlamaContext | null = null;
let status: 'none' | 'loading' | 'ready' | 'failed' = 'none';

export function modelStatus() { return status; }

/** Try to load the GGUF. Non-fatal — returns false if absent/failed (app uses the stub then). */
export async function initModel(path: string = MODEL_PATH): Promise<boolean> {
  if (status === 'ready') return true;
  status = 'loading';
  console.log('[Kyro] llama loading:', path);
  try {
    ctx = await initLlama({ model: path, n_ctx: 1024, n_gpu_layers: 0 });
    status = 'ready';
    console.log('[Kyro] llama READY');
    return true;
  } catch (e) {
    status = 'failed';
    ctx = null;
    console.log('[Kyro] llama FAILED:', String(e));
    return false;
  }
}

async function gen(system: string, user: string, maxTokens = 220): Promise<string> {
  if (!ctx) return '';
  const res = await ctx.completion({
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    n_predict: maxTokens, temperature: 0,
  });
  return (res.text ?? '').trim();
}

const FIELD_VOCAB: Record<string, string[]> = {
  mechanism_class: ['blunt', 'penetrating', 'blast', 'non-trauma'],
  pupil_react_l: ['brisk', 'sluggish', 'fixed'], pupil_react_r: ['brisk', 'sluggish', 'fixed'],
  lucid_interval: ['yes', 'no', 'unknown'], anticoag_antiplatelet: ['none', 'warfarin', 'antiplatelet', 'unknown'],
  focal_weakness_side: ['left', 'right', 'none'], posturing: ['none', 'decorticate', 'decerebrate'],
};

/** L3 backed by Qwen when loaded; otherwise the authored-text stub. */
export function qwenL3(): L3 {
  return {
    async cleanAsr(s) { return s; },
    async classifyAnswer(field, utterance, _node): Promise<Env[string]> {
      const vocab = FIELD_VOCAB[field];
      if (!ctx || !vocab) return utterance;
      const out = await gen(
        `Map the responder's words to exactly one of these values: ${vocab.join(', ')}. Output only the value.`,
        utterance, 8,
      );
      const hit = vocab.find((v) => out.toLowerCase().includes(v));
      return hit ?? utterance;
    },
    async phraseQuestion() { return ''; },
    async synthesizeLeaf(node: CgtNode) {
      const authored = (kyroDb.readLeafText(node.id, 'en') ?? '').replace(/^\[[^\]]*\]\s*/, '');
      if (!ctx || !authored) return authored;
      const reworded = await gen(
        'You are an emergency triage co-pilot. Reword the guideline recommendation plainly for a non-specialist in 2-3 sentences. Do NOT add or remove clinical content. Keep drug names and the citation.',
        authored,
      );
      return reworded || authored;
    },
  };
}
