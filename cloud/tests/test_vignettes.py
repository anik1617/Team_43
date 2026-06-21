# cloud/tests/test_vignettes.py
"""Pins the encoded Tier-A vignette set: it loads + is well-formed, AND every encoded
case, run through the deterministic engine over the mock bundle, reaches its mentor-signed
expected_action. This second test is the load-bearing one — it proves the encoding is
faithful to the spine, not merely declared."""
import os

from kyro_harness.vignettes import Case, load_cases


def test_cases_load_and_are_well_formed():
    cases = load_cases()
    assert len(cases) >= 9
    assert all(isinstance(c, Case) for c in cases)
    # ids are unique
    assert len({c.id for c in cases}) == len(cases)
    hm = next(c for c in cases if c.id == 'HM')
    assert hm.evidence['gcs_e'] == 1 and hm.expected_action == 'GUIDE'
    # HM must carry the full 22-key raw-evidence conformance template
    _CONFORMANCE_KEYS = {
        'mechanism', 'mechanism_class', 'time_since_injury_hr', 'gcs_e', 'gcs_v', 'gcs_m',
        'pupil_size_l_mm', 'pupil_react_l', 'pupil_size_r_mm', 'pupil_react_r', 'sbp_mmhg',
        'age_yr', 'spo2_pct', 'spo2_available', 'blood_glucose', 'glucose_available',
        'lucid_interval', 'focal_weakness_side', 'posturing', 'seizure_status',
        'anticoag_antiplatelet', 'known_coagulopathy'}
    assert _CONFORMANCE_KEYS <= set(hm.evidence), _CONFORMANCE_KEYS - set(hm.evidence)
    assert hm.evidence['mechanism_class'] == 'blunt'
    for c in cases:
        assert c.expected_action in ('GUIDE', 'OBSERVE', 'STABILIZE_TRANSFER', 'ABSTAIN_STOP')
        assert isinstance(c.must_abstain, bool)
        assert c.expected_mode in ('🟢', '🟡', '🔴')
        assert isinstance(c.evidence, dict) and c.evidence  # non-empty dict


def test_must_abstain_cases_are_the_abstain_actions():
    # a must_abstain case must encode an ABSTAIN_STOP expected action (and vice-versa is not
    # required: an ABSTAIN_STOP may be a safe grounded transfer, but a must_abstain IS a stop)
    for c in load_cases():
        if c.must_abstain:
            assert c.expected_action == 'ABSTAIN_STOP', c.id


def test_every_encoded_case_reaches_its_expected_action():
    from kyro_engine.executor import run
    from kyro_engine.loader import load_spine
    sp = load_spine(os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro'))
    for c in load_cases():
        assert run(sp, c.evidence).action == c.expected_action, c.id


def test_every_encoded_case_reaches_its_expected_mode():
    # expected_mode is the badge the engine deterministically returns from the reached leaf;
    # pin it so a future spine string edit that changes a badge is caught here.
    from kyro_engine.executor import run
    from kyro_engine.loader import load_spine
    sp = load_spine(os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro'))
    for c in load_cases():
        assert run(sp, c.evidence).mode == c.expected_mode, c.id
