/**
 * Device-side embedding-parity harness (Part B, device half).
 *
 * Pure over injected deps (a RetrievalDB + an async BGE-M3 query embedder) so it runs on-device
 * (op-sqlite + KyroApp/src/bgeEmbed.bgeEmbedQuery) AND in a node analog (node-llama-cpp). It emits
 * the SAME schema as cloud/parity/parity_cloud.json, so cloud/parity/compare_parity.py diffs the
 * two planes against the agreed bar:
 *
 *     on >=95% of queries the top-3 chunk SET is identical AND there is no swap within the top-3.
 *
 * The cloud pod validates this exact path with llama.cpp (cloud/parity/run_parity_llamacpp.py) —
 * the same engine llama.rn wraps — so a PASS there is strong evidence the on-device run holds.
 *
 * Usage (device):
 *   const queries = JSON.parse(await readQueriesJson());   // the shared cloud/parity/queries.json
 *   await initBgeEmbed();                                   // load the bge-m3 GGUF
 *   const out = await runDeviceParity(db, bgeEmbedQuery, queries.queries);
 *   await writeJson('parity_device.json', out);             // pull off-device, diff vs parity_cloud.json
 */
import { retrieve, makeVec0Knn, type RetrievalDB } from './retrieval';

export interface ParityQuery { id: string; text: string; }

export interface DeviceParityResult {
  plane: string;
  embedder_id: string;
  embedder_dim: number;
  k: number;
  queries: Array<{
    id: string;
    text: string;
    top_chunks: Array<{ rank: number; chunk_id: string; score: number; via: string; trust_tier: number | null; citation: string | null }>;
    top3_set: string[];
    coverage: { covered: boolean; score?: number; top_trust_tier?: number | null };
  }>;
}

export async function runDeviceParity(
  db: RetrievalDB,
  embedQuery: (q: string) => Promise<Float32Array>,
  queries: ParityQuery[],
  k = 6,
): Promise<DeviceParityResult> {
  const knn = makeVec0Knn(db);
  const out: DeviceParityResult['queries'] = [];
  for (const q of queries) {
    const qv = await embedQuery(q.text);            // async embed; retrieve() takes a sync accessor
    const res = retrieve(db, q.text, null, () => qv, knn, { kChunks: k, kNodes: 4 });
    const topChunks = res.chunks.slice(0, k).map((c, i) => ({
      rank: i + 1, chunk_id: c.id, score: Number(c.score.toFixed(6)), via: c.via,
      trust_tier: c.trust_tier, citation: c.source_citation,
    }));
    out.push({
      id: q.id, text: q.text, top_chunks: topChunks,
      top3_set: topChunks.slice(0, 3).map((c) => c.chunk_id).sort(),
      coverage: { covered: res.coverage.covered, score: res.coverage.score, top_trust_tier: res.coverage.topTrustTier },
    });
  }
  return { plane: 'device', embedder_id: 'bge-m3', embedder_dim: 1024, k, queries: out };
}
