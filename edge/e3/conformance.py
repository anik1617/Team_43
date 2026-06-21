"""
E3 conformance harness — reference spine executor + traversal tests.

This is the PYTHON ORACLE for the TypeScript executor (edge/e3/spineExecutor.ts):
it loads the live cgt_* spine from a .kyro bundle and traverses it deterministically,
asserting that representative cases reach the correct leaf ACTION. The TS executor must
reproduce these paths. Code decides traversal — the model never does.

Run:  python edge/e3/conformance.py [path/to/bundle.kyro]
"""
import sqlite3, re, sys

DEFAULT_DB = r'C:\Users\gowri\mb_hack\Team_43\cloud\bundles\edh-core-v0-mock.kyro'


def load(db):
    c = sqlite3.connect(db)
    nodes = {r[0]: {'kind': r[1], 'field': r[2], 'action': r[3]}
             for r in c.execute("select id,kind,field,action from cgt_nodes")}
    edges = [{'src': r[0], 'dst': r[1], 'cond': r[2]}
             for r in c.execute("select src_id,dst_id,condition from cgt_edges")]
    root = c.execute("select root_id from cgt_meta").fetchone()[0]
    return nodes, edges, root


def to_py(cond):
    s = cond
    s = re.sub(r'\btrue\b', 'True', s); s = re.sub(r'\bfalse\b', 'False', s)
    s = s.replace('<>', '!=')
    s = re.sub(r'(?<![<>=!])=(?!=)', '==', s)
    s = re.sub(r'(\w+)\s+BETWEEN\s+(\d+)\s+AND\s+(\d+)', r'(\2 <= \1 <= \3)', s)
    s = re.sub(r'NOT\s+IN\s+\[(\d+)\.\.(\d+)\]',
              lambda m: f'not in range({int(m.group(1))},{int(m.group(2))+1})', s)
    s = re.sub(r'\bIN\b', 'in', s); s = re.sub(r'\bNOT\b', 'not', s)
    s = re.sub(r'\bAND\b', 'and', s); s = re.sub(r'\bOR\b', 'or', s)
    return s


def cond_true(cond, env):
    if cond == 'true':
        return True
    return bool(eval(to_py(cond), {'__builtins__': {}, 'range': range}, env))


# --- derivation layer: derived fields from raw evidence ---
# ⚠️ [VERIFY-MENTOR] the clinical formulas (herniation_signs, hypoglycaemia threshold,
# gcs_trend source) are encoded here to match the spine's intent — counter-sign at validation.
def derive(e):
    # ORDER-INDEPENDENCE (mirror of spineExecutor.ts): never lock a derived value off evidence not
    # yet gathered. gcs_known gates the two GCS-dependent derivations so incremental gather == full env.
    gcs_known = all(k in e for k in ('gcs_e', 'gcs_v', 'gcs_m'))
    e['gcs_total'] = (e['gcs_e'] + e['gcs_v'] + e['gcs_m']) if gcs_known else float('nan')
    lf, rf = e.get('pupil_react_l') == 'fixed', e.get('pupil_react_r') == 'fixed'
    e['bilateral_fixed'] = lf and rf
    e['fixed_pupil_side'] = 'left' if (lf and not rf) else 'right' if (rf and not lf) else 'none'
    if 'gcs_trend' not in e and gcs_known:
        e['gcs_trend'] = 'declining' if e['gcs_total'] < e.get('patient_baseline', 15) else 'stable'
    e['hypoxic'] = (e['spo2_available'] == 'yes' and e['spo2_pct'] < 94)
    e['spo2_unknown'] = (e['spo2_available'] == 'no')
    e['hypoglycemic'] = (e['glucose_available'] == 'yes' and e['blood_glucose'] < 60)  # [VERIFY-MENTOR] threshold
    e['glucose_unknown'] = (e['glucose_available'] == 'no')
    e['sbp_at_target'] = not ((50 <= e['age_yr'] <= 69 and e['sbp_mmhg'] < 100)
                              or ((15 <= e['age_yr'] <= 49 or e['age_yr'] > 70) and e['sbp_mmhg'] < 110))
    e['herniation_signs'] = (e['fixed_pupil_side'] != 'none' or e['bilateral_fixed']
                             or e['posturing'] != 'none' or e['gcs_trend'] == 'declining')  # [VERIFY-MENTOR]
    # meta-sentinels (S1–S4 + validation): clean valid input by default
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
    # validation override: out-of-range GCS components flip gcs_valid off (drives the S3 abstain).
    # Only when GCS is present, else a pre-gather derive() would falsely invalidate it.
    if gcs_known and not (1 <= e['gcs_e'] <= 4 and 1 <= e['gcs_v'] <= 5 and 1 <= e['gcs_m'] <= 6):
        e['gcs_valid'] = False; e['all_critical_fields_present'] = False; e['any_critical_field_missing'] = True
    return e


def traverse(nodes, edges, root, raw):
    env = derive(dict(raw)); cur = root; path = []
    for _ in range(60):
        n = nodes[cur]; path.append(cur)
        if n['action'] is not None:
            return n['action'], path
        nxt = next((e['dst'] for e in edges if e['src'] == cur and cond_true(e['cond'], env)), None)
        if nxt is None:
            return f'STUCK@{cur}', path
        cur = nxt
    return 'LOOP', path


# --- test cases: prove GUIDE / STABILIZE_TRANSFER / ABSTAIN_STOP all reachable ---
HM = dict(mechanism='rta', mechanism_class='blunt', time_since_injury_hr=3,
          gcs_e=1, gcs_v=2, gcs_m=4, pupil_size_l_mm=6, pupil_react_l='fixed',
          pupil_size_r_mm=3, pupil_react_r='brisk', sbp_mmhg=160, age_yr=31,
          spo2_pct=95, spo2_available='yes', blood_glucose=0, glucose_available='no',
          lucid_interval='yes', focal_weakness_side='right', posturing='none', seizure_status='none',
          anticoag_antiplatelet='none', known_coagulopathy='no')
PEDS = {**HM, 'age_yr': 10}
INVALID = {**HM, 'gcs_e': 7}  # out of range 1–4 → S3 abstain

CASES = [('HM herniating EDH, no transfer', HM, 'GUIDE'),
         ('Pediatric (age<15)', PEDS, 'STABILIZE_TRANSFER'),
         ('Invalid GCS input', INVALID, 'ABSTAIN_STOP')]


def main():
    db = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    nodes, edges, root = load(db)
    ok = True
    for name, raw, expected in CASES:
        action, path = traverse(nodes, edges, root, raw)
        passed = action == expected
        ok &= passed
        print(f"[{'PASS' if passed else 'FAIL'}] {name}: {action} (expected {expected})")
        print(f"       {' -> '.join(path)}")
    print("\nRESULT:", "ALL PASS" if ok else "FAILURES")
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
