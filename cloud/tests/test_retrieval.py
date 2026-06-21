# cloud/tests/test_retrieval.py
"""Parity test for kyro_engine.retrieval — the Python port of edge/e2/retrieval.ts.

Mirrors edge/e2/conformance.py: prove the vec0 wiring + graph expansion + coverage end-to-end
against the SIGNED mock bundle by SELF-RETRIEVAL (query with a row's own stored vector → that row
is the nearest neighbour), so no semantic embedder is needed at query time. These are the same
fixtures (ch03 / n_edh / n_lucid / n_herniation / c_edh_core) the device oracle asserts on, so a
drift between the two planes fails here."""
import os

import pytest

from kyro_engine import retrieval as R

MOCK = os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro')


@pytest.fixture(scope="module")
def conn():
    # open_bundle_ro must NOT delete the committed bundle (fresh=False under the hood)
    c = R.open_bundle_ro(MOCK)
    assert os.path.exists(MOCK), "open_bundle_ro deleted the bundle — fresh=False guard failed!"
    yield c
    c.close()


def _blob(conn, table, id_col, _id):
    return conn.execute(f"SELECT embedding FROM {table} WHERE {id_col}=?", (_id,)).fetchone()[0]


def test_chunk_self_retrieval(conn):
    knn = R.make_vec0_knn(conn)
    hits = knn("chunk_vec", _blob(conn, "chunk_vec", "chunk_id", "ch03"), 3)
    assert hits[0].id == "ch03" and hits[0].score > 0.99


def test_node_self_retrieval(conn):
    knn = R.make_vec0_knn(conn)
    hits = knn("node_vec", _blob(conn, "node_vec", "node_id", "n_edh"), 4)
    assert hits[0].id == "n_edh" and hits[0].score > 0.99


def test_graph_expansion(conn):
    reached, chunk_ids = R.expand_graph(conn, ["n_edh"], 1)
    assert {"n_lucid", "n_herniation"} <= set(reached)
    assert "ch01" in chunk_ids
    assert "n_edh" in reached  # seeds are included in the reached set


def test_communities(conn):
    assert "c_edh_core" in R.communities_of(conn, ["n_edh", "n_lucid"])


def test_coverage_grounded_on_tier0(conn):
    knn = R.make_vec0_knn(conn)
    hits = knn("chunk_vec", _blob(conn, "chunk_vec", "chunk_id", "ch03"), 3)
    fetched = R.fetch_chunks(conn, ["ch03"])
    ch = fetched["ch03"]
    context = [R.RetrievedChunk(id="ch03", kind=ch["kind"], text=ch["text"],
                                source_citation=ch["source_citation"], trust_tier=ch["trust_tier"],
                                score=hits[0].score, via="vector")]
    cov = R.compute_coverage(None, context, R.DEFAULTS)
    assert cov.covered and cov.top_trust_tier == ch["trust_tier"] and ch["trust_tier"] <= 0


def test_retrieve_end_to_end_self_query(conn):
    # embed() returns ch03's own stored blob → ch03 must surface, covered, and rank first (tier 0).
    blob = _blob(conn, "chunk_vec", "chunk_id", "ch03")
    res = R.retrieve(conn, "any query text", None,
                     embed=lambda _q: blob, knn=R.make_vec0_knn(conn))
    assert any(c.id == "ch03" for c in res.chunks)
    assert res.coverage.covered
    # ordered by trust_tier asc → the first chunk is at the minimum tier present
    tiers = [(c.trust_tier if c.trust_tier is not None else 99) for c in res.chunks]
    assert tiers == sorted(tiers)


def test_format_context_is_cited_and_bounded(conn):
    blob = _blob(conn, "chunk_vec", "chunk_id", "ch03")
    res = R.retrieve(conn, "q", None, embed=lambda _q: blob, knn=R.make_vec0_knn(conn))
    block = R.format_context(res, max_chunks=2, max_chars=120)
    assert "[1] (" in block                       # numbered + parenthesised citation
    assert all(len(line) <= 200 for line in block.splitlines())


def test_make_embed_for_bundle_feeds_knn(conn):
    # the mock bundle's pinned embedder builds a query vector knn accepts (mechanics, not semantics)
    embed = R.make_embed_for_bundle(conn)
    knn = R.make_vec0_knn(conn)
    hits = knn("chunk_vec", embed("acute epidural hematoma with lucid interval"), 3)
    assert len(hits) == 3 and all(0.0 <= h.score <= 1.0 for h in hits)
