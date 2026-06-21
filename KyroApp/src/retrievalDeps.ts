/**
 * Resolve the two hardware-gated retrieval dependencies (query embedder + vec0 knn) for E2.
 *
 * The app "always works" (same pattern as the L3 model): if the bundle is a REAL bge-m3 bundle
 * AND the BGE-M3 GGUF loads, we use real semantic retrieval (BGE-M3 query embed + sqlite-vec NN);
 * otherwise we fall back to the deterministic EDH stub hit-set — which is what the mock-bundle
 * laptop demo + the locked edge/tests/run.ts expect, so that path is preserved byte-for-byte.
 *
 * Query embedding is ASYNC on device (llama.rn), but retrieve()'s Embed is sync — so callers
 * precompute the query vector with `embedQuery` and pass `() => qv` into retrieve().
 */
import { makeVec0Knn, type Knn, type RetrievalDB } from '../engine/e2/retrieval';
import { initBgeEmbed, bgeEmbedQuery, BGE_DIM } from './bgeEmbed';

export interface RetrievalDeps {
  embedQuery: (q: string) => Promise<Float32Array>;
  knn: Knn;
  mode: 'bge-m3' | 'stub';
}

/** The deterministic EDH grounding hit-set used by the mock-bundle demo (mirrors useKyroEncounter
 *  GROUNDING_KNN). Lets coverage MECHANICS run for real when the semantic embedder isn't present. */
const STUB_KNN: Knn = (table) =>
  table === 'chunk_vec'
    ? [{ id: 'ch01', score: 0.92 }, { id: 'ch03', score: 0.88 }]
    : [{ id: 'n_edh', score: 0.9 }];

const STUB_EMBED = async () => new Float32Array(BGE_DIM); // non-semantic; irrelevant under STUB_KNN

export function readEmbedderId(db: RetrievalDB): string | null {
  const row = db.executeSync('SELECT * FROM manifest LIMIT 1').rows?._array?.[0];
  return row?.embedder_id ?? null;
}

/** Pick the real BGE-M3 + vec0 path when the bundle wants it and the model loads; else the stub. */
export async function resolveRetrievalDeps(
  db: RetrievalDB,
  bgeModelPath?: string,
): Promise<RetrievalDeps> {
  if (readEmbedderId(db) === 'bge-m3' && (await initBgeEmbed(bgeModelPath))) {
    return { embedQuery: bgeEmbedQuery, knn: makeVec0Knn(db), mode: 'bge-m3' };
  }
  return { embedQuery: STUB_EMBED, knn: STUB_KNN, mode: 'stub' };
}
