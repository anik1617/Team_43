# cloud/tests/test_ablation.py
import os
from kyro_engine.loader import load_spine
from kyro_harness.vignettes import load_cases
from kyro_harness.ablation import run_arm

MOCK = os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro')

def _idx(cases, cid):
    return next(i for i, c in enumerate(cases) if c.id == cid)

def test_arm4_gate_forces_abstain_on_invalid():
    sp = load_spine(MOCK); cases = load_cases()
    rows4 = run_arm(4, sp, cases)
    assert rows4[_idx(cases, 'INVALID')][0] == 'ABSTAIN_STOP'

def test_arm3_and_arm4_agree_on_hm_and_are_aligned():
    sp = load_spine(MOCK); cases = load_cases()
    r3 = run_arm(3, sp, cases); r4 = run_arm(4, sp, cases)
    assert len(r3) == len(r4) == len(cases)
    hi = _idx(cases, 'HM')
    assert r3[hi][0] == r4[hi][0] == 'GUIDE'
    # rows carry (got, expected, must_abstain) aligned to cases order
    for row, c in zip(r3, cases):
        assert row[1] == c.expected_action and row[2] == c.must_abstain
