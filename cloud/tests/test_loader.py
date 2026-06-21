# cloud/tests/test_loader.py
import os
from kyro_engine.loader import load_spine, BundleError
import pytest

MOCK = os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro')

def test_load_spine_reads_cgt():
    sp = load_spine(MOCK)
    assert sp.root == 'N00'
    assert len(sp.nodes) == 60
    assert sp.nodes['N40']['action'] == 'ABSTAIN_STOP'
    assert 'en' in sp.strings['L40']                  # L40 is a leaf that HAS an en string

def test_load_spine_verifies_signature_by_default():
    # a genuine bundle must verify cleanly (does NOT raise)
    load_spine(MOCK, verify=True)

def test_load_spine_rejects_missing_file():
    with pytest.raises(BundleError):
        load_spine('does-not-exist.kyro')
