/**
 * AGENT B SAFETY CHECK (throwaway): prove cloud/bundles/edh-core-v1.kyro passes the SAME
 * verification loadBundle() runs on-device, BEFORE we enable fail-closed.
 *
 * Recomputes the canonical manifest + cgt digests over v1.kyro (reusing canonicalDigest.ts logic,
 * inlined here as ESM because the source is .ts), then verifies BOTH ed25519 signatures against the
 * embedded signer_pubkey AND asserts that pubkey == the pinned dev key.
 *
 * Uses the SAME @noble v2 packages the app ships (KyroApp/node_modules) so a PASS here ==
 * a PASS on-device (modulo op-sqlite reading the real vec0 tables, which node:sqlite can't —
 * we substitute the vec id-lists from the base tables exactly like edge/e1/parity.ts, which is
 * proven equivalent because chunk_vec.chunk_id===chunks.id and node_vec.node_id===nodes.id).
 *
 * Run:  node --experimental-sqlite edge/e1/verifyV1Check.mjs [path/to/bundle.kyro]
 */
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { ed25519 } from 'file:///C:/Users/gowri/mb_hack/Team_43/KyroApp/node_modules/@noble/curves/ed25519.js';
import { sha256 } from 'file:///C:/Users/gowri/mb_hack/Team_43/KyroApp/node_modules/@noble/hashes/sha2.js';
import { readFileSync } from 'node:fs';

// ---- canonicalDigest.ts logic, inlined (kept byte-equivalent to edge/e1/canonicalDigest.ts) ----
const enc = new TextEncoder();
const utf8 = (s) => enc.encode(s);
const HEADER = utf8('kyro-canon-v1|');
const WEIGHT_SCALE = 1_000_000;
function len8(n) {
  const out = new Uint8Array(8); const dv = new DataView(out.buffer);
  dv.setUint32(0, Math.floor(n / 2 ** 32)); dv.setUint32(4, n >>> 0); return out;
}
function concat(parts) {
  let total = 0; for (const p of parts) total += p.length;
  const out = new Uint8Array(total); let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; } return out;
}
function encField(value, type) {
  if (value === null || value === undefined) return concat([utf8('N'), len8(0)]);
  let tag, payload;
  switch (type) {
    case 'TEXT': tag = 'S'; payload = utf8(String(value)); break;
    case 'INT': tag = 'I'; payload = utf8(typeof value === 'bigint' ? value.toString() : String(value)); break;
    case 'WEIGHT': { const micro = Math.floor(Number(value) * WEIGHT_SCALE + 0.5); tag = 'I'; payload = utf8(String(micro)); break; }
  }
  return concat([utf8(tag), len8(payload.length), payload]);
}
const encRow = (row, types) => concat(row.map((v, i) => encField(v, types[i])));
function byteCompare(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}
function encTable(name, rows, types) {
  const bodies = rows.map((r) => encRow(r, types)).sort(byteCompare);
  const parts = [encField(name, 'TEXT'), encField(rows.length, 'INT')];
  for (const body of bodies) parts.push(len8(body.length), body);
  return concat(parts);
}
function digestOf(name, tables) {
  const stream = concat([HEADER, utf8(name), ...tables.map((t) => encTable(t.name, t.rows, t.types))]);
  return new Uint8Array(createHash('sha256').update(stream).digest());
}
function manifestDigest(q) {
  return digestOf('manifest', [
    { name: 'manifest', types: ['TEXT','INT','TEXT','TEXT','INT','TEXT','TEXT','TEXT','TEXT'], rows: q('SELECT bundle_id,version,scope,embedder_id,embedder_dim,lang,graphrag_version,sqlite_vec_version,created_at FROM manifest') },
    { name: 'chunks', types: ['TEXT','TEXT','TEXT','TEXT','TEXT','INT'], rows: q('SELECT id,kind,text,source_citation,source_doc_id,trust_tier FROM chunks') },
    { name: 'nodes', types: ['TEXT','TEXT','TEXT','TEXT','INT'], rows: q('SELECT id,name,type,description,trust_tier FROM nodes') },
    { name: 'edges', types: ['TEXT','TEXT','TEXT','WEIGHT','TEXT'], rows: q('SELECT src_id,dst_id,relation,weight,source_chunk_id FROM edges') },
    { name: 'node_community', types: ['TEXT','TEXT','INT'], rows: q('SELECT node_id,community_id,level FROM node_community') },
    { name: 'cgt_nodes', types: ['TEXT','TEXT','TEXT','INT','TEXT','TEXT','INT'], rows: q('SELECT id,kind,field,required,action,source_citation,trust_tier FROM cgt_nodes') },
    { name: 'cgt_edges', types: ['TEXT','TEXT','TEXT'], rows: q('SELECT src_id,dst_id,condition FROM cgt_edges') },
    { name: 'cgt_strings', types: ['TEXT','TEXT','TEXT','TEXT'], rows: q('SELECT node_id,lang,prompt,recommendation FROM cgt_strings') },
    { name: 'cgt_meta', types: ['TEXT','INT','TEXT'], rows: q('SELECT root_id,version,signature FROM cgt_meta') },
    { name: 'chunk_vec_ids', types: ['TEXT'], rows: q('SELECT chunk_id FROM chunk_vec') },
    { name: 'node_vec_ids', types: ['TEXT'], rows: q('SELECT node_id FROM node_vec') },
  ]);
}
function cgtDigest(q) {
  return digestOf('cgt', [
    { name: 'cgt_nodes', types: ['TEXT','TEXT','TEXT','INT','TEXT','TEXT','INT'], rows: q('SELECT id,kind,field,required,action,source_citation,trust_tier FROM cgt_nodes') },
    { name: 'cgt_edges', types: ['TEXT','TEXT','TEXT'], rows: q('SELECT src_id,dst_id,condition FROM cgt_edges') },
    { name: 'cgt_strings', types: ['TEXT','TEXT','TEXT','TEXT'], rows: q('SELECT node_id,lang,prompt,recommendation FROM cgt_strings') },
    { name: 'cgt_meta', types: ['TEXT','INT'], rows: q('SELECT root_id,version FROM cgt_meta') },
  ]);
}

// ---- run against the bundle ----
const PINNED = readFileSync('C:/Users/gowri/mb_hack/Team_43/cloud/keys/dev_signer.pub', 'utf8').trim();
const dbPath = process.argv[2] ?? 'cloud/bundles/edh-core-v1.kyro';
const db = new DatabaseSync(dbPath);

// node:sqlite can't load vec0; substitute id-lists from base tables (proven equal — see parity.ts).
const VEC_SUBST = { 'SELECT chunk_id FROM chunk_vec': 'SELECT id FROM chunks', 'SELECT node_id FROM node_vec': 'SELECT id FROM nodes' };
const q = (sql) => db.prepare(VEC_SUBST[sql] ?? sql).all().map((row) => Object.values(row));

const hexToBytes = (h) => { const o = new Uint8Array(h.length / 2); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; };

const manifest = db.prepare('SELECT * FROM manifest LIMIT 1').get();
const cgtSig = db.prepare('SELECT signature FROM cgt_meta').get().signature;

const manDigest = manifestDigest(q);
const cgtDig = cgtDigest(q);

const manVerify = ed25519.verify(hexToBytes(manifest.signature), manDigest, hexToBytes(manifest.signer_pubkey));
const cgtVerify = ed25519.verify(hexToBytes(cgtSig), cgtDig, hexToBytes(manifest.signer_pubkey));
const pinnedOk = manifest.signer_pubkey === PINNED;
const embedderOk = manifest.embedder_id === 'bge-m3' && manifest.embedder_dim === 1024 && manifest.sqlite_vec_version === 'v0.1.9';

console.log(`bundle: ${dbPath}`);
console.log(`manifest digest: ${Buffer.from(manDigest).toString('hex')}`);
console.log(`cgt digest:      ${Buffer.from(cgtDig).toString('hex')}`);
console.log(`[${manVerify ? 'PASS' : 'FAIL'}] manifest ed25519 signature verifies against embedded signer_pubkey`);
console.log(`[${cgtVerify ? 'PASS' : 'FAIL'}] cgt spine ed25519 signature verifies against embedded signer_pubkey`);
console.log(`[${pinnedOk ? 'PASS' : 'FAIL'}] embedded signer_pubkey == pinned dev key (${PINNED.slice(0,16)}...)`);
console.log(`[${embedderOk ? 'PASS' : 'FAIL'}] embedder guard: ${manifest.embedder_id}/${manifest.embedder_dim}/${manifest.sqlite_vec_version}`);

const ok = manVerify && cgtVerify && pinnedOk && embedderOk;
console.log(`\nRESULT: ${ok ? 'PASS — edh-core-v1.kyro passes full verification; fail-closed is SAFE' : 'FAIL — do NOT enable fail-closed'}`);
db.close();
process.exit(ok ? 0 : 1);
