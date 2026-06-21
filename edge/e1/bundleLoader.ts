/**
 * E1 — Kyro bundle loader + verifier  (edge / React Native)
 * branch: gowrish/edge-app
 *
 * Loads a signed `edh-core-v{N}.kyro` SQLite bundle, verifies it, and hands E2–E5 an open DB.
 * Mirrors the reference spec in `cloud/kyro_bundle/verify.py` — the SAME checks, in the SAME order.
 *
 * DESIGN LAW: FAIL CLOSED. Any failed check throws `BundleRejected`; the bundle is NOT used.
 * The app PINS the trusted signer key — it never trusts the bundle's embedded pubkey blindly.
 *
 * SEAM RESOLVED (commit c17a9ad): the cloud signer now hashes a language-neutral canonical
 *   row-walk (not Python iterdump). The identical rule lives in `./canonicalDigest.ts` (ported
 *   verbatim from cloud/kyro_bundle/bundleLoader.reference.ts). Parity is PROVEN: `edge/e1/parity.ts`
 *   reproduces the cloud golden hexes for edh-core-v0-mock.kyro (manifest b61dfaf3…, cgt d3dcdecb…).
 *   Signature verification is now LIVE — there is no dev-skip.
 *
 * Deps (installed):  @op-engineering/op-sqlite · @noble/curves (ed25519) · @noble/hashes (sha2)
 *   @noble/curves v2 exposes ed25519 at '@noble/curves/ed25519.js' with a SYNC verify(sig,msg,pub)→bool;
 *   @noble/hashes v2 moved sha256 to '@noble/hashes/sha2.js'. (The bare '@noble/curves/ed25519' and
 *   '@noble/hashes/sha256' subpaths do NOT resolve under Metro/bundler exports — keep the '.js'.)
 * Conformance oracles:  `python -m kyro_bundle.verify cloud/bundles/edh-core-v0-mock.kyro`
 *                       `node --experimental-sqlite --experimental-strip-types edge/e1/parity.ts`
 *                       `node --experimental-sqlite edge/e1/verifyV1Check.mjs cloud/bundles/edh-core-v1.kyro`
 */

import { open, type DB } from '@op-engineering/op-sqlite';
import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { manifestDigest, cgtDigest, type Query, type Cell } from './canonicalDigest';

/** This device's embedder + the pinned signer key. A bundle that doesn't match is rejected. */
export interface DeviceConfig {
  embedderId: string;        // real device ships 'bge-m3'; the v0 mock ships 'mock-hash-1024'
  embedderDim: number;       // 1024
  sqliteVecVersion: string;  // e.g. 'v0.1.9'
  pinnedPubkeyHex: string;   // hex of cloud/keys/dev_signer.pub, PINNED at build time
}

/**
 * The real config the shipping app PINS for edh-core-v1.kyro. The pinned pubkey is the dev signer
 * (cloud/keys/dev_signer.pub); embedder/version match the v1 manifest (bge-m3 / 1024 / v0.1.9).
 * PROVEN: `node --experimental-sqlite edge/e1/verifyV1Check.mjs cloud/bundles/edh-core-v1.kyro`
 * verifies BOTH ed25519 signatures against this pubkey and the embedder guard — fail-closed is safe.
 */
export const KYRO_DEVICE_CONFIG: DeviceConfig = {
  embedderId: 'bge-m3',
  embedderDim: 1024,
  sqliteVecVersion: 'v0.1.9',
  pinnedPubkeyHex: '5c5b7efeb258c2927f65019aa4cf032a8585fab449c818e66ab10018ddde65e2',
};

export interface Manifest {
  bundle_id: string; version: number; scope: string;
  embedder_id: string; embedder_dim: number; lang: string;
  graphrag_version: string; sqlite_vec_version: string;
  created_at: string; signature: string; signer_pubkey: string;
}

export interface LoadedBundle { db: DB; manifest: Manifest; }

export class BundleRejected extends Error {
  constructor(public readonly check: string, msg: string) {
    super(`[E1 REJECT · ${check}] ${msg}`);
    this.name = 'BundleRejected';
  }
}

export async function loadBundle(dbName: string, dev: DeviceConfig): Promise<LoadedBundle> {
  // 0 · open. sqlite-vec (vec0) auto-loads via the "op-sqlite": { "sqliteVec": true } flag in
  //     package.json — no loadExtension call is needed, so the vec0 tables are readable at READ time.
  const db = open({ name: dbName });
  const manifest = verifyOpenedBundle(db, dev);
  return { db, manifest };
}

/**
 * Run the full verification suite against an ALREADY-OPEN op-sqlite handle. Throws BundleRejected on
 * any failed check (FAIL CLOSED); returns the verified manifest otherwise. kyroDb uses this so it can
 * verify the exact DB it opened (with the right Android location + PRAGMA query_only) without re-opening.
 */
export function verifyOpenedBundle(db: DB, dev: DeviceConfig): Manifest {
  const manifest = readManifest(db);
  const cgtSignature = readScalar<string>(db, 'SELECT signature FROM cgt_meta');

  // q adapter: op-sqlite v17 exposes rawRows = Cell[][] already in SELECT column order. Fall back to
  // mapping rows (Array<Record<col,Scalar>>) → Object.values for safety if a build omits rawRows.
  const q: Query = (sql) => {
    const res = db.executeSync(sql);
    if (res.rawRows) return res.rawRows as Cell[][];
    return (res.rows ?? []).map((r: any) => Object.values(r) as Cell[]);
  };

  // 1 · manifest signature — ed25519 over the canonical whole-bundle digest (canonicalDigest.ts == signing.py)
  if (!verifyEd25519(manifestDigest(q, sha256), manifest.signature, manifest.signer_pubkey))
    throw new BundleRejected('manifest-signature', 'manifest ed25519 signature did not verify');

  // 2 · CGT spine signature — signed separately so the mentor can re-sign the tree alone
  if (!verifyEd25519(cgtDigest(q, sha256), cgtSignature, manifest.signer_pubkey))
    throw new BundleRejected('cgt-signature', 'CGT spine ed25519 signature did not verify');

  // 3 · pinned-key check — the embedded signer MUST be the key the app trusts
  if (manifest.signer_pubkey !== dev.pinnedPubkeyHex)
    throw new BundleRejected('pinned-key',
      `signer ${short(manifest.signer_pubkey)} is not the pinned key ${short(dev.pinnedPubkeyHex)}`);

  // 4 · embedder/version guard — THE #1 KILLER. Mismatch ⇒ retrieval is semantic garbage.
  if (manifest.embedder_id !== dev.embedderId ||
      manifest.embedder_dim !== dev.embedderDim ||
      manifest.sqlite_vec_version !== dev.sqliteVecVersion)
    throw new BundleRejected('embedder-mismatch',
      `bundle ${manifest.embedder_id}/${manifest.embedder_dim}/vec${manifest.sqlite_vec_version} ` +
      `≠ device ${dev.embedderId}/${dev.embedderDim}/vec${dev.sqliteVecVersion}`);

  return manifest;
}

// ---------- helpers ----------

function readManifest(db: DB): Manifest {
  // op-sqlite v17: executeSync().rows is Array<Record<col,Scalar>> — the array itself, no ._array wrapper.
  const row = db.executeSync('SELECT * FROM manifest LIMIT 1').rows?.[0];
  if (!row) throw new BundleRejected('no-manifest', 'bundle has no manifest row');
  return row as unknown as Manifest;
}

function readScalar<T>(db: DB, sql: string): T {
  const row = db.executeSync(sql).rows?.[0];
  if (!row) throw new BundleRejected('missing-row', `no row for: ${sql}`);
  return Object.values(row)[0] as T;
}

function verifyEd25519(digest: Uint8Array, sigHex: string, pubHex: string): boolean {
  // @noble/curves v2: ed25519.verify(sig, msg, pubkey) is synchronous and returns a boolean.
  try { return ed25519.verify(hexToBytes(sigHex), digest, hexToBytes(pubHex)); }
  catch { return false; }
}

function hexToBytes(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}
const short = (h: string) => (h ? h.slice(0, 8) + '…' : '(none)');
