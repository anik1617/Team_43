# cloud/kyro_engine/executor.py
"""Code-driven CGT traversal. Behavioral mirror of conformance.py traverse(), returning
a KyroResult. CODE decides traversal; the model never does. A STUCK/loop fails SAFE to
ABSTAIN_STOP (stricter than conformance.py's diagnostic STUCK@/LOOP sentinels)."""
from .conditions import cond_true
from .derive import derive
from .result import KyroResult


def run(spine, raw_evidence: dict, max_steps: int = 60) -> KyroResult:
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
    return KyroResult(action='ABSTAIN_STOP', leaf_id=cur, trajectory=path, stuck=True)
