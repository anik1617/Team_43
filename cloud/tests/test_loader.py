# cloud/tests/test_loader.py
import os, shutil, sqlite3
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

def _tampered_copy(tmp_path, mutate_sql):
    dst = str(tmp_path / 'tampered.kyro')
    shutil.copy(MOCK, dst)
    c = sqlite3.connect(dst); c.execute(mutate_sql); c.commit(); c.close()
    return dst

def test_load_spine_rejects_tampered_content(tmp_path):
    # mutating a signed cgt_strings row breaks the manifest+cgt digests -> fail closed
    dst = _tampered_copy(tmp_path,
        "UPDATE cgt_strings SET recommendation = recommendation || ' X' WHERE node_id='L40'")
    with pytest.raises(BundleError):
        load_spine(dst)

def test_load_spine_rejects_null_signature(tmp_path):
    dst = _tampered_copy(tmp_path, "UPDATE cgt_meta SET signature=NULL")
    with pytest.raises(BundleError):
        load_spine(dst)

def test_verify_false_skips_tampered(tmp_path):
    # the skip path is genuinely different from the verify path: tampered bundle loads w/o raising
    dst = _tampered_copy(tmp_path,
        "UPDATE cgt_strings SET recommendation = recommendation || ' X' WHERE node_id='L40'")
    load_spine(dst, verify=False)
