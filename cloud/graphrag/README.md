# GraphRAG project — Kyro edh-core (extraction only)

This produces the **graph** (entities / relationships / communities / community_reports /
text_units). It does **not** produce the vectors we ship — `build_bundle.py` re-embeds the
text with BGE-M3 so the bundle vectors share one code path with the on-device embedder.

**Why decoupled?** Microsoft GraphRAG's embedding config only supports `openai` / `azure`
providers (+ an `api_base`) — there is no native BGE-M3 / HuggingFace provider. Rather than
stand up a BGE-M3-behind-OpenAI-compatible server just to throw its vectors away, we let
GraphRAG embed with whatever (discarded) and own the real embedding in `build_bundle.py`.
The only parity that matters is **our `BgeM3Embedder` ↔ llama.rn's BGE-M3 on the phone.**

## Run

```bash
cd cloud
pip install -r requirements.txt        # includes graphrag + FlagEmbedding (BGE-M3)

# 1. version-correct config skeleton (then merge our settings.yaml overrides + prompts):
graphrag init --root graphrag

# 2. credentials
cp graphrag/.env.example graphrag/.env  # fill GRAPHRAG_API_KEY / model

# 3. corpus: drop source .txt into graphrag/input/ (stem must match kyro_bundle/sources.py)

# 4. build the graph (cloud LLM; small corpus, no supercomputer)
graphrag index --root graphrag         # -> graphrag/output/*.parquet

# 5. compile + BGE-M3 embed + sign the real bundle
python -m kyro_bundle.build_bundle --root graphrag --version 1 --cgt spine/cgt.json
#   -> bundles/edh-core-v1.kyro
```

## Validate the compiler WITHOUT a real index (works today)

```bash
python -m kyro_bundle.build_bundle --selftest   # fabricates GraphRAG-shaped parquet
python -m kyro_bundle.verify bundles/edh-core-selftest.kyro
```

## The BGE-M3 parity check (the real #1-killer — hand this fixture to Gowrish/E0)

Embed the same string with our `BgeM3Embedder` and with llama.rn's BGE-M3 on-device;
assert cosine ≈ 1.0. If it diverges, it's a pooling/normalization mismatch between
FlagEmbedding and llama.cpp — fix before trusting any retrieval number.
