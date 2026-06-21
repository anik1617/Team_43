/**
 * E1 — canonical bundle digest (the JS side of the SEAM).
 *
 * PORTED VERBATIM from cloud/kyro_bundle/bundleLoader.reference.ts (Aniket, commit c17a9ad).
 * It reproduces signing.py's canonical-digest rule BYTE-FOR-BYTE so on-device ed25519
 * verification passes for a genuine `.kyro` and fails for a tampered one.
 *
 * ⚠️ DO NOT EDIT the encoders / column specs / table order independently — they are one
 *   contract with signing.py (single source of truth: the signing.py docstring). If the cloud
 *   rule changes, re-sync this file from bundleLoader.reference.ts and re-run edge/e1/parity.ts.
 *
 * Parity proven: edge/e1/parity.ts reproduces the golden hexes for edh-core-v0-mock.kyro
 *   (manifest b61dfaf3…, cgt d3dcdecb…) — see that file's header.
 */

const HEADER = utf8('kyro-canon-v1|');
const WEIGHT_SCALE = 1_000_000;

export type ColType = 'TEXT' | 'INT' | 'WEIGHT'; // WEIGHT = REAL quantized to int micro-units
export type Cell = string | number | bigint | null;
/** q(sql) must return rows as arrays of cells in the SELECTed column order. */
export type Query = (sql: string) => Cell[][];

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** 8-byte big-endian length prefix — identical to Python int.to_bytes(8, "big"). hi is 0 in practice. */
function len8(n: number): Uint8Array {
  const out = new Uint8Array(8);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, Math.floor(n / 2 ** 32)); // high word (0 for any real bundle)
  dv.setUint32(4, n >>> 0);                 // low word
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

/** enc(value) = tag(1) || len(payload) 8-byte BE || payload. Driven by the DECLARED column type,
 *  NEVER the JS runtime type — op-sqlite may hand an INTEGER back as number OR string, and that
 *  must not flip the tag ('I' vs 'S'). That ambiguity is the single most likely seam-breaker. */
function encField(value: Cell, type: ColType): Uint8Array {
  if (value === null || value === undefined) return concat([utf8('N'), len8(0)]);
  let tag: string;
  let payload: Uint8Array;
  switch (type) {
    case 'TEXT':
      tag = 'S'; payload = utf8(String(value)); break;
    case 'INT':
      tag = 'I'; payload = utf8(typeof value === 'bigint' ? value.toString() : String(value)); break;
    case 'WEIGHT': {
      // floor(w * 1e6 + 0.5) — explicit half-up, identical to signing.py._weight_micro
      const micro = Math.floor(Number(value) * WEIGHT_SCALE + 0.5);
      tag = 'I'; payload = utf8(String(micro)); break;
    }
  }
  return concat([utf8(tag), len8(payload.length), payload]);
}

function encRow(row: Cell[], types: ColType[]): Uint8Array {
  return concat(row.map((v, i) => encField(v, types[i])));
}

/** Bytewise comparison of two encoded rows — the ONLY ordering rule (no SQL ORDER BY). */
function byteCompare(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

function encTable(name: string, rows: Cell[][], types: ColType[]): Uint8Array {
  const bodies = rows.map((r) => encRow(r, types)).sort(byteCompare);
  const parts: Uint8Array[] = [encField(name, 'TEXT'), encField(rows.length, 'INT')];
  for (const body of bodies) parts.push(len8(body.length), body);
  return concat(parts);
}

interface TableSpec { name: string; types: ColType[]; rows: Cell[][]; }

function digestOf(name: 'manifest' | 'cgt', tables: TableSpec[], sha256: (b: Uint8Array) => Uint8Array): Uint8Array {
  const stream = concat([
    HEADER,
    utf8(name),                                       // raw, NOT length-prefixed (matches signing.py._digest)
    ...tables.map((t) => encTable(t.name, t.rows, t.types)),
  ]);
  return sha256(stream);
}

// ---- the two bundle digests. Column ORDER and TYPES must match signing.py exactly. ----

export function manifestDigest(q: Query, sha256: (b: Uint8Array) => Uint8Array): Uint8Array {
  const tables: TableSpec[] = [
    { name: 'manifest', types: ['TEXT', 'INT', 'TEXT', 'TEXT', 'INT', 'TEXT', 'TEXT', 'TEXT', 'TEXT'],
      rows: q('SELECT bundle_id,version,scope,embedder_id,embedder_dim,lang,graphrag_version,sqlite_vec_version,created_at FROM manifest') },
    { name: 'chunks', types: ['TEXT', 'TEXT', 'TEXT', 'TEXT', 'TEXT', 'INT'],
      rows: q('SELECT id,kind,text,source_citation,source_doc_id,trust_tier FROM chunks') },
    { name: 'nodes', types: ['TEXT', 'TEXT', 'TEXT', 'TEXT', 'INT'],
      rows: q('SELECT id,name,type,description,trust_tier FROM nodes') },
    { name: 'edges', types: ['TEXT', 'TEXT', 'TEXT', 'WEIGHT', 'TEXT'],
      rows: q('SELECT src_id,dst_id,relation,weight,source_chunk_id FROM edges') },
    { name: 'node_community', types: ['TEXT', 'TEXT', 'INT'],
      rows: q('SELECT node_id,community_id,level FROM node_community') },
    { name: 'cgt_nodes', types: ['TEXT', 'TEXT', 'TEXT', 'INT', 'TEXT', 'TEXT', 'INT'],
      rows: q('SELECT id,kind,field,required,action,source_citation,trust_tier FROM cgt_nodes') },
    { name: 'cgt_edges', types: ['TEXT', 'TEXT', 'TEXT'],
      rows: q('SELECT src_id,dst_id,condition FROM cgt_edges') },
    { name: 'cgt_strings', types: ['TEXT', 'TEXT', 'TEXT', 'TEXT'],
      rows: q('SELECT node_id,lang,prompt,recommendation FROM cgt_strings') },
    { name: 'cgt_meta', types: ['TEXT', 'INT', 'TEXT'],
      rows: q('SELECT root_id,version,signature FROM cgt_meta') },
    { name: 'chunk_vec_ids', types: ['TEXT'], rows: q('SELECT chunk_id FROM chunk_vec') },
    { name: 'node_vec_ids', types: ['TEXT'], rows: q('SELECT node_id FROM node_vec') },
  ];
  return digestOf('manifest', tables, sha256);
}

export function cgtDigest(q: Query, sha256: (b: Uint8Array) => Uint8Array): Uint8Array {
  const tables: TableSpec[] = [
    { name: 'cgt_nodes', types: ['TEXT', 'TEXT', 'TEXT', 'INT', 'TEXT', 'TEXT', 'INT'],
      rows: q('SELECT id,kind,field,required,action,source_citation,trust_tier FROM cgt_nodes') },
    { name: 'cgt_edges', types: ['TEXT', 'TEXT', 'TEXT'],
      rows: q('SELECT src_id,dst_id,condition FROM cgt_edges') },
    { name: 'cgt_strings', types: ['TEXT', 'TEXT', 'TEXT', 'TEXT'],
      rows: q('SELECT node_id,lang,prompt,recommendation FROM cgt_strings') },
    { name: 'cgt_meta', types: ['TEXT', 'INT'],  // signature column EXCLUDED (it's what we're verifying)
      rows: q('SELECT root_id,version FROM cgt_meta') },
  ];
  return digestOf('cgt', tables, sha256);
}

/** Cheap non-crypto belt: the vec id-lists are already signed, but asserting the id SETS line up
 *  with the base tables catches accidental drift fast with a clearer error than a sig failure. */
export function assertVecIdsConsistent(q: Query): boolean {
  const ids = (sql: string) => new Set(q(sql).map((r) => String(r[0])));
  const eq = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));
  return eq(ids('SELECT id FROM chunks'), ids('SELECT chunk_id FROM chunk_vec'))
      && eq(ids('SELECT id FROM nodes'), ids('SELECT node_id FROM node_vec'));
}
