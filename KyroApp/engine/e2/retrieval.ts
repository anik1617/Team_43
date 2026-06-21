/**
 * E2 — Retrieval (GraphRAG local-search) → produces the COVERAGE signal E4 consumes.
 *
 * Flow (mirrors docs/08 E2): embed query → sqlite-vec NN over chunk_vec + node_vec →
 * graph expansion (edges + community) → cited context ordered by trust_tier → coverage.
 *
 * DESIGN: the raw vector-NN is the ONE injected dependency (`knn`). On device that's an
 * op-sqlite vec0 `embedding MATCH` query; in tests it's a deterministic stub. Everything else
 * (graph expansion, trust ordering, citation assembly, coverage thresholding) is PURE and reads
 * only regular tables — so it is fully laptop-testable. The model is NOT on this path: retrieval
 * FETCHES grounded text; the deterministic tree (E3) decides. E2 only reports how well the L2
 * knowledge grounds the leaf E3 reached — it never moves the decision (the inversion holds).
 *
 * Semantic QUALITY needs real BGE-M3 (hardware-gated; the mock embedder is non-semantic by design).
 * What's testable here is the MECHANICS; the Python oracle (e2/conformance.py) proves the vec wiring.
 */

// ---- the bundle read surface (satisfied by op-sqlite on device, node:sqlite in tests) ----
export interface RetrievalDB { executeSync(sql: string): { rows?: { _array?: any[] } }; }

/** similarity in [0,1], higher = closer. The on-device adapter converts vec0 distance → similarity,
 *  so retrieval.ts stays metric-agnostic. */
export interface Hit { id: string; score: number; }
/** Injected nearest-neighbour over a vec0 table. Device: `SELECT id FROM <table> WHERE embedding
 *  MATCH ? ORDER BY distance LIMIT k`. Test: a scripted map. */
export type Knn = (table: 'chunk_vec' | 'node_vec', queryEmbedding: Float32Array, k: number) => Hit[];
/** Injected query embedder. Device: BGE-M3 via llama.rn. Test: irrelevant (knn is stubbed). */
export type Embed = (text: string) => Float32Array;

export interface Chunk { id: string; kind: string; text: string; source_citation: string | null; trust_tier: number | null; }
export interface RetrievedChunk extends Chunk { score: number; via: 'vector' | 'graph'; }

export interface RetrievalResult {
  chunks: RetrievedChunk[];          // cited context, ordered (trust_tier asc, score desc)
  seedNodes: Hit[];                  // node_vec NN hits that seeded graph expansion
  expandedNodes: string[];           // nodes reached by 1-hop graph expansion
  communities: string[];             // community ids spanned (for community-report context)
  coverage: Coverage;               // → handed straight to E4.gate()
}

/** The contract E4 consumes (must match e4/abstentionGate.ts Coverage). */
export interface Coverage {
  covered: boolean;
  score?: number;
  topTrustTier?: number | null;
  supportingCitations?: string[];
}

// ---- tunables (deterministic thresholds; calibrate against real BGE-M3 later) ----
export interface RetrievalOpts {
  kChunks?: number;        // vec NN breadth over chunks
  kNodes?: number;         // vec NN breadth over nodes
  hops?: number;           // graph expansion radius (1 = immediate neighbours)
  groundingThreshold?: number;  // min similarity for a chunk to "support" the leaf
  maxTrustTier?: number;   // a leaf is 🟢-coverable only on chunks at/under this tier (prefer 0)
}
const DEFAULTS: Required<RetrievalOpts> = {
  kChunks: 6, kNodes: 4, hops: 1, groundingThreshold: 0.30, maxTrustTier: 0,
};

const rows = (db: RetrievalDB, sql: string): any[] => db.executeSync(sql).rows?._array ?? [];
const quote = (ids: string[]) => ids.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(',');

/** 1-hop (or hops) graph expansion from seed nodes over `edges` (undirected). Returns reached
 *  node ids + the chunk ids the traversed edges cite (the graph-supported evidence). Pure SQL. */
export function expandGraph(db: RetrievalDB, seedNodeIds: string[], hops: number): { nodes: string[]; chunkIds: string[] } {
  const reached = new Set(seedNodeIds);
  const chunkIds = new Set<string>();
  let frontier = seedNodeIds;
  for (let h = 0; h < hops && frontier.length; h++) {
    const next: string[] = [];
    for (const e of rows(db, `SELECT src_id,dst_id,source_chunk_id FROM edges WHERE src_id IN (${quote(frontier)}) OR dst_id IN (${quote(frontier)})`)) {
      if (e.source_chunk_id) chunkIds.add(e.source_chunk_id);
      for (const nid of [e.src_id, e.dst_id]) if (!reached.has(nid)) { reached.add(nid); next.push(nid); }
    }
    frontier = next;
  }
  return { nodes: [...reached], chunkIds: [...chunkIds] };
}

/** Community ids the given nodes belong to (seeds community-report context). */
export function communitiesOf(db: RetrievalDB, nodeIds: string[]): string[] {
  if (!nodeIds.length) return [];
  const cs = new Set<string>();
  for (const r of rows(db, `SELECT DISTINCT community_id FROM node_community WHERE node_id IN (${quote(nodeIds)})`)) cs.add(r.community_id);
  return [...cs];
}

function fetchChunks(db: RetrievalDB, ids: string[]): Map<string, Chunk> {
  const m = new Map<string, Chunk>();
  if (!ids.length) return m;
  for (const c of rows(db, `SELECT id,kind,text,source_citation,trust_tier FROM chunks WHERE id IN (${quote(ids)})`)) m.set(c.id, c as Chunk);
  return m;
}

/** Coverage = is the leaf grounded by retrieved evidence? Deterministic; feeds E4. A leaf is
 *  covered iff a supporting chunk (similarity ≥ threshold) exists at/under maxTrustTier. Citation
 *  overlap with the leaf's own source is surfaced (strong grounding) but tier+threshold decide. */
export function computeCoverage(
  leafCitation: string | null,
  context: RetrievedChunk[],
  opts: Required<RetrievalOpts>,
): Coverage {
  const supporting = context.filter((c) => c.score >= opts.groundingThreshold);
  const grounded = supporting.filter((c) => (c.trust_tier ?? 99) <= opts.maxTrustTier);
  const covered = grounded.length > 0;
  const best = (covered ? grounded : supporting)[0];
  return {
    covered,
    score: best?.score,
    topTrustTier: covered ? Math.min(...grounded.map((c) => c.trust_tier ?? 99)) : (best?.trust_tier ?? null),
    supportingCitations: [...new Set((covered ? grounded : supporting).map((c) => c.source_citation).filter((x): x is string => !!x))],
  };
}

/** Full local-search retrieval for a query, scoped to a leaf (whose citation we try to ground).
 *  Orchestrates embed → vec NN (chunks+nodes) → graph expansion → cited, trust-ordered context → coverage. */
export function retrieve(
  db: RetrievalDB,
  query: string,
  leafCitation: string | null,
  embed: Embed,
  knn: Knn,
  options: RetrievalOpts = {},
): RetrievalResult {
  const o = { ...DEFAULTS, ...options };
  const qv = embed(query);

  // 1 · vector NN over both planes
  const chunkHits = knn('chunk_vec', qv, o.kChunks);
  const seedNodes = knn('node_vec', qv, o.kNodes);

  // 2 · graph expansion from the seed nodes → extra (graph-supported) chunks + community context
  const expanded = expandGraph(db, seedNodes.map((h) => h.id), o.hops);
  const communities = communitiesOf(db, expanded.nodes);

  // 3 · assemble cited context: vector-hit chunks (with their score) ∪ graph chunks (inherit best
  //     neighbour score, capped below direct hits so vector evidence ranks first)
  const fetched = fetchChunks(db, [...new Set([...chunkHits.map((h) => h.id), ...expanded.chunkIds])]);
  const scoreOf = new Map(chunkHits.map((h) => [h.id, h.score]));
  const graphScore = (seedNodes[0]?.score ?? 0) * 0.5; // graph evidence is supporting, not primary
  const context: RetrievedChunk[] = [];
  for (const [id, ch] of fetched) {
    const isVector = scoreOf.has(id);
    context.push({ ...ch, score: isVector ? scoreOf.get(id)! : graphScore, via: isVector ? 'vector' : 'graph' });
  }
  // 4 · order: trust_tier asc (prefer canonical), then score desc
  context.sort((a, b) => (a.trust_tier ?? 99) - (b.trust_tier ?? 99) || b.score - a.score);

  const coverage = computeCoverage(leafCitation, context, o);
  return { chunks: context, seedNodes, expandedNodes: expanded.nodes, communities, coverage };
}

/** On-device knn adapter (reference; not run in laptop tests). op-sqlite + sqlite-vec.
 *  vec0 returns L2 distance; for L2-normalized vectors similarity = 1 - dist²/2, clamped to [0,1]. */
export function makeVec0Knn(db: RetrievalDB): Knn {
  return (table, queryEmbedding, k) => {
    const blob = Buffer.from(queryEmbedding.buffer).toString('hex');
    const sql = `SELECT ${table === 'chunk_vec' ? 'chunk_id AS id' : 'node_id AS id'}, distance
                 FROM ${table} WHERE embedding MATCH x'${blob}' ORDER BY distance LIMIT ${k}`;
    return rows(db, sql).map((r: any) => ({ id: r.id, score: Math.max(0, 1 - (r.distance * r.distance) / 2) }));
  };
}
