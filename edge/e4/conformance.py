"""
E4 conformance harness — reference graduated-assistance gate + badge tests.

PYTHON ORACLE for edge/e4/abstentionGate.ts. It traverses the live cgt_* spine (reusing the E3
oracle) to the leaf, then applies the SAME deterministic badge rule the TS gate uses, asserting
the 🟢/🟡/🔴 badge + gating verdict for representative cases. Code decides the badge — never the model.

Mirrors docs/22-graduated-rescore.md: HM→🟢 GUIDE (+N40🔴 drill rider), peds→🟡 STABILIZE_TRANSFER,
invalid→🔴 ABSTAIN_STOP. Plus the fail-closed cases: GUIDE without coverage degrades to transfer;
N97 (BFDP) and N40 (direct) are irreducible 🔴.

Run:  python edge/e4/conformance.py [path/to/bundle.kyro]
"""
import sqlite3, os, sys, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB = r'C:\Users\gowri\mb_hack\Team_43\cloud\bundles\edh-core-v0-mock.kyro'

# --- reuse the E3 oracle (load + derive + traverse) so badges sit on the real reached leaf ---
_spec = importlib.util.spec_from_file_location('e3conf', os.path.join(HERE, '..', 'e3', 'conformance.py'))
e3 = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(e3)

# --- the gate rule (mirror of abstentionGate.ts) ---
DRILL_LOCALIZATION = {'N40', 'L40'}
INVALID_INPUT      = {'N99', 'L99'}
BFDP_FUTILITY      = {'N97', 'L97'}
IRREDUCIBLE = DRILL_LOCALIZATION | INVALID_INPUT | BFDP_FUTILITY


def gate(nodes, leaf_id, action, coverage):
    """coverage: dict(covered=bool). Returns the verdict dict the TS gate produces."""
    leaf = nodes[leaf_id]
    if leaf_id in IRREDUCIBLE or action == 'ABSTAIN_STOP':
        kind = ('drill-site localization (imaging wall)' if leaf_id in DRILL_LOCALIZATION
                else 'invalid / contradictory input' if leaf_id in INVALID_INPUT
                else 'bilateral fixed pupils (defer operative decision)' if leaf_id in BFDP_FUTILITY
                else 'abstain')
        return dict(badge='RED', label=f'Stop — {kind}', action=action, cleared=False,
                    irreducible=leaf_id in IRREDUCIBLE, handoff=True, degrade=False, drill=None)

    cited = bool(leaf.get('source_citation'))
    tier = leaf.get('trust_tier', 2)
    guideline_grade = (tier if tier is not None else 2) <= 1  # tier 2 = labeled principle → 🟡 by definition
    is_green = (action is not None) and cited and guideline_grade and coverage['covered']
    primary = 'GREEN' if is_green else 'YELLOW'

    if action == 'GUIDE':
        degrade = primary != 'GREEN'
        return dict(badge=primary, label='operate-locally decision', action=action,
                    cleared=not degrade, irreducible=False, handoff=True, degrade=degrade,
                    drill=dict(badge='RED', node='N40'))

    return dict(badge=primary, label=('Protocol' if is_green else 'Principles'), action=action,
                cleared=True, irreducible=False,
                handoff=action == 'STABILIZE_TRANSFER', degrade=False, drill=None)


def load_full(db):
    """Like e3.load but also pulls source_citation so the gate can judge 'cited'."""
    c = sqlite3.connect(db)
    nodes = {r[0]: {'kind': r[1], 'field': r[2], 'action': r[3], 'source_citation': r[4], 'trust_tier': r[5]}
             for r in c.execute('select id,kind,field,action,source_citation,trust_tier from cgt_nodes')}
    edges = [{'src': r[0], 'dst': r[1], 'cond': r[2]}
             for r in c.execute('select src_id,dst_id,condition from cgt_edges')]
    root = c.execute('select root_id from cgt_meta').fetchone()[0]
    return nodes, edges, root


# --- cases: prove one of each badge + the fail-closed rules ---
COVERED = dict(covered=True)
UNCOVERED = dict(covered=False)

CASES = [
    # name, raw evidence, coverage, expected (badge, cleared, drill_node_or_None, degrade)
    ('HM herniating EDH, retrieval covered', e3.HM,   COVERED,   ('GREEN',  True,  'N40', False)),
    ('HM but retrieval NOT covered (fail-closed)', e3.HM, UNCOVERED, ('YELLOW', False, 'N40', True)),
    ('Pediatric (age<15) → grounded transfer', e3.PEDS, COVERED,  ('YELLOW', True,  None,  False)),  # N98 trust_tier 2, peds SBP uncited → 🟡
    ('Invalid GCS input', e3.INVALID, COVERED, ('RED', False, None, False)),
]


def main():
    db = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    nodes, edges, root = load_full(db)
    ok = True
    for name, raw, cov, expected in CASES:
        action, path = e3.traverse(nodes, edges, root, raw)
        leaf_id = path[-1]
        v = gate(nodes, leaf_id, action, cov)
        got = (v['badge'], v['cleared'], (v['drill']['node'] if v['drill'] else None), v['degrade'])
        passed = got == expected
        ok &= passed
        print(f"[{'PASS' if passed else 'FAIL'}] {name}")
        print(f"       leaf {leaf_id} action={action} → badge={v['badge']} cleared={v['cleared']} "
              f"handoff={v['handoff']} degrade={v['degrade']} drill={v['drill']}")
        if not passed:
            print(f"       expected {expected}  got {got}")

    # irreducible 🔴 spot-checks (N40 direct, N97 BFDP) — independent of any traversal
    for nid in ('N40', 'N97'):
        v = gate(nodes, nid, nodes[nid]['action'], COVERED)
        red = v['badge'] == 'RED' and v['irreducible'] and not v['cleared']
        ok &= red
        print(f"[{'PASS' if red else 'FAIL'}] irreducible {nid}: badge={v['badge']} irreducible={v['irreducible']}")

    print('\nRESULT:', 'ALL PASS' if ok else 'FAILURES')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
