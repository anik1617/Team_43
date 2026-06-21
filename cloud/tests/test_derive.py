# cloud/tests/test_derive.py
from kyro_engine.derive import derive

HM = dict(mechanism='rta', mechanism_class='blunt', time_since_injury_hr=3,
          gcs_e=1, gcs_v=2, gcs_m=4, pupil_size_l_mm=6, pupil_react_l='fixed',
          pupil_size_r_mm=3, pupil_react_r='brisk', sbp_mmhg=160, age_yr=31,
          spo2_pct=95, spo2_available='yes', blood_glucose=0, glucose_available='no',
          lucid_interval='yes', focal_weakness_side='right', posturing='none',
          seizure_status='none', anticoag_antiplatelet='none', known_coagulopathy='no')

def test_derive_computes_clinical_fields():
    e = derive(dict(HM))
    assert e['gcs_total'] == 7
    assert e['fixed_pupil_side'] == 'left'
    assert e['herniation_signs'] is True
    assert e['gcs_valid'] is True

def test_derive_flags_out_of_range_gcs():
    e = derive({**HM, 'gcs_e': 7})           # invalid component
    assert e['gcs_valid'] is False
    assert e['any_critical_field_missing'] is True

def test_derive_sbp_age_stratified():
    assert derive({**HM, 'age_yr': 60, 'sbp_mmhg': 95})['sbp_at_target'] is False
    assert derive({**HM, 'age_yr': 60, 'sbp_mmhg': 105})['sbp_at_target'] is True
