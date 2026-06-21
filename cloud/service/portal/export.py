"""
The flywheel closing: an APPROVED contribution becomes a provenance-headed corpus file in
cloud/ingest/contributions/, so the next `build_bundle` run ingests it into the graph.

This is deliberately the SAME shape fetch_corpus.py writes into graphrag/input/ — a community
contribution is just another source document, with its provenance baked into the header and
its (lowest) trust tier recorded. Staging (not auto-signing into the live bundle) keeps a human
in the loop: a build is still an explicit, signed step.
"""
from __future__ import annotations

import os
import re

_HERE = os.path.dirname(os.path.abspath(__file__))      # cloud/service/portal
_SERVICE = os.path.dirname(_HERE)                         # cloud/service
_CLOUD = os.path.dirname(_SERVICE)                        # cloud
CONTRIB_DIR = os.path.join(_CLOUD, "ingest", "contributions")


def _slug(text: str, n: int = 40) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return s[:n] or "untitled"


def contribution_stem(contrib) -> str:
    return f"contrib_{contrib.id:04d}_{_slug(contrib.title)}"


def stage_contribution(contrib) -> str:
    """Write the approved contribution as a corpus .txt; return its path."""
    os.makedirs(CONTRIB_DIR, exist_ok=True)
    path = os.path.join(CONTRIB_DIR, f"{contribution_stem(contrib)}.txt")
    header = (
        f"[Kyro community contribution: {contrib.title}]\n"
        f"Citation: {contrib.citation}\n"
        f"Contributor: {contrib.contributor} | trust tier {contrib.tier} | contribution #{contrib.id}\n\n"
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(header + contrib.body.strip() + "\n")
    return path
