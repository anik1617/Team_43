# cloud/tests/test_mode.py
from kyro_engine.mode import parse_mode


def test_parse_mode_from_recommendation_tag():
    assert parse_mode("[RED / ABSTAIN_STOP] STOP. ...") == "🔴"
    assert parse_mode("[GREEN / OBSERVE] Admit and observe ...") == "🟢"
    assert parse_mode("[YELLOW - LABELED PRINCIPLE] ...") == "🟡"
    assert parse_mode("[GUIDE - operate-locally; RED at the act] ...") == "🟡"  # leading non-color tag
    assert parse_mode("no tag here") == "🟡"
    assert parse_mode("") == "🟡"
    assert parse_mode(None) == "🟡"
