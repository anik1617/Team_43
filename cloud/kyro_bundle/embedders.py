"""
Pluggable embedders. The bundle compiler depends on the `Embedder` interface only,
so swapping the mock for real BGE-M3 (step ③) is a one-line change in build_*.py.

WHY this abstraction matters: the #1 project-killer is the cloud index living in a
DIFFERENT vector space than the on-device embedder. The manifest pins `embedder_id` +
`embedder_dim`; the app REFUSES any bundle whose ids don't match its own. So the
embedder identity is part of the contract, not an implementation detail — it is stamped
into the manifest straight from `Embedder.id`.
"""

from __future__ import annotations

import hashlib

import numpy as np

from .schema import EMBEDDING_DIM


class Embedder:
    """Minimal interface every embedder satisfies."""

    id: str = "abstract"
    dim: int = EMBEDDING_DIM

    def embed(self, text: str) -> np.ndarray:  # returns float32[dim], L2-normalized
        raise NotImplementedError

    def embed_many(self, texts: list[str]) -> list[np.ndarray]:
        """Batch embed. Default maps embed() per text; real embedders override for GPU batching.
        Per-text output MUST match embed() (no cross-text interaction) — attention masking makes
        BGE-M3 batch results per-text-identical to single encodes, so parity is unaffected."""
        return [self.embed(t) for t in texts]


class HashEmbedder(Embedder):
    """
    Deterministic pseudo-embedder for the HOUR-ONE MOCK bundle.

    Same text -> same vector, every run, every machine. This unblocks the edge stream's
    plumbing (load → sqlite-vec NN → graph expansion → traversal) WITHOUT a 2 GB model
    download. It is NOT semantically meaningful: nearest-neighbour results are arbitrary.

    The id is deliberately `mock-hash-1024` (NOT `bge-m3`) so the on-device app's
    embedder-mismatch check correctly REJECTS this bundle in production — the mock is for
    wiring, never for a real demo. Gowrish can mirror this exact function on-device to
    exercise E2 end-to-end against the mock.
    """

    id = "mock-hash-1024"

    def __init__(self, dim: int = EMBEDDING_DIM):  # noqa: D401
        self.dim = dim

    def embed(self, text: str) -> np.ndarray:
        # Seed a PRNG from a stable hash of the normalized text → reproducible vector.
        seed = int.from_bytes(hashlib.sha256(text.strip().lower().encode("utf-8")).digest()[:8], "big")
        rng = np.random.default_rng(seed)
        v = rng.standard_normal(self.dim).astype(np.float32)
        n = np.linalg.norm(v)
        return v / n if n > 0 else v


class BgeM3Embedder(Embedder):
    """
    Real embedder for step ③ → the production bundle. Stubbed until the BGE-M3 env is up.

    CRITICAL when this goes live:
      • model: BAAI/bge-m3, dense embeddings, dim=1024
      • the EXACT same model weights + pooling must run on-device (llama.rn embedding ctx)
        or retrieval returns garbage. Pin the model revision; record it in the manifest.
      • GraphRAG's settings.yaml must be overridden to use THIS, not the OpenAI default.
    """

    id = "bge-m3"

    def __init__(self, dim: int = EMBEDDING_DIM):
        self.dim = dim
        self._model = None

    def _lazy_load(self):
        if self._model is None:
            # Deferred so the mock path never needs the dependency installed.
            from FlagEmbedding import BGEM3FlagModel  # noqa: F401  (step ③ dependency)

            # use_fp16=False (was True): fp16 GPU inference is NOT bit-reproducible across
            # architectures; the corpus is tiny so fp32 speed is irrelevant and determinism
            # matters for the build plane. (Part B: even fp32 won't byte-match the device —
            # NN-order stability, not byte-identity, is the real bar.)
            self._model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=False)
        return self._model

    def embed(self, text: str) -> np.ndarray:
        model = self._lazy_load()
        out = model.encode([text], return_dense=True)["dense_vecs"][0]
        v = np.asarray(out, dtype=np.float32)
        n = np.linalg.norm(v)
        return v / n if n > 0 else v

    def embed_many(self, texts: list[str]) -> list[np.ndarray]:
        """GPU-batched encode (BGE-M3 batches a list internally). Per-text output matches embed()
        — attention masking makes batched results per-text-identical, so corpus vectors + parity
        are unaffected; this is purely a build-speed optimization for the ~13k-vector full corpus."""
        model = self._lazy_load()
        out = model.encode(list(texts), return_dense=True, batch_size=64)["dense_vecs"]
        res = []
        for row in out:
            v = np.asarray(row, dtype=np.float32)
            n = np.linalg.norm(v)
            res.append(v / n if n > 0 else v)
        return res
