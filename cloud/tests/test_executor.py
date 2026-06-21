# cloud/tests/test_executor.py
import os
from kyro_engine.loader import load_spine, Spine
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
    assert r.leaf_id == 'L21c' and r.trajectory[0] == 'N00'   # HM's known GUIDE leaf
    assert r.action in ('GUIDE','OBSERVE','STABILIZE_TRANSFER','ABSTAIN_STOP')

def _node(action=None):
    return {'kind': 'decision', 'field': 'x', 'action': action,
            'source_citation': None, 'trust_tier': None}

def test_run_no_edge_fires_is_stuck():
    sp = Spine(nodes={'A': _node()},
               edges=[{'src': 'A', 'dst': 'B', 'cond': 'gcs_total > 100'}],  # false for HM
               root='A')
    r = run(sp, HM)
    assert r.action == 'ABSTAIN_STOP' and r.stuck is True
    assert r.leaf_id == 'A' and r.trajectory == ['A']

def test_run_loop_exhaustion_leaf_id_matches_trajectory():
    sp = Spine(nodes={'A': _node(), 'B': _node()},
               edges=[{'src': 'A', 'dst': 'B', 'cond': 'true'},
                      {'src': 'B', 'dst': 'A', 'cond': 'true'}],
               root='A')
    r = run(sp, HM, max_steps=4)
    assert r.action == 'ABSTAIN_STOP' and r.stuck is True
    assert r.trajectory == ['A', 'B', 'A', 'B']
    assert r.leaf_id == r.trajectory[-1] == 'B'   # the fix: leaf_id is last VISITED, not advanced-to

def test_run_sets_mode_and_citations():
    sp = load_spine(MOCK)
    rH = run(sp, HM)
    assert rH.mode == '🟡'                # L21c leads with [GUIDE ...] (no color tag) -> default 🟡
    assert isinstance(rH.citations, list)  # citations collected along the path
    assert run(sp, {**HM, 'gcs_e': 7}).mode == '🟡'   # N99 has no string row -> default 🟡
