/**
 * BGE-M3 query embedder (llama.rn) — the device half of embedding parity (Part B).
 *
 * The corpus vectors in edh-core-v{N}.kyro are built cloud-side with FlagEmbedding's
 * BGEM3FlagModel (dense, dim 1024, fp32, L2-normalized — see cloud/kyro_bundle/embedders.py).
 * At query time the DEVICE must embed the query with the SAME model so the sqlite-vec NN
 * returns the same nearest chunks. This is the #1 project-killer if it drifts.
 *
 * Byte-identity across planes is impossible (llama.cpp on ARM vs PyTorch fp32 round differently);
 * the bar is NN-ORDER STABILITY (top-3 set identical, no swap within top-3). See cloud/parity/.
 *
 * ── PARITY-CRITICAL, do NOT change without re-running cloud/parity/compare_parity.py ──
 *   • model         : BAAI/bge-m3 GGUF (e.g. gpustack/bge-m3-GGUF · bge-m3-Q8_0.gguf). Pin the
 *                     same logical model the bundle was built on (manifest.embedder_id='bge-m3').
 *   • pooling_type  : CLS (=2). FlagEmbedding's dense_vecs is the [CLS] token representation;
 *                     llama.cpp MUST pool the same way or every vector is wrong. Most bge-m3
 *                     GGUFs set this in metadata, but we pass it explicitly to be safe.
 *   • dim           : 1024 (assert — a mismatch means the wrong model/quant).
 *   • normalize     : explicit v/‖v‖ here, matching BgeM3Embedder.embed, so similarity = cosine
 *                     and the vec0 L2-distance→similarity mapping (1 - d²/2) is exact.
 *
 * Model file (push alongside the Qwen GGUF):
 *   adb push bge-m3-Q8_0.gguf /sdcard/Android/data/com.kyroapp/files/bge-m3.gguf
 */
import { initLlama, type LlamaContext } from 'llama.rn';

export const BGE_MODEL_PATH = '/storage/emulated/0/Android/data/com.kyroapp/files/bge-m3.gguf';
export const BGE_DIM = 1024;
const POOLING_CLS = 2; // llama.cpp LLAMA_POOLING_TYPE_CLS — must match FlagEmbedding's dense pooling

let ctx: LlamaContext | null = null;
let status: 'none' | 'loading' | 'ready' | 'failed' = 'none';

export function bgeStatus() { return status; }
export function bgeReady() { return status === 'ready'; }

/** Load the BGE-M3 GGUF as an EMBEDDING context. Non-fatal — returns false if absent/failed, so
 *  the caller can fall back to the non-semantic stub (the app still works, retrieval is just mock). */
export async function initBgeEmbed(path: string = BGE_MODEL_PATH): Promise<boolean> {
  if (status === 'ready') return true;
  status = 'loading';
  try {
    ctx = await initLlama({
      model: path,
      embedding: true,        // embedding context, not a chat context
      pooling_type: POOLING_CLS,
      n_ctx: 512,             // queries are short; chunks were 600-token, well under
      n_gpu_layers: 0,        // CPU — bge-m3 is small; keeps the phone's GPU for nothing critical
    } as any);
    status = 'ready';
    return true;
  } catch (e) {
    status = 'failed';
    ctx = null;
    console.log('[Kyro] bge-m3 embed FAILED:', String(e));
    return false;
  }
}

/** Embed a query → L2-normalized Float32Array[1024], matching the cloud build embedder exactly. */
export async function bgeEmbedQuery(text: string): Promise<Float32Array> {
  if (!ctx) throw new Error('bgeEmbedQuery called before initBgeEmbed succeeded');
  const out: any = await ctx.embedding(text);
  // llama.rn returns { embedding: number[] }; tolerate a bare number[] too.
  const raw: number[] = Array.isArray(out) ? out : out?.embedding;
  if (!raw || raw.length !== BGE_DIM) {
    throw new Error(`bge-m3 returned dim ${raw?.length} (expected ${BGE_DIM}) — wrong model/pooling?`);
  }
  const v = Float32Array.from(raw);
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}
