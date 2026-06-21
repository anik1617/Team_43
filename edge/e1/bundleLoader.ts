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
 * ⚠️ SEAM: the signature DIGEST is blocked on a portability fix — see
 *   `./SEAM-NOTE-digest-portability.md`. The cloud signer hashes Python `sqlite3.iterdump()`
 *   text, which is NOT reproducible in JS (esp. the vec0 embedding blobs). The signature checks
 *   below call `canonical*Digest()`, which MUST match the PORTABLE rule we lock with Aniket.
 *   Until then, run with `dev.__devSkipSignature = true` to build E2–E5 against the mock.
 *   The pinned-key + embedder/version guards are fully LIVE now.
 *
 * Deps (add in E0 scaffold):  @op-engineering/op-sqlite · @noble/ed25519 · @noble/hashes
 * Conformance oracle:  `python -m kyro_bundle.verify cloud/bundles/edh-core-v0-mock.kyro`
 */

import { open, type DB } from '@op-engineering/op-sqlite';
import * as ed25519 from '@noble/ed25519';

/** This device's embedder + the pinned signer key. A bundle that doesn't match is rejected. */
export interface DeviceConfig {
  embedderId: string;        // real device ships 'bge-m3'; the v0 mock ships 'mock-hash-1024'
  embedderDim: number;       // 1024
  sqliteVecVersion: string;  // e.g. 'v0.1.9'
  pinnedPubkeyHex: string;   // hex of cloud/keys/dev_signer.pub, PINNED at build time
  /** DEV ONLY — skip ed25519 sig checks while the portable-digest seam is unresolved. NEVER ship true. */
  __devSkipSignature?: boolean;
}

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
  // 0 · open + load sqlite-vec (vec0 tables need the extension at READ time, not just build)
  const db = open({ name: dbName });
  loadSqliteVec(db);

  const manifest = readManifest(db);
  const cgtSignature = readScalar<string>(db, 'SELECT signature FROM cgt_meta');

  if (!dev.__devSkipSignature) {
    // 1 · manifest signature — ed25519 over the canonical whole-bundle digest
    if (!(await verifyEd25519(canonicalManifestDigest(db), manifest.signature, manifest.signer_pubkey)))
      throw new BundleRejected('manifest-signature', 'manifest ed25519 signature did not verify');

    // 2 · CGT spine signature — signed separately so the mentor can re-sign the tree alone
    if (!(await verifyEd25519(canonicalCgtDigest(db), cgtSignature, manifest.signer_pubkey)))
      throw new BundleRejected('cgt-signature', 'CGT spine ed25519 signature did not verify');
  }

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

  return { db, manifest };
}

// ---------- helpers ----------

function loadSqliteVec(_db: DB): void {
  // op-sqlite: load the bundled sqlite-vec native lib so vec0 (chunk_vec/node_vec) is readable.
  // e.g. _db.loadExtension(resolveSqliteVecPath());   // E0 wires the resolved per-platform path
  // Confirm at E0: op-sqlite loads the sqlite-vec extension on a real arm64 device.
}

function readManifest(db: DB): Manifest {
  const row = db.executeSync('SELECT * FROM manifest LIMIT 1').rows?._array?.[0];
  if (!row) throw new BundleRejected('no-manifest', 'bundle has no manifest row');
  return row as unknown as Manifest;
}

function readScalar<T>(db: DB, sql: string): T {
  const row = db.executeSync(sql).rows?._array?.[0];
  if (!row) throw new BundleRejected('missing-row', `no row for: ${sql}`);
  return Object.values(row)[0] as T;
}

async function verifyEd25519(digest: Uint8Array, sigHex: string, pubHex: string): Promise<boolean> {
  try { return await ed25519.verifyAsync(hexToBytes(sigHex), digest, hexToBytes(pubHex)); }
  catch { return false; }
}

/**
 * ⚠️ BLOCKED ON THE SEAM FIX — see ./SEAM-NOTE-digest-portability.md.
 * These must byte-for-byte match the cloud signer. The current cloud rule (SHA-256 of Python
 * `sqlite3.iterdump()`) is not reproducible in JS. Implement BOTH sides to the proposed portable
 * text-serialization rule, then replace these throws with the real digest.
 */
function canonicalManifestDigest(_db: DB): Uint8Array {
  throw new BundleRejected('digest-not-portable', 'manifest digest pending portable-rule seam fix');
}
function canonicalCgtDigest(_db: DB): Uint8Array {
  throw new BundleRejected('digest-not-portable', 'cgt digest pending portable-rule seam fix');
}

function hexToBytes(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}
const short = (h: string) => (h ? h.slice(0, 8) + '…' : '(none)');
