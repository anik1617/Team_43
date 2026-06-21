/**
 * E1 — SEAM PARITY HARNESS. Proves the ported JS digest (canonicalDigest.ts) reproduces the
 * cloud signer's canonical digest BYTE-FOR-BYTE, against the real signed .kyro bundle.
 *
 * It reads the same bundle the cloud signed (via node:sqlite), runs the ported encoders with
 * node:crypto sha256, and asserts the hex equals the golden vectors printed by the Python side
 * (`python -m kyro_bundle.test_signing`). If these match, on-device ed25519 verification will pass:
 * same digest + same embedded signature + same pinned pubkey ⇒ same verify result.
 *
 * Run (no npm install needed — Node 22 built-ins only):
 *   node --experimental-sqlite --experimental-strip-types edge/e1/parity.ts [path/to/bundle.kyro]
 *
 * Golden hexes are PER-FILE (manifest.created_at varies per build). Re-grab them from
 * test_signing.py whenever the cloud rebuilds the bundle; never compare across rebuilds.
 */

import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { manifestDigest, cgtDigest, type Query } from './canonicalDigest.ts';

// Golden vectors for cloud/bundles/edh-core-v0-mock.kyro (from `python -m kyro_bundle.test_signing`).
const GOLDEN = {
  manifest: 'b61dfaf35b02e43a7d02e9648d6b9ac562e67e7c3103f863f5028a0e9ca8d8a3',
  cgt: 'd3dcdecbee5df4b01fa1a07c298b7e929d432dfa964cf5a6f16ddbfa8707f154',
};

const dbPath = process.argv[2] ?? 'cloud/bundles/edh-core-v0-mock.kyro';
const db = new DatabaseSync(dbPath);

// HARNESS-ONLY substitution: node:sqlite v22.11 can't loadExtension, so the vec0 tables
// (chunk_vec/node_vec) are unreadable here. We independently proved (Python, sqlite-vec loaded)
// that chunk_vec.chunk_id === chunks.id and node_vec.node_id === nodes.id, so we read the vec
// id-lists from the base tables. The encoded table name ('chunk_vec_ids'/'node_vec_ids') is
// hardcoded in canonicalDigest.ts and rows are bytewise-sorted, so this yields an IDENTICAL
// table — a golden-hash match is itself proof the id-sets are equal. SHIPPING canonicalDigest.ts
// is unchanged: on-device op-sqlite has sqlite-vec loaded and reads the real vec tables.
const VEC_SUBST: Record<string, string> = {
  'SELECT chunk_id FROM chunk_vec': 'SELECT id FROM chunks',
  'SELECT node_id FROM node_vec': 'SELECT id FROM nodes',
};
const q: Query = (sql) =>
  db.prepare(VEC_SUBST[sql] ?? sql).all().map((row) => Object.values(row as Record<string, unknown>) as any);

const sha256 = (b: Uint8Array): Uint8Array => new Uint8Array(createHash('sha256').update(b).digest());

const manHex = Buffer.from(manifestDigest(q, sha256)).toString('hex');
const cgtHex = Buffer.from(cgtDigest(q, sha256)).toString('hex');

const manPass = manHex === GOLDEN.manifest;
const cgtPass = cgtHex === GOLDEN.cgt;

console.log(`bundle: ${dbPath}\n`);
console.log(`[${manPass ? 'PASS' : 'FAIL'}] manifest digest`);
console.log(`        got    ${manHex}`);
console.log(`        golden ${GOLDEN.manifest}`);
console.log(`[${cgtPass ? 'PASS' : 'FAIL'}] cgt digest`);
console.log(`        got    ${cgtHex}`);
console.log(`        golden ${GOLDEN.cgt}`);

const ok = manPass && cgtPass;
console.log(`\nRESULT: ${ok ? 'PARITY GREEN — TS reproduces the cloud digests' : 'PARITY FAILED'}`);
db.close();
process.exit(ok ? 0 : 1);
