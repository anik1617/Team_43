# Kyro — Cloud / Knowledge-Bundle Pipeline (Aniket's stream)

Builds the **signed SQLite bundle `edh-core-v{N}.kyro`** — the single seam between the
cloud build plane and the offline edge app. See [`../docs/08-build-plan-and-task-split.md`](../docs/08-build-plan-and-task-split.md) §1–§2.

## What's here now (hour-one: the MOCK bundle)

A schema-correct, signed mock so the **edge stream is never blocked** waiting on the real
GraphRAG pipeline. It matches the locked contract exactly (manifest + L2 chunks/nodes/edges/vecs
+ L1 `cgt_*` spine, 4-action vocab).

```
kyro_bundle/
  schema.py        # THE SEAM in code — DDL copied verbatim from doc 08 §1 (single source of truth)
  embedders.py     # pluggable: HashEmbedder (mock, now) | BgeM3Embedder (real, step ③)
  signing.py       # ed25519 sign/verify + the canonical-digest rule the edge app must mirror
  mock_content.py  # 8 EDH chunks + 8 nodes + edges + a tiny placeholder CGT (real spine = Gowrish)
  build_mock.py    # assembles + signs -> bundles/edh-core-v0-mock.kyro
  verify.py        # reference verifier = the Python SPEC for Gowrish's E1 loader checks
bundles/           # built artifacts (the .kyro file is committed for easy pull)
keys/              # dev_signer.pub (committed, pin this) | dev_signer.key (gitignored)
```

## Build / verify

```bash
cd cloud
python -m venv .venv && . .venv/Scripts/activate    # Windows; use .venv/bin/activate on *nix
pip install -r requirements.txt

python -m kyro_bundle.build_mock                     # -> bundles/edh-core-v0-mock.kyro
python -m kyro_bundle.verify bundles/edh-core-v0-mock.kyro
```

## For the EDGE stream (Gowrish)

- **Pin** `keys/dev_signer.pub` as the trusted signer; reject any bundle whose embedded
  pubkey doesn't match it. (The embedded `signer_pubkey` is a hint, not the root of trust.)
- **Mirror** `verify.py`'s checks in E1: manifest signature → CGT signature → pinned-key →
  embedder/version match. The canonical-digest rule is documented at the top of `signing.py`.
- The mock's `embedder_id = "mock-hash-1024"` — your real-BGE-M3 device build will (correctly)
  REJECT it on the embedder guard. To exercise E2 retrieval against the mock, mirror
  `HashEmbedder.embed()` for queries, or wait for the real `bge-m3` bundle (step ③).

## Roadmap (this stream)

`C1` ingestion (FastAPI+PyMuPDF) → `C2` de-id (Presidio) → `C3` GraphRAG build (**BGE-M3 override** — the #1 killer) → `C5` real bundle compiler (swap `HashEmbedder` → `BgeM3Embedder`, one line) → `C6` distribution endpoint → `C7` expert portal (Next.js/Vercel) → `C8` synthetic dialogues. Then fork `medLLMbenchmark` for the harness.
