# cloud/tests/test_parity.py
import os, importlib.util
from kyro_engine.loader import load_spine
from kyro_engine.executor import run
from test_derive import HM

def _load_conformance():
    p = os.path.join(os.path.dirname(__file__), '..', '..', 'edge', 'e3', 'conformance.py')
    spec = importlib.util.spec_from_file_location("conformance", p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

def test_engine_matches_edge_oracle():
    MOCK = os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro')
    conf = _load_conformance(); nodes, edges, root = conf.load(MOCK); sp = load_spine(MOCK)
    for raw in (HM, {**HM,'age_yr':10}, {**HM,'gcs_e':7}):
        assert run(sp, raw).action == conf.traverse(nodes, edges, root, raw)[0]
