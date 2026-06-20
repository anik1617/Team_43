"""
Provenance policy: maps a source document → its rendered citation + trust tier.

This is the heart of the "auditability, not just citation" story. GraphRAG knows which
text_unit came from which document, but it does NOT know the human-facing citation string
or whether a source is guideline-grade (tier 0) or provisional/expert (tier 1). THAT is a
clinical-editorial judgement — it lives here, owned by the cloud stream.

  trust_tier 0 = canonical, guideline-grade  → preferred on the critical path
  trust_tier 1 = provisional / expert opinion → usable, but flagged

Keyed by the document's filename STEM (lowercase, no extension), e.g. an input file
`peshawar_recommendations_2019.txt` → key "peshawar_recommendations_2019".

>>> Aniket: complete this map as the real EDH corpus lands in cloud/graphrag/input/.
    Each canonical guideline should get a precise, page-level citation where possible —
    that string is what the app renders as the provenance behind a recommendation.
"""

from __future__ import annotations

# filename stem -> (rendered citation, trust_tier)
SOURCE_REGISTRY: dict[str, tuple[str, int]] = {
    "peshawar_recommendations_2019": ("WFNS Peshawar Recommendations 2019", 0),
    "btf_surgical_guidelines": ("Brain Trauma Foundation, Surgical Management of TBI", 0),
    "btf_guidelines_4th_ed": ("Brain Trauma Foundation Guidelines, 4th ed.", 0),
    "who_tbi": ("WHO Guidelines on Traumatic Brain Injury", 0),
    # TODO(aniket): add the rest of the corpus with page-level citations; default below = tier 1.
}

DEFAULT_SOURCE: tuple[str, int] = ("Uncited source (review)", 1)


def resolve_source(doc_stem: str | None) -> tuple[str, int]:
    """(citation, trust_tier) for a document filename stem; safe default if unknown."""
    if not doc_stem:
        return DEFAULT_SOURCE
    return SOURCE_REGISTRY.get(doc_stem.strip().lower(), DEFAULT_SOURCE)
