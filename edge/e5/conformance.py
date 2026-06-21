"""
E5 conformance harness — the continuity proof (reference state machine + handoff).

PYTHON ORACLE for edge/e5/stateMachine.ts + handoff.ts. It demonstrates the differentiator:
a call that DROPS mid-encounter loses NOTHING. Fields captured before the drop live in the
event journal; on reconnect we fold the journal back, resume E3, and reach the IDENTICAL leaf —
then build the SBAR handoff the neurosurgeon receives.

Proves:
  1. lossless drop/resume — evidence captured pre-drop survives; post-resume env == full env.
  2. determinism — drop+resume reaches the SAME leaf/action as the uninterrupted run.
  3. handoff integrity — the SBAR carries GCS, the fixed-pupil side, the GUIDE conclusion,
     the badge, and the explicit N40 drill-site ABSTAIN (the imaging wall).

Run:  python edge/e5/conformance.py [path/to/bundle.kyro]
"""
import importlib.util, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(mod, rel):
    spec = importlib.util.spec_from_file_location(mod, os.path.join(HERE, '..', rel))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

e3 = _load('e3conf', 'e3/conformance.py')
e4 = _load('e4conf', 'e4/conformance.py')

# Order the operator answers fields (gather sequence). The journal records each the instant it lands.
ORDER = ['mechanism', 'mechanism_class', 'time_since_injury_hr', 'anticoag_antiplatelet', 'known_coagulopathy',
         'gcs_e', 'gcs_v', 'gcs_m', 'pupil_size_l_mm', 'pupil_react_l', 'pupil_size_r_mm', 'pupil_react_r',
         'sbp_mmhg', 'age_yr', 'spo2_pct', 'spo2_available', 'blood_glucose', 'glucose_available',
         'lucid_interval', 'focal_weakness_side', 'posturing', 'seizure_status']


class Clock:
    def __init__(self): self.t = 0
    def __call__(self): self.t += 1; return self.t


# --- mirror of stateMachine.ts ---
def reduce(events):
    s = dict(encounterId='', evidence={}, trajectory=[], status='gathering', conclusion=None, escalation=None)
    for e in events:
        if e['t'] == 'started': s['encounterId'] = e['encounterId']
        elif e['t'] == 'evidence': s['evidence'][e['field']] = e['value']
        elif e['t'] == 'visited':
            if not s['trajectory'] or s['trajectory'][-1] != e['node']: s['trajectory'].append(e['node'])
        elif e['t'] == 'concluded': s['status'] = 'concluded'; s['conclusion'] = e
        elif e['t'] == 'escalated': s['status'] = 'escalated'; s['escalation'] = e['reason']
    return s


def resume_seed(events):
    return {e['field']: e['value'] for e in events if e['t'] == 'evidence'}


# --- mirror of handoff.ts buildHandoff (content assertions only) ---
def build_handoff(nodes, state, gated, clk):
    e = e3.derive(dict(state['evidence']))
    gcs = f"{e['gcs_total']} (E{e['gcs_e']}V{e['gcs_v']}M{e['gcs_m']})"
    pupils = f"L {e.get('pupil_size_l_mm')}mm/{e.get('pupil_react_l')}, R {e.get('pupil_size_r_mm')}mm/{e.get('pupil_react_r')}"
    abstaining = (f"drill-site / localization (node {gated['drill']['node']}) — imaging wall"
                  if gated.get('drill') else (f"{gated['label']} — handed to expert" if gated['irreducible'] else None))
    conc = state['conclusion']
    badge_word = {'GREEN': '🟢 Protocol', 'YELLOW': '🟡 Principles', 'RED': '🔴 Stop'}[gated['badge']]
    return dict(
        generatedAt=clk(), badge=gated['badge'], abstaining=abstaining,
        situation=f"{e.get('age_yr')}yo, {e.get('mechanism')} {e.get('time_since_injury_hr')}h ago. GCS {gcs}. Pupils: {pupils}.",
        assessment=f"tree reached {conc['action']} (leaf {conc['leafId']}), badge {badge_word}. Path: {' -> '.join(state['trajectory'])}.",
        recommendation=f"{'ABSTAINS on ' + abstaining if abstaining else 'act'}.",
        fixed_pupil_side=e['fixed_pupil_side'], gcs=gcs,
    )


def main():
    db = sys.argv[1] if len(sys.argv) > 1 else e4.__dict__.get('DEFAULT_DB', None)
    nodes, edges, root = e4.load_full(db) if db else e4.load_full(e3.DEFAULT_DB)
    HM = e3.HM
    clk = Clock()
    ok = True

    # Baseline: uninterrupted run.
    base_action, base_path = e3.traverse(nodes, edges, root, dict(HM))
    base_leaf = base_path[-1]

    # Incremental capture with a DROP right after both pupils are recorded.
    events = [dict(t='started', ts=clk(), encounterId='ENC-HM-001', lang='en')]
    drop_after = ORDER.index('pupil_react_r') + 1
    for f in ORDER[:drop_after]:
        events.append(dict(t='evidence', ts=clk(), field=f, value=HM[f], node=None))

    # ---- DROPPED CALL: everything volatile is gone; only the journal (events) persists. ----
    seed = resume_seed(events)
    pupil_survived = seed.get('pupil_react_l') == 'fixed' and 'pupil_react_r' in seed
    ok &= pupil_survived
    print(f"[{'PASS' if pupil_survived else 'FAIL'}] pre-drop evidence survived the drop "
          f"(left pupil={seed.get('pupil_react_l')}, {len(seed)} fields journaled)")

    # ---- RECONNECT: rehydrate from journal, continue answering the remaining fields. ----
    for f in ORDER[drop_after:]:
        events.append(dict(t='evidence', ts=clk(), field=f, value=HM[f], node=None))
    state = reduce(events)

    nothing_lost = set(state['evidence']) == set(HM) and all(state['evidence'][k] == HM[k] for k in HM)
    ok &= nothing_lost
    print(f"[{'PASS' if nothing_lost else 'FAIL'}] nothing lost — resumed env == full env "
          f"({len(state['evidence'])}/{len(HM)} fields)")

    # ---- Determinism: drop+resume reaches the SAME leaf as the uninterrupted run. ----
    r_action, r_path = e3.traverse(nodes, edges, root, dict(state['evidence']))
    same = (r_action, r_path[-1]) == (base_action, base_leaf)
    ok &= same
    print(f"[{'PASS' if same else 'FAIL'}] determinism — resumed run reached {r_action}@{r_path[-1]} "
          f"(baseline {base_action}@{base_leaf})")

    # ---- finalize + gate + handoff ----
    for n in r_path:
        events.append(dict(t='visited', ts=clk(), node=n))
    gated = e4.gate(nodes, r_path[-1], r_action, e4.COVERED)
    events.append(dict(t='concluded', ts=clk(), action=r_action, leafId=r_path[-1],
                       badge=gated['badge'], recommendation='stabilize + operate-locally decision', citation='Peshawar Sec D'))
    if gated['handoff'] or gated['badge'] == 'RED':
        events.append(dict(t='escalated', ts=clk(), reason=gated['label']))

    hb = build_handoff(nodes, reduce(events), gated, clk)
    checks = {
        'SBAR names GCS 7': 'GCS 7 ' in hb['situation'],
        'SBAR names left fixed pupil': hb['fixed_pupil_side'] == 'left',
        'conclusion is GUIDE': 'GUIDE' in hb['assessment'],
        'badge GREEN': hb['badge'] == 'GREEN',
        'ABSTAINS at N40 drill-site': hb['abstaining'] is not None and 'N40' in hb['abstaining'],
    }
    for label, passed in checks.items():
        ok &= passed
        print(f"[{'PASS' if passed else 'FAIL'}] handoff — {label}")

    print('\n--- HANDOFF BRIEF (what the neurosurgeon receives on reconnect) ---')
    print('S:', hb['situation'])
    print('A:', hb['assessment'])
    print('R:', hb['recommendation'])

    print('\nRESULT:', 'ALL PASS' if ok else 'FAILURES')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
