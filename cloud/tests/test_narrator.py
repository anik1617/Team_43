# cloud/tests/test_narrator.py
import pytest
from kyro_harness.narrator import parse_action, render_prose, model_available, bare_qwen_action


def test_parse_action_maps_text_to_label():
    assert parse_action("...I would TRANSFER and stabilize...") == 'STABILIZE_TRANSFER'
    assert parse_action("Recommend OBSERVE with serial exams") == 'OBSERVE'
    assert parse_action("GUIDE the burr hole evacuation") == 'GUIDE'
    assert parse_action("I must ABSTAIN / stop, cannot localize") == 'ABSTAIN_STOP'
    assert parse_action("complete gibberish with no decision") in (
        'GUIDE', 'OBSERVE', 'STABILIZE_TRANSFER', 'ABSTAIN_STOP')  # never crashes; safe default


def test_render_prose_includes_key_fields():
    from kyro_harness.vignettes import load_cases
    hm = next(c for c in load_cases() if c.id == 'HM')
    p = render_prose(hm.evidence)
    assert isinstance(p, str) and len(p) > 0
    assert 'GCS' in p or 'gcs' in p


@pytest.mark.skipif(not model_available(), reason='Qwen GGUF / llama-cpp-python not available')
def test_bare_qwen_returns_a_valid_action():
    from kyro_harness.vignettes import load_cases
    hm = next(c for c in load_cases() if c.id == 'HM')
    a = bare_qwen_action(render_prose(hm.evidence))
    assert a in ('GUIDE', 'OBSERVE', 'STABILIZE_TRANSFER', 'ABSTAIN_STOP')
