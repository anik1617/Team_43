# cloud/tests/test_regression.py
"""Deterministic-arm regression: the spine, run over the WHOLE encoded vignette set,
produces ZERO clinically-harmful actions and FULL must-abstain recall. This is the
load-bearing safety guarantee — it is the headline 'safety number' (must-abstain recall
on the irreducible set) and the 'zero harm' floor, proven over every case at once rather
than one fixture at a time."""
from kyro_harness.run import deterministic_scores


def test_deterministic_arm_zero_harm():
    s = deterministic_scores()
    assert s.harm_count == 0
    assert s.must_abstain_recall == 1.0
