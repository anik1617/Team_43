# cloud/tests/test_executor.py
import os
from kyro_engine.loader import load_spine
from kyro_engine.executor import run
from test_derive import HM             # reuse the fixture (run() calls derive() internally)

MOCK = os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro')

def test_run_three_canonical_cases():
    sp = load_spine(MOCK)
    assert run(sp, HM).action == 'GUIDE'
    assert run(sp, {**HM, 'age_yr': 10}).action == 'STABILIZE_TRANSFER'
    assert run(sp, {**HM, 'gcs_e': 7}).action == 'ABSTAIN_STOP'

def test_result_has_trajectory_and_leaf():
    r = run(load_spine(MOCK), HM)
    assert r.leaf_id and r.trajectory[0] == 'N00'
    assert r.action in ('GUIDE','OBSERVE','STABILIZE_TRANSFER','ABSTAIN_STOP')
