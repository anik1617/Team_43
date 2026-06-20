"""
Load + normalize Microsoft GraphRAG's output parquet into plain DataFrames, tolerant of
the v1 (`create_final_*`) and v2 (`entities`, `relationships`, ...) filename conventions
and of minor column renames across versions.

We consume GraphRAG for the GRAPH ONLY (entities / relationships / communities /
community_reports / text_units / documents). Vectors are NOT read from GraphRAG — the
bundle compiler (build_bundle.py) re-embeds the text with BGE-M3 so the shipped vectors
share one code path with the device (the real parity constraint). See README / doc 08 §C3.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import pandas as pd

# v2 name first, then v1 fallback
_FILE_ALIASES = {
    "entities": ["entities", "create_final_entities"],
    "relationships": ["relationships", "create_final_relationships"],
    "text_units": ["text_units", "create_final_text_units"],
    "community_reports": ["community_reports", "create_final_community_reports"],
    "communities": ["communities", "create_final_communities"],
    "documents": ["documents", "create_final_documents"],
}


def _read(output_dir: str, names: list[str]) -> pd.DataFrame:
    for n in names:
        p = os.path.join(output_dir, f"{n}.parquet")
        if os.path.exists(p):
            return pd.read_parquet(p)
    raise FileNotFoundError(
        f"none of {[n + '.parquet' for n in names]} found in {output_dir}. "
        "Run `graphrag index --root cloud/graphrag` first."
    )


def _first_col(df: pd.DataFrame, candidates: list[str], required: bool = True):
    for c in candidates:
        if c in df.columns:
            return c
    if required:
        raise KeyError(f"expected one of {candidates} in columns {list(df.columns)}")
    return None


@dataclass
class GraphRAGTables:
    entities: pd.DataFrame
    relationships: pd.DataFrame
    text_units: pd.DataFrame
    community_reports: pd.DataFrame
    communities: pd.DataFrame
    documents: pd.DataFrame

    # resolved column names (set during normalize)
    cols: dict


def load(output_dir: str) -> GraphRAGTables:
    ent = _read(output_dir, _FILE_ALIASES["entities"])
    rel = _read(output_dir, _FILE_ALIASES["relationships"])
    tu = _read(output_dir, _FILE_ALIASES["text_units"])
    cr = _read(output_dir, _FILE_ALIASES["community_reports"])
    comm = _read(output_dir, _FILE_ALIASES["communities"])
    docs = _read(output_dir, _FILE_ALIASES["documents"])

    cols = {
        "ent_id": _first_col(ent, ["id", "human_readable_id"]),
        "ent_title": _first_col(ent, ["title", "name"]),
        "ent_type": _first_col(ent, ["type"], required=False),
        "ent_desc": _first_col(ent, ["description"], required=False),
        "rel_src": _first_col(rel, ["source"]),
        "rel_dst": _first_col(rel, ["target"]),
        "rel_desc": _first_col(rel, ["description"], required=False),
        "rel_weight": _first_col(rel, ["weight", "combined_degree"], required=False),
        "rel_tu": _first_col(rel, ["text_unit_ids"], required=False),
        "tu_id": _first_col(tu, ["id"]),
        "tu_text": _first_col(tu, ["text"]),
        "tu_docs": _first_col(tu, ["document_ids"], required=False),
        "cr_community": _first_col(cr, ["community"]),
        "cr_text": _first_col(cr, ["full_content", "summary"]),
        "cr_level": _first_col(cr, ["level"], required=False),
        "comm_id": _first_col(comm, ["community"]),
        "comm_level": _first_col(comm, ["level"], required=False),
        "comm_entities": _first_col(comm, ["entity_ids"], required=False),
        "doc_id": _first_col(docs, ["id"]),
        "doc_title": _first_col(docs, ["title"], required=False),
    }
    return GraphRAGTables(ent, rel, tu, cr, comm, docs, cols)
