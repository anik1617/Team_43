"""E2 — L2 GraphRAG local-search retrieval (Python port of edge/e2/retrieval.ts).

This mirrors the device-side ``edge/e2/retrieval.ts`` and the ``edge/e2/conformance.py`` oracle
in LOGIC, so the cloud harness's ``+graph`` ablation arm grounds a case exactly as the device
would. The flow (docs/08 E2):

    embed query -> vector NN over chunk_vec + node_vec -> 1-hop graph expansion over `edges`
    -> cited context ordered (trust_tier asc, score desc) -> deterministic coverage signal.

THE INVERSION HOLDS HERE: retrieval *fetches* grounded text; it never decides. The deterministic
spine (E3) decides; this module only reports how well L2 grounds the leaf the spine reached — it
cannot move the action. So even the "+graph" arm only changes what the *model* sees, never who
decides — which is the whole point the spine-ablation chart makes.

The ONE injected dependency is the vector NN (`knn`); everything else is pure SQL over regular
tables. ``make_vec0_knn`` supplies the real sqlite-vec ``embedding MATCH`` version (Python has
sqlite-vec loaded via ``kyro_bundle.bundle_writer.open_bundle``). Because the rest is pure, the
module is fully testable by SELF-RETRIEVAL on the signed mock bundle — querying with a chunk's own
stored vector must return that chunk — with no semantic embedder needed at query time.

Semantic QUALITY needs real BGE-M3 (hardware-gated; the mock embedder is non-semantic by design).
What is proven on the build plane is the MECHANICS; the arm-2 *numbers* run where BGE-M3 + the
model live (Gowrish's plane), exactly like the bare-Qwen arm-1 floor.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional

# ---- tunables (deterministic thresholds; mirror DEFAULTS in retrieval.ts) ----
DEFAULTS = {
    "k_chunks": 6,            # vector-NN breadth over chunks
    "k_nodes": 4,             # vector-NN breadth over nodes (seed graph expansion)
    "hops": 1,               # graph-expansion radius (1 = immediate neighbours)
    "grounding_threshold": 0.30,  # min similarity for a chunk to "support" the leaf
    "max_trust_tier": 0,     # a leaf is 🟢-coverable only on chunks at/under this tier (prefer 0)
}


@dataclass(frozen=True)
class Hit:
    """A vector-NN hit: similarity in [0,1], higher = closer."""
    id: str
    score: float


@dataclass
class RetrievedChunk:
    id: str
    kind: str
    text: str
    source_citation: Optional[str]
    trust_tier: Optional[int]
    score: float
    via: str  # 'vector' | 'graph'


@dataclass
class Coverage:
    """The contract the E4 gate consumes (mirrors e4/abstentionGate.ts Coverage)."""
    covered: bool
    score: Optional[float] = None
    top_trust_tier: Optional[int] = None
    supporting_citations: list = field(default_factory=list)


@dataclass
class RetrievalResult:
    chunks: list            # list[RetrievedChunk], ordered (trust_tier asc, score desc)
    seed_nodes: list        # list[Hit] — node_vec NN hits that seeded graph expansion
    expanded_nodes: list    # list[str] — nodes reached by graph expansion (includes seeds)
    communities: list       # list[str] — community ids spanned
    coverage: Coverage      # → handed straight to the gate


def sim_from_l2(dist: float) -> float:
    """L2 distance on L2-normalized vectors -> cosine similarity in [0,1] (mirror makeVec0Knn)."""
    return max(0.0, 1 - (dist * dist) / 2)


def _placeholders(n: int) -> str:
    return ",".join("?" * n)


def expand_graph(conn, seed_node_ids, hops: int):
    """`hops`-hop graph expansion from seed nodes over `edges` (undirected). Returns
    (reached_node_ids, cited_chunk_ids) — the chunk ids the traversed edges cite are the
    graph-supported evidence. Insertion order is preserved (matches the TS Set semantics) so
    results are deterministic. Pure SQL."""
    seen = set(seed_node_ids)
    reached = list(seed_node_ids)
    chunk_seen: set = set()
    chunk_ids: list = []
    frontier = list(seed_node_ids)
    for _ in range(hops):
        if not frontier:
            break
        nxt: list = []
        ph = _placeholders(len(frontier))
        q = (f"SELECT src_id, dst_id, source_chunk_id FROM edges "
             f"WHERE src_id IN ({ph}) OR dst_id IN ({ph})")
        for src, dst, sc in conn.execute(q, (*frontier, *frontier)):
            if sc and sc not in chunk_seen:
                chunk_seen.add(sc)
                chunk_ids.append(sc)
            for nid in (src, dst):
                if nid not in seen:
                    seen.add(nid)
                    reached.append(nid)
                    nxt.append(nid)
        frontier = nxt
    return reached, chunk_ids


def communities_of(conn, node_ids) -> list:
    """Community ids the given nodes belong to (seeds community-report context)."""
    if not node_ids:
        return []
    ph = _placeholders(len(node_ids))
    seen: set = set()
    out: list = []
    for (cid,) in conn.execute(
            f"SELECT DISTINCT community_id FROM node_community WHERE node_id IN ({ph})",
            tuple(node_ids)):
        if cid not in seen:
            seen.add(cid)
            out.append(cid)
    return out


def fetch_chunks(conn, ids) -> dict:
    """id -> {id, kind, text, source_citation, trust_tier} for the given chunk ids."""
    m: dict = {}
    if not ids:
        return m
    ph = _placeholders(len(ids))
    for row in conn.execute(
            f"SELECT id, kind, text, source_citation, trust_tier FROM chunks WHERE id IN ({ph})",
            tuple(ids)):
        m[row[0]] = {"id": row[0], "kind": row[1], "text": row[2],
                     "source_citation": row[3], "trust_tier": row[4]}
    return m


def _tier(c: RetrievedChunk) -> int:
    return c.trust_tier if c.trust_tier is not None else 99


def compute_coverage(leaf_citation, context, opts) -> Coverage:
    """Is the leaf grounded by retrieved evidence? Deterministic; feeds the gate. A leaf is
    covered iff a supporting chunk (similarity >= grounding_threshold) exists at/under
    max_trust_tier. (``leaf_citation`` is accepted for signature parity with retrieval.ts; tier +
    threshold decide — citation overlap is surfaced via supporting_citations, not gated on.)"""
    supporting = [c for c in context if c.score >= opts["grounding_threshold"]]
    grounded = [c for c in supporting if _tier(c) <= opts["max_trust_tier"]]
    covered = len(grounded) > 0
    pool = grounded if covered else supporting
    best = pool[0] if pool else None
    cites: list = []
    seen: set = set()
    for c in pool:
        if c.source_citation and c.source_citation not in seen:
            seen.add(c.source_citation)
            cites.append(c.source_citation)
    return Coverage(
        covered=covered,
        score=best.score if best else None,
        top_trust_tier=(min(_tier(c) for c in grounded) if covered
                        else (best.trust_tier if best else None)),
        supporting_citations=cites,
    )


def retrieve(conn, query: str, leaf_citation, embed: Callable, knn: Callable,
             opts: Optional[dict] = None) -> RetrievalResult:
    """Full local-search retrieval for a query, scoped to a leaf (whose citation we try to
    ground). Orchestrates embed -> vec NN (chunks + nodes) -> graph expansion -> cited,
    trust-ordered context -> coverage. ``embed(text)`` returns the query representation ``knn``
    binds (the sqlite-vec serialized blob for make_vec0_knn)."""
    o = {**DEFAULTS, **(opts or {})}
    qv = embed(query)

    # 1 · vector NN over both planes
    chunk_hits = knn("chunk_vec", qv, o["k_chunks"])
    seed_nodes = knn("node_vec", qv, o["k_nodes"])

    # 2 · graph expansion from the seed nodes -> extra (graph-supported) chunks + communities
    reached, graph_chunk_ids = expand_graph(conn, [h.id for h in seed_nodes], o["hops"])
    communities = communities_of(conn, reached)

    # 3 · assemble cited context: vector-hit chunks (with score) ∪ graph chunks (inherit a capped
    #     fraction of the best seed score, so vector evidence ranks above graph evidence)
    all_ids = list(dict.fromkeys([h.id for h in chunk_hits] + graph_chunk_ids))
    fetched = fetch_chunks(conn, all_ids)
    score_of = {h.id: h.score for h in chunk_hits}
    graph_score = (seed_nodes[0].score if seed_nodes else 0.0) * 0.5
    context: list = []
    for cid in all_ids:
        ch = fetched.get(cid)
        if ch is None:
            continue
        is_vector = cid in score_of
        context.append(RetrievedChunk(
            id=ch["id"], kind=ch["kind"], text=ch["text"],
            source_citation=ch["source_citation"], trust_tier=ch["trust_tier"],
            score=score_of[cid] if is_vector else graph_score,
            via="vector" if is_vector else "graph"))

    # 4 · order: trust_tier asc (prefer canonical), then score desc
    context.sort(key=lambda c: (_tier(c), -c.score))

    coverage = compute_coverage(leaf_citation, context, o)
    return RetrievalResult(chunks=context, seed_nodes=seed_nodes,
                           expanded_nodes=reached, communities=communities, coverage=coverage)


def format_context(result: RetrievalResult, max_chunks: int = 4, max_chars: int = 240) -> str:
    """Render the top retrieved chunks as a cited, trust-ordered text block for a model prompt.
    Pure — used by the +graph arm to ground the model; never influences the decision itself."""
    lines: list = []
    for i, c in enumerate(result.chunks[:max_chunks], 1):
        cite = c.source_citation or "uncited"
        snippet = " ".join((c.text or "").split())[:max_chars]
        lines.append(f"[{i}] ({cite}) {snippet}")
    return "\n".join(lines)


# ---- bundle helpers (the injected vec-NN + a safe read-only opener) -------------------------

def open_bundle_ro(path: str):
    """Open a bundle for READING. Wraps bundle_writer.open_bundle with fresh=False so it NEVER
    deletes the file (the default fresh=True would wipe the committed bundle — guard against it)."""
    from kyro_bundle import bundle_writer as bw
    return bw.open_bundle(path, fresh=False)


def make_vec0_knn(conn) -> Callable:
    """Real sqlite-vec nearest-neighbour. The query arg is the sqlite-vec serialized blob (what
    `embed` returns); vec0 distance is converted to a [0,1] similarity (mirror makeVec0Knn).

    NOTE (cross-plane parity): sqlite-vec v0.1.9 REQUIRES the ``k = ?`` constraint and REJECTS the
    bare ``LIMIT`` form ("A LIMIT or 'k = ?' constraint is required"). edge/e2/retrieval.ts's
    makeVec0Knn + edge/e2/conformance.py use ``ORDER BY distance LIMIT k`` — semantically identical
    (k nearest by distance) but version-fragile; ``AND k = ?`` is the canonical, portable form."""
    def knn(table: str, query_embedding, k: int):
        id_col = "chunk_id" if table == "chunk_vec" else "node_id"
        q = (f"SELECT {id_col} AS id, distance FROM {table} "
             f"WHERE embedding MATCH ? AND k = ? ORDER BY distance")
        return [Hit(id=row[0], score=sim_from_l2(row[1]))
                for row in conn.execute(q, (query_embedding, int(k)))]
    return knn


def _manifest_get(conn, key: str):
    """Best-effort read of a manifest key (embedder_id etc.); None if the table/shape differs."""
    try:
        row = conn.execute("SELECT value FROM manifest WHERE key=?", (key,)).fetchone()
        return row[0] if row else None
    except Exception:
        return None


def make_embed_for_bundle(conn) -> Callable:
    """Build the query ``embed()`` matching the bundle's PINNED embedder (read from the manifest),
    returning the sqlite-vec serialized blob ``make_vec0_knn`` binds. Query + corpus MUST share an
    embedder or NN is garbage (the #1 project-killer). Defaults to the mock hash embedder when the
    manifest is silent — fine for mechanics; real semantic retrieval needs the bge-m3 bundle."""
    import sqlite_vec
    from kyro_bundle import embedders
    eid = _manifest_get(conn, "embedder_id") or embedders.HashEmbedder.id
    emb = (embedders.BgeM3Embedder() if eid == embedders.BgeM3Embedder.id
           else embedders.HashEmbedder())

    def embed(text: str):
        vec = emb.embed(text)
        return sqlite_vec.serialize_float32(vec.tolist())

    return embed
