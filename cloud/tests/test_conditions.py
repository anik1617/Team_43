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
    # the AST whitelist rejects any escape attempt (no eval/compile anywhere)
    import pytest
    with pytest.raises(Exception):
        cond_true("__import__('os')", {})            # dunder Name -> unknown name
    with pytest.raises(Exception):
        cond_true("().__class__", {})                # Attribute access -> rejected
    with pytest.raises(Exception):
        cond_true("os.system('x')", {"os": object})  # Attribute on a real obj -> rejected
    with pytest.raises(Exception):
        cond_true("len([1,2])", {})                  # non-range Call -> rejected

def test_cond_true_chained_and_membership():
    # behavioral parity with the old eval for the grammar's harder forms
    assert cond_true("age_yr BETWEEN 15 AND 49", {"age_yr": 31}) is True
    assert cond_true("age_yr BETWEEN 15 AND 49", {"age_yr": 60}) is False
    assert cond_true("gcs_e NOT IN [3..15]", {"gcs_e": 7}) is False   # 7 in range(3,16)
    assert cond_true("gcs_e NOT IN [3..15]", {"gcs_e": 20}) is True

def test_cond_true_or_not_and_multiterm():
    # exercise every _eval branch: OR -> any(), unary NOT, multi-term AND chain
    env = {"a": 1, "b": 0, "mechanism": "fall"}
    assert cond_true("a = 1 OR b = 1", env) is True
    assert cond_true("a = 2 OR b = 1", env) is False
    assert cond_true("NOT a = 2", env) is True
    assert cond_true("a = 1 AND b = 0 AND mechanism = 'fall'", env) is True

def test_cond_true_notequal_and_string_membership():
    # evaluated <> (NotEq) and string-list IN/NOT IN (List literal path), parity with old eval
    env = {"mechanism": "fall", "side": "left"}
    assert cond_true("mechanism <> 'rta'", env) is True
    assert cond_true("mechanism <> 'fall'", env) is False
    assert cond_true("mechanism IN ['fall','rta']", env) is True
    assert cond_true("side NOT IN ['right','none']", env) is True
    assert cond_true("side NOT IN ['left','right']", env) is False
