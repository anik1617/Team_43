"""Deep structural / embedding / crypto verification for the REAL edh-core-v1.kyro.

Complements kyro_bundle.verify (which checks ed25519 sigs only). These assert the bundle is
actually device-loadable and semantically usable: pinned embedder, well-formed L2-normalized
1024-d vectors, deterministic embeddings, no dangling graph edges, populated trust tiers +
citations, the spine intact, and — adversarially — that tampering with signed content breaks
the signature.

Skips cleanly if the v1 bundle hasn't been built yet (so the suite stays green pre-build).

Run:  python -m pytest tests/test_bundle_v1.py -q
      BUNDLE=bundles/edh-core-v1.kyro python -m pytest tests/test_bundle_v1.py -q
"""
import os
import shutil

import numpy as np
import pytest

HERE = os.path.dirname(__file__)
CLOUD = os.path.join(HERE, "..")
BUNDLE = os.environ.get("BUNDLE", os.path.join(CLOUD, "bundles", "edh-core-v1.kyro"))
PUBKEY = open(os.path.join(CLOUD, "keys", "dev_signer.pub")).read().strip()

pytestmark = pytest.mark.skipif(not os.path.exists(BUNDLE), reason=f"{BUNDLE} not built yet")


def _open(path):
    from kyro_engine import retrieval as R
    return R.open_bundle_ro(path)


def _manifest(conn):
    cols = [d[0] for d in conn.execute("SELECT * FROM manifest").description]
    return dict(zip(cols, conn.execute("SELECT * FROM manifest").fetchone()))


@pytest.fixture(scope="module")
def conn():
    c = _open(BUNDLE)
    yield c
    c.close()


def test_signatures_and_pinned_key():
    from kyro_bundle import verify as V
    assert V.verify_bundle(BUNDLE, expected_pubkey=PUBKEY) is True


def test_embedder_pinned_bge_m3(conn):
    m = _manifest(conn)
    assert m["embedder_id"] == "bge-m3"
    assert m["embedder_dim"] == 1024
    assert m["scope"] == "edh-core"
    assert m["signer_pubkey"] == PUBKEY


def test_vec_counts_match_rows(conn):
    nchunks = conn.execute("SELECT count(*) FROM chunks").fetchone()[0]
    nnodes = conn.execute("SELECT count(*) FROM nodes").fetchone()[0]
    ncv = conn.execute("SELECT count(*) FROM chunk_vec").fetchone()[0]
    ncn = conn.execute("SELECT count(*) FROM node_vec").fetchone()[0]
    assert nchunks > 0 and nnodes > 0
    assert ncv == nchunks, f"chunk_vec {ncv} != chunks {nchunks}"
    assert ncn == nnodes, f"node_vec {ncn} != nodes {nnodes}"


def test_embeddings_wellformed(conn):
    import sqlite_vec  # noqa: F401
    import struct
    rows = conn.execute("SELECT embedding FROM chunk_vec LIMIT 50").fetchall()
    rows += conn.execute("SELECT embedding FROM node_vec LIMIT 50").fetchall()
    assert rows
    for (blob,) in rows:
        v = np.array(struct.unpack(f"<{len(blob)//4}f", blob), dtype=np.float32)
        assert v.shape == (1024,), f"bad dim {v.shape}"
        assert np.all(np.isfinite(v)), "non-finite component"
        assert np.linalg.norm(v) > 0, "all-zero vector"
        assert abs(np.linalg.norm(v) - 1.0) < 1e-3, f"not L2-normalized: {np.linalg.norm(v)}"


def test_embedding_determinism(conn):
    """Re-embed stored chunk texts with the build embedder; fp32 on this GPU is deterministic."""
    pytest.importorskip("FlagEmbedding")  # heavy BGE-M3 dep — skip where it's absent (build pod has it)
    import struct

    from kyro_bundle.embedders import BgeM3Embedder
    bge = BgeM3Embedder()
    sample = conn.execute(
        "SELECT c.id, c.text, v.embedding FROM chunks c JOIN chunk_vec v ON v.chunk_id=c.id LIMIT 6"
    ).fetchall()
    assert sample
    for cid, text, blob in sample:
        stored = np.array(struct.unpack(f"<{len(blob)//4}f", blob), dtype=np.float32)
        fresh = bge.embed(text)
        # cosine ~1 (deterministic build → effectively identical; allow tiny fp slack)
        cos = float(np.dot(stored, fresh))
        assert cos > 0.9999, f"chunk {cid}: re-embed cosine {cos} (non-deterministic build?)"


def test_no_dangling_edges(conn):
    dangling = conn.execute(
        "SELECT count(*) FROM edges e WHERE e.src_id NOT IN (SELECT id FROM nodes) "
        "OR e.dst_id NOT IN (SELECT id FROM nodes)"
    ).fetchone()[0]
    assert dangling == 0, f"{dangling} edges reference missing nodes"


def test_trust_tiers_and_citations(conn):
    bad_tier = conn.execute("SELECT count(*) FROM chunks WHERE trust_tier NOT IN (0,1)").fetchone()[0]
    bad_node = conn.execute("SELECT count(*) FROM nodes WHERE trust_tier NOT IN (0,1)").fetchone()[0]
    assert bad_tier == 0 and bad_node == 0
    # tier-0 text_unit chunks must carry a real (non-default) citation
    uncited = conn.execute(
        "SELECT count(*) FROM chunks WHERE kind='text_unit' AND trust_tier=0 "
        "AND (source_citation IS NULL OR source_citation LIKE 'Uncited%')"
    ).fetchone()[0]
    assert uncited == 0, f"{uncited} tier-0 chunks have no real citation"


def test_chunk_kinds(conn):
    kinds = {k for (k,) in conn.execute("SELECT DISTINCT kind FROM chunks")}
    assert kinds <= {"text_unit", "community_report"}, f"unexpected chunk kinds {kinds}"


def test_spine_intact(conn):
    from kyro_bundle.schema import CGT_ACTIONS
    assert conn.execute("SELECT count(*) FROM cgt_nodes").fetchone()[0] == 60
    assert conn.execute("SELECT count(*) FROM cgt_edges").fetchone()[0] == 87
    assert conn.execute("SELECT count(*) FROM cgt_strings").fetchone()[0] == 41
    bad = conn.execute(
        "SELECT count(*) FROM cgt_nodes WHERE action IS NOT NULL AND action NOT IN (?,?,?,?)",
        CGT_ACTIONS).fetchone()[0]
    assert bad == 0


def test_tamper_breaks_manifest_signature(tmp_path):
    """Adversarial: mutate a signed chunk text in a COPY → manifest digest changes → verify FAILS."""
    import sqlite3

    import sqlite_vec

    from kyro_bundle import signing
    from kyro_bundle import verify as V

    tampered = str(tmp_path / "tampered.kyro")
    shutil.copy(BUNDLE, tampered)

    # baseline: the untouched copy still verifies
    assert V.verify_bundle(tampered) is True

    c = sqlite3.connect(tampered)
    c.enable_load_extension(True)
    sqlite_vec.load(c)
    c.enable_load_extension(False)
    before = signing.manifest_digest(c)
    cid = c.execute("SELECT id FROM chunks LIMIT 1").fetchone()[0]
    c.execute("UPDATE chunks SET text = text || ' [TAMPER]' WHERE id=?", (cid,))
    c.commit()
    after = signing.manifest_digest(c)
    c.close()

    assert before != after, "digest did not change after tampering signed content!"
    assert V.verify_bundle(tampered) is False, "tampered bundle still verified — signature is not protecting content!"
