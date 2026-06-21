/**
 * REFERENCE mirror of cloud/kyro_bundle/signing.py for Gowrish's edge loader.
 *
 * This is the JS side of the SEAM. It reproduces the canonical-digest rule byte-for-byte
 * so on-device ed25519 verification of a `.kyro` bundle passes for a genuine bundle and
 * fails for a tampered one. Copy this into the edge repo as the core of `bundleLoader.ts`;
 * the column specs and ordering here MUST stay identical to signing.py (single source of
 * truth: the signing.py docstring).
 *
 * Dependencies (wire to whatever the app already uses):
 *   - sha256(bytes: Uint8Array) => Uint8Array            // e.g. @noble/hashes/sha256
 *   - ed25519Verify(msg, sig, pubKey) => boolean         // e.g. @noble/curves/ed25519
 *   - a sqlite handle (op-sqlite) to fetch rows
 *
 * CONFIRM PARITY before trusting it: build the mock bundle on the cloud side, run
 * `python -m kyro_bundle.test_signing`, take the printed `manifest digest` / `cgt digest`
 * hexes for THAT exact file, and assert this code reproduces them for the SAME file.
 * The hex is per-file (manifest.created_at varies per build) — never compare across rebuilds.
 */

// ----------------------------------------------------------------------------------------
// Canonical field / row / table / digest encoders. Mirror of signing.py _enc/_enc_table/_digest.
// ----------------------------------------------------------------------------------------

const HEADER = utf8("kyro-canon-v1|");
const WEIGHT_SCALE = 1_000_000;

type ColType = "TEXT" | "INT" | "WEIGHT"; // WEIGHT = REAL quantized to int micro-units
type Cell = string | number | bigint | null;

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** 8-byte big-endian length prefix. Payloads are tiny, but write the full 8 bytes so the
 *  stream is identical to Python's int.to_bytes(8, "big"). hi is 0 in practice. */
function len8(n: number): Uint8Array {
  const out = new Uint8Array(8);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, Math.floor(n / 2 ** 32)); // high word (0 for any real bundle)
  dv.setUint32(4, n >>> 0); // low word
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** enc(value) = tag(1) || len(payload) as 8-byte BE || payload.
 *  Encoder is driven by the DECLARED column type, never by the JS runtime type — op-sqlite
 *  may hand back an INTEGER column as a JS number OR string, and we must not let that flip
 *  the tag ('I' vs 'S'). That ambiguity is the single most likely way to break the seam. */
function encField(value: Cell, type: ColType): Uint8Array {
  if (value === null || value === undefined) {
    return concat([utf8("N"), len8(0)]);
  }
  let tag: string;
  let payload: Uint8Array;
  switch (type) {
    case "TEXT":
      tag = "S";
      payload = utf8(String(value));
      break;
    case "INT":
      tag = "I";
      payload = utf8(typeof value === "bigint" ? value.toString() : String(value));
      break;
    case "WEIGHT": {
      // floor(w * 1e6 + 0.5) — explicit half-up, identical formula to signing.py._weight_micro
      const micro = Math.floor(Number(value) * WEIGHT_SCALE + 0.5);
      tag = "I";
      payload = utf8(String(micro));
      break;
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
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function encTable(name: string, rows: Cell[][], types: ColType[]): Uint8Array {
  const bodies = rows.map((r) => encRow(r, types)).sort(byteCompare);
  const parts: Uint8Array[] = [
    encField(name, "TEXT"),
    encField(rows.length, "INT"),
  ];
  for (const body of bodies) parts.push(len8(body.length), body);
  return concat(parts);
}

interface TableSpec {
  name: string;
  types: ColType[];
  rows: Cell[][]; // fetched in the fixed column order below
}

function digest(
  name: "manifest" | "cgt",
  tables: TableSpec[],
  sha256: (b: Uint8Array) => Uint8Array
): Uint8Array {
  const stream = concat([
    HEADER,
    utf8(name), // raw, NOT length-prefixed (matches signing.py._digest)
    ...tables.map((t) => encTable(t.name, t.rows, t.types)),
  ]);
  return sha256(stream);
}

// ----------------------------------------------------------------------------------------
// The two bundle digests. Column ORDER and TYPES below must match signing.py exactly.
// `q(sql)` must return rows as arrays of cells in the SELECTed column order.
// ----------------------------------------------------------------------------------------

type Query = (sql: string) => Cell[][];

export function manifestDigest(q: Query, sha256: (b: Uint8Array) => Uint8Array): Uint8Array {
  const tables: TableSpec[] = [
    {
      name: "manifest",
      types: ["TEXT", "INT", "TEXT", "TEXT", "INT", "TEXT", "TEXT", "TEXT", "TEXT"],
      rows: q(
        "SELECT bundle_id,version,scope,embedder_id,embedder_dim,lang," +
          "graphrag_version,sqlite_vec_version,created_at FROM manifest"
      ),
    },
    {
      name: "chunks",
      types: ["TEXT", "TEXT", "TEXT", "TEXT", "TEXT", "INT"],
      rows: q("SELECT id,kind,text,source_citation,source_doc_id,trust_tier FROM chunks"),
    },
    {
      name: "nodes",
      types: ["TEXT", "TEXT", "TEXT", "TEXT", "INT"],
      rows: q("SELECT id,name,type,description,trust_tier FROM nodes"),
    },
    {
      name: "edges",
      types: ["TEXT", "TEXT", "TEXT", "WEIGHT", "TEXT"], // weight = WEIGHT (REAL -> micro int)
      rows: q("SELECT src_id,dst_id,relation,weight,source_chunk_id FROM edges"),
    },
    {
      name: "node_community",
      types: ["TEXT", "TEXT", "INT"],
      rows: q("SELECT node_id,community_id,level FROM node_community"),
    },
    {
      name: "cgt_nodes",
      types: ["TEXT", "TEXT", "TEXT", "INT", "TEXT", "TEXT", "INT"],
      rows: q("SELECT id,kind,field,required,action,source_citation,trust_tier FROM cgt_nodes"),
    },
    {
      name: "cgt_edges",
      types: ["TEXT", "TEXT", "TEXT"],
      rows: q("SELECT src_id,dst_id,condition FROM cgt_edges"),
    },
    {
      name: "cgt_strings",
      types: ["TEXT", "TEXT", "TEXT", "TEXT"],
      rows: q("SELECT node_id,lang,prompt,recommendation FROM cgt_strings"),
    },
    {
      name: "cgt_meta",
      types: ["TEXT", "INT", "TEXT"], // includes the spine signature -> binds it into the bundle
      rows: q("SELECT root_id,version,signature FROM cgt_meta"),
    },
    { name: "chunk_vec_ids", types: ["TEXT"], rows: q("SELECT chunk_id FROM chunk_vec") },
    { name: "node_vec_ids", types: ["TEXT"], rows: q("SELECT node_id FROM node_vec") },
  ];
  return digest("manifest", tables, sha256);
}

export function cgtDigest(q: Query, sha256: (b: Uint8Array) => Uint8Array): Uint8Array {
  const tables: TableSpec[] = [
    {
      name: "cgt_nodes",
      types: ["TEXT", "TEXT", "TEXT", "INT", "TEXT", "TEXT", "INT"],
      rows: q("SELECT id,kind,field,required,action,source_citation,trust_tier FROM cgt_nodes"),
    },
    {
      name: "cgt_edges",
      types: ["TEXT", "TEXT", "TEXT"],
      rows: q("SELECT src_id,dst_id,condition FROM cgt_edges"),
    },
    {
      name: "cgt_strings",
      types: ["TEXT", "TEXT", "TEXT", "TEXT"],
      rows: q("SELECT node_id,lang,prompt,recommendation FROM cgt_strings"),
    },
    {
      name: "cgt_meta",
      types: ["TEXT", "INT"], // signature column EXCLUDED (it's what we're verifying)
      rows: q("SELECT root_id,version FROM cgt_meta"),
    },
  ];
  return digest("cgt", tables, sha256);
}

// ----------------------------------------------------------------------------------------
// Full verify flow (mirror of cloud/kyro_bundle/verify.py). Returns true only if every
// gate passes. PIN the trusted signer pubkey in the app — never trust the embedded one.
// ----------------------------------------------------------------------------------------

export interface VerifyDeps {
  q: Query;
  hexToBytes: (hex: string) => Uint8Array;
  sha256: (b: Uint8Array) => Uint8Array;
  ed25519Verify: (msg: Uint8Array, sig: Uint8Array, pub: Uint8Array) => boolean;
}

export interface DeviceProfile {
  pinnedPubkeyHex: string; // the signer key baked into the app
  embedderId: string; // device's own BGE-M3 id
  embedderDim: number; // 1024
  sqliteVecVersion?: string; // optional exact-match guard
}

export function verifyBundle(d: VerifyDeps, dev: DeviceProfile): boolean {
  const [bundlePub, manSig] = (() => {
    const [row] = d.q("SELECT signer_pubkey,signature FROM manifest");
    return [String(row[0]), String(row[1])];
  })();
  const cgtSig = String(d.q("SELECT signature FROM cgt_meta")[0][0]);
  const [mRow] = d.q(
    "SELECT embedder_id,embedder_dim,sqlite_vec_version FROM manifest"
  );

  const pub = d.hexToBytes(bundlePub);

  // 1. pinned-key check FIRST — a valid signature from the wrong key is still a reject.
  if (bundlePub !== dev.pinnedPubkeyHex) return false;

  // 2. manifest signature (whole-bundle integrity; embeddings excluded, id-lists signed)
  if (!d.ed25519Verify(manifestDigest(d.q, d.sha256), d.hexToBytes(manSig), pub)) return false;

  // 3. cgt spine signature (signed separately so the mentor can re-sign the tree)
  if (!d.ed25519Verify(cgtDigest(d.q, d.sha256), d.hexToBytes(cgtSig), pub)) return false;

  // 4. embedder/version guard (the #1 killer: a dim/embedder mismatch silently corrupts retrieval)
  if (String(mRow[0]) !== dev.embedderId) return false;
  if (Number(mRow[1]) !== dev.embedderDim) return false;
  if (dev.sqliteVecVersion && String(mRow[2]) !== dev.sqliteVecVersion) return false;

  return true;
}

/**
 * Optional structural belt (cheap, non-crypto): the vec id-lists are already signed, but
 * asserting the id SETS line up with the base tables catches accidental drift fast and
 * gives a clearer error than an opaque signature failure.
 */
export function assertVecIdsConsistent(q: Query): boolean {
  const ids = (sql: string) => new Set(q(sql).map((r) => String(r[0])));
  const eq = (a: Set<string>, b: Set<string>) =>
    a.size === b.size && [...a].every((x) => b.has(x));
  return (
    eq(ids("SELECT id FROM chunks"), ids("SELECT chunk_id FROM chunk_vec")) &&
    eq(ids("SELECT id FROM nodes"), ids("SELECT node_id FROM node_vec"))
  );
}
