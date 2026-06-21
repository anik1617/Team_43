# cloud/tests/test_ablation.py
import os
import pytest
from kyro_engine.loader import load_spine
from kyro_harness import narrator
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


@pytest.mark.skipif(narrator.model_available(),
                    reason="model present — arm 2 would actually run")
def test_arm2_raises_clearly_without_model():
    # On the build plane (no GGUF) the +graph arm must fail LOUDLY, not silently mis-score.
    sp = load_spine(MOCK); cases = load_cases()
    with pytest.raises(RuntimeError, match="arm 2"):
        run_arm(2, sp, cases, bundle=MOCK)


def test_unknown_arm_rejected():
    sp = load_spine(MOCK); cases = load_cases()
    with pytest.raises(ValueError, match="unknown ablation arm"):
        run_arm(99, sp, cases)


def test_grounded_prompt_is_pure_and_carries_context():
    # arm 2's prompt builder needs no model — it just injects retrieved context + the case.
    p = narrator.grounded_prompt("31yo, GCS 7, blown left pupil", "[1] (BTF 2016) evacuate acute EDH")
    assert "BTF 2016" in p and "blown left pupil" in p
    assert "GUIDE" in p and "ABSTAIN_STOP" in p           # the 4-action instruction is present
    # empty context degrades to an explicit placeholder, never a blank
    assert "(no relevant context retrieved)" in narrator.grounded_prompt("case", "")
