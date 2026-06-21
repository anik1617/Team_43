/**
 * kyroDb — op-sqlite adapter that lets the edge engine (engine/*) read the bundled .kyro on-device.
 *
 * Bridges op-sqlite v17 to the engine's DB shim:
 *  • op-sqlite executeSync().rows is a PLAIN array; the engine expects rows._array → we wrap it.
 *  • canonicalDigest's Query wants Cell[][] in column order → op-sqlite gives that as `rawRows`.
 *
 * The .kyro ships inside the APK at android/app/src/main/assets/sqlite/. On Android the APK is a zip,
 * so there's no real path to an asset → moveAssetsDatabase() copies it into the app DB dir first, then
 * open() opens it from ANDROID_DATABASE_PATH. PRAGMA query_only enforces read-only (op-sqlite has no
 * readonly flag). sqlite-vec (vec0 tables) is built into op-sqlite and auto-loads via the
 * "op-sqlite": { "sqliteVec": true } flag in package.json — no loadExtension call needed.
 *
 * API (matches useKyroEncounter.ts):
 *   kyroDb.open()                 → the engine DB shim (executeSync + q + raw); call once, cached.
 *   kyroDb.readLeafText(id, lang) → the leaf's authored cgt_strings recommendation (sync; after open()).
 */

import { open, moveAssetsDatabase, ANDROID_DATABASE_PATH, IOS_LIBRARY_PATH, type DB } from '@op-engineering/op-sqlite';
import { Platform } from 'react-native';
import { verifyOpenedBundle, KYRO_DEVICE_CONFIG, BundleRejected } from '../engine/e1/bundleLoader';

// The REAL signed bundle (1415 chunks, bge-m3 1024-d, ed25519-signed with the pinned dev key).
// The v0 mock stays in assets/sqlite/ as a fallback reference, but the app loads v1.
const BUNDLE = 'edh-core-v1.kyro';

/**
 * Fail-closed switch. PROVEN safe for edh-core-v1.kyro on the laptop
 * (`node --experimental-sqlite edge/e1/verifyV1Check.mjs cloud/bundles/edh-core-v1.kyro` → PASS:
 * both ed25519 sigs verify, signer == pinned key, embedder guard matches). When true, a
 * BundleRejected from verifyOpenedBundle() throws out of open() and the app must show a "bundle
 * invalid" state — it MUST NOT serve guidance from an unverified bundle. If a future on-device issue
 * (e.g. op-sqlite reading vec0 differently) made v1 fail to verify on the phone, flip this to
 * false to fall back to verify-and-warn while the lead investigates — do NOT brick the demo.
 */
const FAIL_CLOSED_ON_REJECT = true;

let _db: DB | null = null;
let _bundleError: BundleRejected | Error | null = null;

/** The DB shim the engine consumes (loadSpine / retrieval use executeSync; canonicalDigest uses q). */
export interface EngineDb {
  executeSync: (sql: string) => { rows: { _array: any[] } };
  q: (sql: string) => any[][];
  raw: DB;
}

async function ensureOpen(): Promise<DB> {
  if (!_db) {
    await moveAssetsDatabase({ filename: BUNDLE, path: 'sqlite', overwrite: true }); // copy out of APK assets
    const db = open({ name: BUNDLE, location: Platform.OS === 'ios' ? IOS_LIBRARY_PATH : ANDROID_DATABASE_PATH });
    db.executeSync('PRAGMA query_only = ON'); // enforce read-only at the SQL layer

    // VERIFY BEFORE SERVING. Run the full ed25519 + pinned-key + embedder suite on the bundle the app
    // is about to use. FAIL CLOSED: a rejected bundle must never reach the engine — we record the error
    // (so the UI can show a "bundle invalid" state) and, when FAIL_CLOSED_ON_REJECT, refuse to open.
    try {
      verifyOpenedBundle(db, KYRO_DEVICE_CONFIG);
      _bundleError = null;
    } catch (e) {
      _bundleError = e instanceof Error ? e : new Error(String(e));
      if (FAIL_CLOSED_ON_REJECT) {
        try { db.close(); } catch {} // don't leave an unverified handle open
        throw _bundleError; // open()/ensureOpen() rejects → app shows "bundle invalid", never serves guidance
      }
      // verify-and-warn mode (demo safety valve): keep going but loudly flag the unverified bundle.
      console.warn('[kyroDb] bundle verification FAILED but FAIL_CLOSED_ON_REJECT is off:', _bundleError.message);
    }
    _db = db;
  }
  return _db;
}

export const kyroDb = {
  /** Open (once) and return the engine DB shim. */
  async open(): Promise<EngineDb> {
    const db = await ensureOpen();
    return {
      executeSync: (sql: string) => ({ rows: { _array: db.executeSync(sql).rows } }),
      q: (sql: string) => db.executeSync(sql).rawRows as any[][],
      raw: db,
    };
  },

  /** The leaf's authored recommendation string from cgt_strings (null if absent / db not open). */
  readLeafText(nodeId: string, lang: string = 'en'): string | null {
    if (!_db) return null;
    const row = _db.executeSync('SELECT recommendation FROM cgt_strings WHERE node_id = ? AND lang = ?', [nodeId, lang]).rows[0] as any;
    return (row?.recommendation as string) ?? null;
  },

  /**
   * The last bundle-verification error, or null if the loaded bundle verified (or open() not called yet).
   * Lets the UI render a "bundle invalid" state. Under FAIL_CLOSED_ON_REJECT this is also thrown out of
   * open(), but in verify-and-warn mode a non-null value here is the only signal the bundle is untrusted.
   */
  bundleError(): Error | null {
    return _bundleError;
  },
};
