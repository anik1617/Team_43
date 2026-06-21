# SEAM NOTE — the bundle signature digest isn't JS-portable (E1 ↔ signing.py)

**From:** edge (E1) · **For:** Aniket (cloud signer) · **Type:** seam-contract change, needs both sides

## The problem
`cloud/kyro_bundle/signing.py` signs **`SHA-256(Python sqlite3.iterdump() text)`** and its docstring calls this *"language-portable."* In practice it is **not** reproducible in RN/JS:

- `iterdump()` emits a Python-specific SQL text format (statement ordering, `"table"` quoting, `''` string escaping, `X'…'` blob/real literals). Matching it byte-for-byte in JS means re-implementing SQLite's dump logic.
- The **manifest digest covers the WHOLE DB**, including the `chunk_vec` / `node_vec` **vec0 embedding blobs**, dumped as megabytes of hex. Reproducing those exactly on-device is impractical.

**Impact:** E1 cannot recompute the digest → **on-device ed25519 verification can't pass.** Pinned-key + embedder/version guards still work; the *signature* checks are blocked. (E1 currently runs with `__devSkipSignature` so E2–E5 dev isn't blocked — but that's not shippable.)

## Proposed fix — a text-only canonical row serialization (both planes implement identically)
Sign over a deterministic, language-neutral byte string. **No `iterdump`, no vec0 blobs.**

**Tables, in this fixed order** (signature-bearing columns blanked first, as today):
`manifest` (signature='' , signer_pubkey='') · `chunks` · `nodes` · `edges` · `node_community` · `cgt_nodes` · `cgt_edges` · `cgt_strings` · `cgt_meta` (signature='').

**Serialization (define once, port exactly):**
- For each table: emit `GS(0x1d) + table_name + "\n"`.
- Rows: `SELECT *` then **sort rows by the full tuple** (deterministic regardless of insertion order).
- Each row: column values **in schema/column order**, encoded:
  - `NULL` → the byte `0x00`
  - INTEGER → decimal string (`str(v)` / `String(v)`)
  - REAL → **fixed precision**: Python `f"{v:.6f}"` == JS `v.toFixed(6)` (only `edges.weight` is real)
  - TEXT → raw UTF-8 bytes
  - join values with **US (0x1f)**
- Join rows with **RS (0x1e)**.
- `digest = SHA-256(utf-8 of the whole string)`.

`cgt_digest` = the same rule scoped to the four `cgt_*` tables only (so the mentor can re-sign the tree alone — keep that property).

## Why excluding the vec0 embeddings from the signature is safe
The **safety-critical content is signed**: the CGT tree (`cgt_*`), the chunk **texts + citations**, the graph, and the manifest pins (embedder id/dim, version). A corrupted/tampered **embedding** only degrades *retrieval ranking* — which is already caught by the runtime **coverage/grounding check** — it cannot flip a clinical decision (the deterministic tree decides; embeddings only fetch supporting text). Embedding integrity → a lightweight separate check (row-count parity + a sampled-norm hash) is a fine **hardening** item, not v1-blocking.

## The ask
1. Aniket: change `manifest_digest` / `cgt_digest` in `signing.py` to the rule above, re-sign the mock + real bundles.
2. Gowrish: implement the identical rule in `edge/e1/bundleLoader.ts` (`canonical*Digest`), delete the `__devSkipSignature` path.
3. Conformance test: `python -m kyro_bundle.verify <bundle>` must say VALID **and** E1 must verify the same bundle — run both on the same `.kyro` before calling it done.

*(15-min change each side. Until it lands, E1's pinned-key + embedder guards are live; signatures run in dev-skip.)*
