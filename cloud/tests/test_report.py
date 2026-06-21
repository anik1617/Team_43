# cloud/tests/test_report.py
import os, json
from kyro_harness.score import score_run
from kyro_harness.report import render

def _scores(rows):
    return score_run(rows)

def test_render_writes_chart_confusion_and_json(tmp_path):
    # arm 3/4 strong, arm 1 weak (simulated) — 'arms_run' must record exactly the arms passed
    by_arm = {
        1: _scores([('GUIDE','ABSTAIN_STOP',True), ('GUIDE','STABILIZE_TRANSFER',False), ('OBSERVE','GUIDE',False)]),
        3: _scores([('ABSTAIN_STOP','ABSTAIN_STOP',True), ('STABILIZE_TRANSFER','STABILIZE_TRANSFER',False), ('GUIDE','GUIDE',False)]),
    }
    out = str(tmp_path)
    render(by_arm, out)
    assert os.path.exists(os.path.join(out, 'collapse.png'))
    assert os.path.exists(os.path.join(out, 'confusion.png'))
    j = json.load(open(os.path.join(out, 'results.json')))
    assert set(j['arms_run']) == {'1', '3'} or set(j['arms_run']) == {1, 3}
