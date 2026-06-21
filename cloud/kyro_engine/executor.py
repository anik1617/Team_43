# cloud/kyro_engine/executor.py
"""Code-driven CGT traversal. Behavioral mirror of conformance.py traverse(), returning
a KyroResult. CODE decides traversal; the model never does. A STUCK/loop fails SAFE to
ABSTAIN_STOP (stricter than conformance.py's diagnostic STUCK@/LOOP sentinels)."""
from .conditions import cond_true
from .derive import derive
from .mode import parse_mode
from .result import KyroResult


def _citations(spine, path):
    """Source citations along the trajectory, in visit order, deduped, None dropped."""
    seen, out = set(), []
    for nid in path:
        c = spine.nodes.get(nid, {}).get('source_citation')
        if c and c not in seen:
            seen.add(c); out.append(c)
    return out


def _result(spine, action, leaf_id, path, stuck=False):
    """Build a KyroResult, badging mode from the leaf's en recommendation (default 🟡, tolerant
    of terminals with no string row) and collecting path citations."""
    rec = spine.strings.get(leaf_id, {}).get('en', ('', ''))[1]
    return KyroResult(action=action, leaf_id=leaf_id, mode=parse_mode(rec),
                      citations=_citations(spine, path), trajectory=path, stuck=stuck)


def run(spine, raw_evidence: dict, max_steps: int = 60) -> KyroResult:
    """Traverse the deterministic CGT to a leaf action.

    Derives the working env from raw_evidence, then walks edges from spine.root: at each
    node, ACT if it carries an action, else ADVANCE along the first edge whose condition is
    true. Returns KyroResult(action, leaf_id, mode, citations, trajectory). Fails SAFE: if no
    edge fires or the walk exceeds max_steps (a cycle), returns ABSTAIN_STOP with stuck=True
    and leaf_id = the last node actually visited (always == trajectory[-1])."""
    env = derive(dict(raw_evidence))
    cur, path = spine.root, []
    for _ in range(max_steps):
        node = spine.nodes[cur]; path.append(cur)
        if node['action'] is not None:                       # ACT (leaf/terminal)
            return _result(spine, node['action'], cur, path)
        nxt = next((e['dst'] for e in spine.edges
                    if e['src'] == cur and cond_true(e['cond'], env)), None)
        if nxt is None:                                      # STUCK (no edge fired)
            return _result(spine, 'ABSTAIN_STOP', cur, path, stuck=True)
        cur = nxt                                            # ADVANCE
    # loop exhausted (cycle): leaf_id = last VISITED node == path[-1], NOT the un-visited cur
    return _result(spine, 'ABSTAIN_STOP', (path[-1] if path else spine.root), path, stuck=True)
