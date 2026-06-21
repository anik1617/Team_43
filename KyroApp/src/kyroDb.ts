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

const BUNDLE = 'edh-core-v0-mock.kyro';
let _db: DB | null = null;

/** The DB shim the engine consumes (loadSpine / retrieval use executeSync; canonicalDigest uses q). */
export interface EngineDb {
  executeSync: (sql: string) => { rows: { _array: any[] } };
  q: (sql: string) => any[][];
  raw: DB;
}

async function ensureOpen(): Promise<DB> {
  if (!_db) {
    await moveAssetsDatabase({ filename: BUNDLE, path: 'sqlite', overwrite: true }); // copy out of APK assets
    _db = open({ name: BUNDLE, location: Platform.OS === 'ios' ? IOS_LIBRARY_PATH : ANDROID_DATABASE_PATH });
    _db.executeSync('PRAGMA query_only = ON'); // enforce read-only at the SQL layer
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
};
