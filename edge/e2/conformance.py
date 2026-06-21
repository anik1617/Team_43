"""
E2 conformance harness — vec0 retrieval wiring proof (the part node:sqlite can't run).

PYTHON ORACLE for edge/e2/retrieval.ts. The TS unit tests (edge/tests/run.ts) cover the pure
graph-expansion / coverage logic with a stubbed knn; this proves the ONE injected piece — the
sqlite-vec `embedding MATCH` nearest-neighbour search — end-to-end against the real signed bundle,
since Python has sqlite-vec loaded (node:sqlite v22.11 cannot loadExtension).

Determinism without reproducing the embedder: SELF-RETRIEVAL. Query with a chunk's OWN stored
vector → that chunk must be the nearest neighbour (distance ~0, similarity ~1). This exercises the
real vec0 KNN + the distance→similarity conversion (makeVec0Knn) + graph expansion + coverage,
without needing the (Python-NumPy, non-portable) mock embedder at query time.

Run:  python edge/e2/conformance.py [path/to/bundle.kyro]
"""
import os, sys, struct

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'cloud'))
from kyro_bundle import bundle_writer as bw  # opens with sqlite-vec loaded

DEFAULT_DB = os.path.join(HERE, '..', '..', 'cloud', 'bundles', 'edh-core-v0-mock.kyro')


def sim_from_l2(dist):  # mirror of makeVec0Knn: L2 dist on normalized vecs → cosine similarity
    return max(0.0, 1 - (dist * dist) / 2)


def knn(conn, table, query_blob, k):
    id_col = 'chunk_id' if table == 'chunk_vec' else 'node_id'
    q = f"SELECT {id_col} AS id, distance FROM {table} WHERE embedding MATCH ? ORDER BY distance LIMIT {k}"
    return [(r[0], sim_from_l2(r[1])) for r in conn.execute(q, (query_blob,))]


def expand_graph(conn, seeds, hops):
    reached, chunk_ids, frontier = set(seeds), set(), list(seeds)
    for _ in range(hops):
        if not frontier:
            break
        nxt = []
        ph = ','.join('?' * len(frontier))
        for src, dst, sc in conn.execute(
                f"SELECT src_id,dst_id,source_chunk_id FROM edges WHERE src_id IN ({ph}) OR dst_id IN ({ph})",
                frontier + frontier):
            if sc:
                chunk_ids.add(sc)
            for nid in (src, dst):
                if nid not in reached:
                    reached.add(nid); nxt.append(nid)
        frontier = nxt
    return reached, chunk_ids


def main():
    db = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    conn = bw.open_bundle(db, fresh=False)
    ok = True

    # --- self-retrieval over chunk_vec: query with ch03's own vector → ch03 is the top hit ---
    blob = conn.execute("SELECT embedding FROM chunk_vec WHERE chunk_id='ch03'").fetchone()[0]
    hits = knn(conn, 'chunk_vec', blob, 3)
    top_self = hits and hits[0][0] == 'ch03' and hits[0][1] > 0.99
    ok &= top_self
    print(f"[{'PASS' if top_self else 'FAIL'}] chunk self-retrieval: query ch03 → top {hits[0] if hits else None}")

    # --- self-retrieval over node_vec: query with n_edh's vector → n_edh is the top hit ---
    nblob = conn.execute("SELECT embedding FROM node_vec WHERE node_id='n_edh'").fetchone()[0]
    nhits = knn(conn, 'node_vec', nblob, 4)
    top_node = nhits and nhits[0][0] == 'n_edh' and nhits[0][1] > 0.99
    ok &= top_node
    print(f"[{'PASS' if top_node else 'FAIL'}] node self-retrieval: query n_edh → top {nhits[0] if nhits else None}")

    # --- graph expansion from the node hit (real edges) ---
    reached, chunk_ids = expand_graph(conn, ['n_edh'], 1)
    exp_ok = {'n_lucid', 'n_herniation'} <= reached and 'ch01' in chunk_ids
    ok &= exp_ok
    print(f"[{'PASS' if exp_ok else 'FAIL'}] graph expansion n_edh 1-hop → {sorted(reached)} cite {sorted(chunk_ids)}")

    # --- coverage: a self-retrieved tier-0 chunk grounds the leaf (covered) ---
    tier = conn.execute("SELECT trust_tier FROM chunks WHERE id='ch03'").fetchone()[0]
    covered = hits[0][1] >= 0.30 and tier <= 0
    ok &= covered
    print(f"[{'PASS' if covered else 'FAIL'}] coverage: ch03 sim {hits[0][1]:.3f} tier {tier} → covered={covered}")

    # --- community context ---
    comms = [r[0] for r in conn.execute("SELECT DISTINCT community_id FROM node_community WHERE node_id IN ('n_edh','n_lucid')")]
    comm_ok = 'c_edh_core' in comms
    ok &= comm_ok
    print(f"[{'PASS' if comm_ok else 'FAIL'}] community context: {comms}")

    conn.close()
    print('\nRESULT:', 'ALL PASS' if ok else 'FAILURES')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
