# cloud/kyro_harness/ablation.py
"""Ablation-ladder arm runners — the rungs of the spine-ablation collapse chart.

Each arm produces the same ``(got, expected, must_abstain)`` row shape ``score.score_run``
consumes, ALIGNED to the cases order, so any arm can be scored and stacked against the others.
The ladder (the single most persuasive validation artifact) is:

  arm 1  bare Qwen            — model alone, NO spine/graph/gate (the floor; model libs needed)
  arm 2  +graph              — model + retrieved L2 graph context (RAG), still NO spine
  arm 3  +spine              — the deterministic CGT alone decides every traversal
  arm 4  +spine +gate        — arm 3 plus an explicit validation belt over the spine

Arms 3 and 4 are pure/deterministic (no model). Arms 1 and 2 need a real GGUF model + llama-cpp,
so their imports are LAZY: this module must import cleanly on the build plane where model libs are
absent, and the model arms only fail (loudly) at call time. Arm 2 additionally needs the signed
bundle (for retrieval) — hence the ``bundle`` arg. The narrative arm 2 carries: even GIVEN the
same cited knowledge (RAG), a 3B model without the spine still mis-triages — so the lift is the
spine, not the knowledge. On our 10 mentor-signed cases arms 3 and 4 are identical — the spine
already abstains on invalid input (N99), so the explicit gate is redundant insurance, not a
correction. That is expected and correct."""
from __future__ import annotations

from kyro_engine.derive import derive
from kyro_engine.executor import run as run_engine

ABSTAIN = 'ABSTAIN_STOP'


def run_arm(arm: int, spine, cases, bundle: str = None) -> list:
    """Run one ablation arm over ``cases``, returning ``(got, expected, must_abstain)`` tuples
    aligned 1:1 (same length and order) to ``cases`` — ready for ``score.score_run``.

    arm 3 (spine alone):  got = the deterministic engine's action.
    arm 4 (spine + gate): got = the engine's action, then an explicit validation belt forces
                          ABSTAIN_STOP if the derived env says GCS is invalid or a critical field
                          is missing. derive() is pure/idempotent on a dict() copy, so re-deriving
                          here costs nothing and keeps executor.run's signature stable (the parity
                          test depends on it — do NOT add a return_env flag to run()).
    arm 1 (bare Qwen):    model-only; narrator imported lazily so this module loads without the
                          model libs. Raises a clear RuntimeError when no model is available.
    arm 2 (+graph):       model + retrieved L2 context. Per case: render prose -> retrieve cited
                          context from ``bundle`` (pure) -> grounded model call. Needs BOTH a model
                          AND ``bundle``; raises clearly if either is missing. The retrieval is
                          pure (kyro_engine.retrieval); only the final phrasing call uses the model.
    """
    if arm == 3:
        return [(run_engine(spine, c.evidence).action, c.expected_action, c.must_abstain)
                for c in cases]

    if arm == 4:
        rows = []
        for c in cases:
            got = run_engine(spine, c.evidence).action
            env = derive(dict(c.evidence))                      # pure on a copy; never mutates c
            if env.get('gcs_valid') is False or env.get('any_critical_field_missing'):
                got = ABSTAIN
            rows.append((got, c.expected_action, c.must_abstain))
        return rows

    if arm == 1:
        from kyro_harness import narrator                       # lazy: model libs only needed here
        if not narrator.model_available():
            raise RuntimeError(
                "arm 1 requires a model; set KYRO_QWEN_GGUF + install llama-cpp-python")
        return [(narrator.bare_qwen_action(narrator.render_prose(c.evidence)),
                 c.expected_action, c.must_abstain) for c in cases]

    if arm == 2:
        from kyro_harness import narrator                       # lazy: model libs only needed here
        if not narrator.model_available():
            raise RuntimeError(
                "arm 2 (+graph) requires a model; set KYRO_QWEN_GGUF + install llama-cpp-python")
        if not bundle:
            raise ValueError("arm 2 (+graph) requires the signed bundle path for retrieval")
        from kyro_engine import retrieval
        conn = retrieval.open_bundle_ro(bundle)                  # fresh=False — never deletes
        try:
            embed = retrieval.make_embed_for_bundle(conn)
            knn = retrieval.make_vec0_knn(conn)
            rows = []
            for c in cases:
                prose = narrator.render_prose(c.evidence)
                result = retrieval.retrieve(conn, prose, None, embed, knn)   # pure
                context = retrieval.format_context(result)
                got = narrator.grounded_qwen_action(prose, context)          # the model talks
                rows.append((got, c.expected_action, c.must_abstain))
            return rows
        finally:
            conn.close()

    raise ValueError(f"unknown ablation arm: {arm!r}")
