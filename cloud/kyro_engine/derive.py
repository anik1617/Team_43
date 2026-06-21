# cloud/kyro_engine/derive.py
"""Derivation layer: derived clinical fields from raw evidence. Behavioral mirror of
edge/e3/conformance.py derive(). PARITY-CRITICAL: keep byte-equivalent in behavior —
when the edge derive() changes, this changes too (the Task 6 parity test enforces it).
Do NOT 'improve' the [VERIFY-MENTOR] clinical formulas; they are counter-signed as-is."""


# [VERIFY-MENTOR] the clinical formulas (herniation_signs, hypoglycaemia threshold,
# gcs_trend source) are encoded here to match the spine's intent — counter-sign at validation.
def derive(e: dict) -> dict:
    e['gcs_total'] = e['gcs_e'] + e['gcs_v'] + e['gcs_m']
    lf, rf = e['pupil_react_l'] == 'fixed', e['pupil_react_r'] == 'fixed'
    e['bilateral_fixed'] = lf and rf
    e['fixed_pupil_side'] = 'left' if (lf and not rf) else 'right' if (rf and not lf) else 'none'
    e.setdefault('gcs_trend', 'declining' if e['gcs_total'] < e.get('patient_baseline', 15) else 'stable')
    e['hypoxic'] = (e['spo2_available'] == 'yes' and e['spo2_pct'] < 94)
    e['spo2_unknown'] = (e['spo2_available'] == 'no')
    e['hypoglycemic'] = (e['glucose_available'] == 'yes' and e['blood_glucose'] < 60)  # [VERIFY-MENTOR] threshold
    e['glucose_unknown'] = (e['glucose_available'] == 'no')
    e['sbp_at_target'] = not ((50 <= e['age_yr'] <= 69 and e['sbp_mmhg'] < 100)
                              or ((15 <= e['age_yr'] <= 49 or e['age_yr'] > 70) and e['sbp_mmhg'] < 110))
    e['herniation_signs'] = (e['fixed_pupil_side'] != 'none' or e['bilateral_fixed']
                             or e['posturing'] != 'none' or e['gcs_trend'] == 'declining')  # [VERIFY-MENTOR]
    # meta-sentinels (S1-S4 + validation): clean valid input by default
    defaults = dict(patient_baseline=15, redflag_fired=False, red_terminal_reached=False,
                    field_supplied=True, field_revalidated=True, gcs_valid=True, pupils_valid=True,
                    bp_valid=True, all_critical_fields_present=True, any_critical_field_missing=False,
                    gcs_recapture_conflict=False, same_pupil_react_fixed_AND_brisk=False,
                    two_sbp_entries_diff_gt_40=False, cross_time_pupil_or_gcs_reversal_implausible=False,
                    pupil_change=False, new_focal_asymmetry=False, persistent_vomiting='no',
                    severe_or_increasing_headache='no', agitation='no', second_observer_confirmed='no',
                    teleconsult_available='no', transfer_feasible_within_window='no')
    for k, v in defaults.items():
        e.setdefault(k, v)
    # validation override: out-of-range GCS components flip gcs_valid off (drives the S3 abstain)
    if not (1 <= e['gcs_e'] <= 4 and 1 <= e['gcs_v'] <= 5 and 1 <= e['gcs_m'] <= 6):
        e['gcs_valid'] = False; e['all_critical_fields_present'] = False; e['any_critical_field_missing'] = True
    return e
