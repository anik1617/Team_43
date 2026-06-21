"""
Provenance policy: maps a source document → its rendered citation + trust tier.

This is the heart of the "auditability, not just citation" story. GraphRAG knows which
text_unit came from which document, but it does NOT know the human-facing citation string
or whether a source is guideline-grade (tier 0) or provisional/expert (tier 1). THAT is a
clinical-editorial judgement — and it lives in the ingestion manifest, the single source
of truth for what we ingest and how we cite it.

  trust_tier 0 = canonical, guideline-grade  → preferred on the critical path
  trust_tier 1 = provisional / expert / textbook depth → usable, but flagged

Keyed by the document's filename STEM (lowercase, no extension), which equals the manifest
`id` and the GraphRAG input filename: an input file `peshawar_recommendations_2019.txt`
→ key "peshawar_recommendations_2019".

SOURCE_REGISTRY is built at import from `cloud/ingest/manifest.v1.yaml` (sections v1_core /
v1_optional / v1_demo_only), so adding a source to the manifest automatically gives it a
citation here — no second list to keep in sync. If the manifest can't be read, we fall back
to a tiny built-in set so a build never hard-crashes.
"""

from __future__ import annotations

import os

import yaml

_HERE = os.path.dirname(os.path.abspath(__file__))      # cloud/kyro_bundle
_CLOUD = os.path.dirname(_HERE)                           # cloud
_MANIFEST = os.path.join(_CLOUD, "ingest", "manifest.v1.yaml")

# Manifest sections whose entries are actually ingested as GraphRAG documents.
_IN_SECTIONS = ("v1_core", "v1_optional", "v1_demo_only")

DEFAULT_SOURCE: tuple[str, int] = ("Uncited source (review)", 1)

# Used ONLY if the manifest is missing/unparseable at import time.
_FALLBACK: dict[str, tuple[str, int]] = {
    "peshawar_recommendations_2019": ("WFNS Peshawar Recommendations 2019", 0),
    "btf_surgical_guidelines": ("Brain Trauma Foundation, Surgical Management of TBI", 0),
    "btf_guidelines_4th_ed": ("Brain Trauma Foundation Guidelines, 4th ed.", 0),
}


def _load_registry(path: str = _MANIFEST) -> dict[str, tuple[str, int]]:
    """Build {doc_stem -> (citation, trust_tier)} from the ingestion manifest."""
    try:
        with open(path, encoding="utf-8") as f:
            manifest = yaml.safe_load(f)
    except (OSError, yaml.YAMLError):
        return dict(_FALLBACK)

    registry: dict[str, tuple[str, int]] = {}
    for section in _IN_SECTIONS:
        for src in (manifest.get(section) or []):
            sid = src.get("id")
            citation = src.get("citation")
            if sid and citation:
                registry[str(sid).strip().lower()] = (str(citation), int(src.get("tier", 1)))
    return registry or dict(_FALLBACK)


SOURCE_REGISTRY: dict[str, tuple[str, int]] = _load_registry()


def resolve_source(doc_stem: str | None) -> tuple[str, int]:
    """(citation, trust_tier) for a document filename stem; safe default if unknown."""
    if not doc_stem:
        return DEFAULT_SOURCE
    return SOURCE_REGISTRY.get(doc_stem.strip().lower(), DEFAULT_SOURCE)
