# cloud/kyro_engine/executor.py
"""Code-driven CGT traversal. Behavioral mirror of conformance.py traverse(), returning
a KyroResult. CODE decides traversal; the model never does. A STUCK/loop fails SAFE to
ABSTAIN_STOP (stricter than conformance.py's diagnostic STUCK@/LOOP sentinels)."""
from .conditions import cond_true
from .derive import derive
from .result import KyroResult


def run(spine, raw_evidence: dict, max_steps: int = 60) -> KyroResult:
    """Traverse the deterministic CGT to a leaf action.

    Derives the working env from raw_evidence, then walks edges from spine.root: at each
    node, ACT if it carries an action, else ADVANCE along the first edge whose condition is
    true. Returns KyroResult(action, leaf_id, trajectory). Fails SAFE: if no edge fires or
    the walk exceeds max_steps (a cycle), returns ABSTAIN_STOP with stuck=True and leaf_id =
    the last node actually visited (always == trajectory[-1])."""
    env = derive(dict(raw_evidence))
    cur, path = spine.root, []
    for _ in range(max_steps):
        node = spine.nodes[cur]; path.append(cur)
        if node['action'] is not None:                       # ACT (leaf/terminal)
            return KyroResult(action=node['action'], leaf_id=cur, trajectory=path)
        nxt = next((e['dst'] for e in spine.edges
                    if e['src'] == cur and cond_true(e['cond'], env)), None)
        if nxt is None:                                      # STUCK (no edge fired)
            return KyroResult(action='ABSTAIN_STOP', leaf_id=cur, trajectory=path, stuck=True)
        cur = nxt                                            # ADVANCE
    # loop exhausted (cycle): leaf_id = last VISITED node == path[-1], NOT the un-visited cur
    return KyroResult(action='ABSTAIN_STOP', leaf_id=(path[-1] if path else spine.root),
                      trajectory=path, stuck=True)
