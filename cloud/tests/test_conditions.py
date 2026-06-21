# cloud/tests/test_conditions.py
from kyro_engine.conditions import to_py, cond_true

def test_to_py_translates_grammar():
    assert to_py("gcs_total <= 8") == "gcs_total <= 8"
    assert to_py("mechanism = 'rta'") == "mechanism == 'rta'"
    assert to_py("x <> 'none'") == "x != 'none'"
    assert to_py("age_yr BETWEEN 15 AND 49") == "(15 <= age_yr <= 49)"

def test_cond_true_evaluates_against_env():
    env = {"gcs_total": 7, "mechanism": "rta", "herniation_signs": True}
    assert cond_true("gcs_total <= 8 AND mechanism = 'rta'", env) is True
    assert cond_true("herniation_signs = true", env) is True
    assert cond_true("gcs_total > 12", env) is False
    assert cond_true("true", env) is True

def test_cond_true_is_sandboxed():
    import pytest
    with pytest.raises(Exception):
        cond_true("__import__('os')", {})
