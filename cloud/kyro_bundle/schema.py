"""
The SEAM, in code. Single source of truth for the `edh-core-v{N}.kyro` bundle schema.

This DDL is copied verbatim from docs/08-build-plan-and-task-split.md §1 — the one
interface between the CLOUD build (Aniket) and the EDGE app (Gowrish). The mock-bundle
generator (build_mock.py) and the real bundle compiler (C5, later) both build against
THIS file so the two halves never drift.

If this schema changes, it changes HERE first, and both planes re-sync. Nothing in the
app or the pipeline should hand-write these table definitions anywhere else.
"""

# --- L2 knowledge layer: manifest + GraphRAG chunks/nodes/edges + vector tables ---

MANIFEST_DDL = """
CREATE TABLE manifest (
  bundle_id TEXT, version INTEGER, scope TEXT,           -- scope = "edh-core"
  embedder_id TEXT, embedder_dim INTEGER,                -- "bge-m3", 1024
  lang TEXT,                                             -- "en" (v1; "ur" is roadmap)
  graphrag_version TEXT, sqlite_vec_version TEXT,
  created_at TEXT, signature TEXT, signer_pubkey TEXT    -- ed25519
);
"""

CHUNKS_DDL = """
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  kind TEXT,                 -- 'text_unit' | 'community_report'
  text TEXT,
  source_citation TEXT,      -- "WFNS Peshawar Recommendations 2019, p.4"  (RENDERED in-app)
  source_doc_id TEXT,
  trust_tier INTEGER         -- 0 = canonical | 1 = provisional/expert
);
"""

# vec0 virtual tables — require the sqlite-vec extension loaded at build AND read time.
# The dim (1024) MUST match manifest.embedder_dim and the on-device embedder byte-for-byte.
CHUNK_VEC_DDL = "CREATE VIRTUAL TABLE chunk_vec USING vec0(chunk_id TEXT, embedding FLOAT[1024]);"

NODES_DDL = """
CREATE TABLE nodes (id TEXT PRIMARY KEY, name TEXT, type TEXT, description TEXT, trust_tier INTEGER);
"""

NODE_VEC_DDL = "CREATE VIRTUAL TABLE node_vec USING vec0(node_id TEXT, embedding FLOAT[1024]);"

EDGES_DDL = """
CREATE TABLE edges (src_id TEXT, dst_id TEXT, relation TEXT, weight REAL, source_chunk_id TEXT);
"""

NODE_COMMUNITY_DDL = """
CREATE TABLE node_community (node_id TEXT, community_id TEXT, level INTEGER);
"""

# --- L1 reasoning spine: the Clinical Guidance Tree travels in the same bundle ---
# Logic (cgt_nodes/cgt_edges) is language-agnostic; localizable text lives in cgt_strings.
# The E3 executor traverses these by CODE — the model never does.

CGT_NODES_DDL = """
CREATE TABLE cgt_nodes (
  id TEXT PRIMARY KEY,
  kind TEXT,              -- 'gather' | 'decision' | 'action' | 'leaf'
  field TEXT,             -- 'gcs','pupil_left','bp','spo2','lucid_interval','time_since_injury',...
  required INTEGER,       -- 1 = critical-evidence field (cannot terminate without it)
  action TEXT,            -- leaves only: 'GUIDE' | 'OBSERVE' | 'STABILIZE_TRANSFER' | 'ABSTAIN_STOP'
  source_citation TEXT,   -- "WFNS Peshawar Recommendations 2019, p.4"
  trust_tier INTEGER      -- 0 = canonical (critical path) | 1 = provisional
);
"""

CGT_EDGES_DDL = """
CREATE TABLE cgt_edges (src_id TEXT, dst_id TEXT, condition TEXT);  -- classified-answer that fires the branch
"""

CGT_STRINGS_DDL = """
CREATE TABLE cgt_strings (
  node_id TEXT, lang TEXT, prompt TEXT, recommendation TEXT,
  PRIMARY KEY (node_id, lang)
);
"""

CGT_META_DDL = """
CREATE TABLE cgt_meta (root_id TEXT, version INTEGER, signature TEXT);  -- ed25519, signed separately
"""

# The four leaf actions — doc 19 vocabulary. Validated at build time so a typo never ships.
CGT_ACTIONS = ("GUIDE", "OBSERVE", "STABILIZE_TRANSFER", "ABSTAIN_STOP")

# Ordered so the file builds deterministically (vec tables after their base tables).
ALL_DDL = [
    MANIFEST_DDL,
    CHUNKS_DDL,
    CHUNK_VEC_DDL,
    NODES_DDL,
    NODE_VEC_DDL,
    EDGES_DDL,
    NODE_COMMUNITY_DDL,
    CGT_NODES_DDL,
    CGT_EDGES_DDL,
    CGT_STRINGS_DDL,
    CGT_META_DDL,
]

EMBEDDING_DIM = 1024  # FLOAT[1024]; must equal manifest.embedder_dim everywhere


def create_all(conn):
    """Apply the full bundle schema to an open (sqlite-vec-loaded) connection."""
    for ddl in ALL_DDL:
        conn.execute(ddl)
