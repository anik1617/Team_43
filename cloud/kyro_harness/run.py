# cloud/kyro_harness/run.py
"""Deterministic-arm runner: execute the L1 spine over the whole encoded vignette set and
score it. This is the regression arm — code (the deterministic CGT) decides every traversal,
the model is not in the loop — so its scores are the project's hard safety floor (zero harm,
full must-abstain recall). The same scored rows feed the ablation ladder (Task 10+): the
deterministic arm is the +spine rung against which the model-in-the-loop arms are compared."""
from __future__ import annotations

import os

from kyro_engine.executor import run as run_engine
from kyro_engine.loader import load_spine
from kyro_harness.score import Scores, score_run
from kyro_harness.vignettes import load_cases

DEFAULT_BUNDLE = os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro')


def deterministic_rows(bundle: str = DEFAULT_BUNDLE, cases=None):
    """Run the deterministic engine over every case, returning the (got, expected, must_abstain)
    tuples score_run consumes. The spine is loaded (and signature-verified) once and reused."""
    sp = load_spine(bundle)
    cs = cases if cases is not None else load_cases()
    return [(run_engine(sp, c.evidence).action, c.expected_action, c.must_abstain) for c in cs]


def deterministic_scores(bundle: str = DEFAULT_BUNDLE) -> Scores:
    """Score the deterministic arm over the full vignette set."""
    return score_run(deterministic_rows(bundle))
