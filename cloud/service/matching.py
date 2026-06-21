"""Deterministic expert matching — the inversion holds here too: CODE selects who to contact,
the model only phrases the recommendation. A skeptical neurosurgeon trusts a traceable rule
("matched the on-call neurosurgeon in-region") far more than an LLM's free choice.

A row is contactable ONLY if it has opted in AND has a phone. Among those, rank by:
  1. on-call (self-declared available) first
  2. region match (coarse locality) next
  3. admin-verified experts above unverified
  4. most-recently-registered as the final tiebreak
Pure function over a list of Expert rows — fully testable without a DB or the HTTP layer.
"""
from __future__ import annotations

from typing import Optional


def is_contactable(e) -> bool:
    return bool(getattr(e, "contact_opt_in", False)) and bool(getattr(e, "phone_e164", ""))


def _norm(s) -> str:
    return (s or "").strip().lower()


def match_experts(experts, needed_specialty: str = "neurosurgery",
                  region: Optional[str] = None, limit: int = 3) -> list:
    """Return up to ``limit`` contactable experts matching ``needed_specialty``, best first.
    ``region`` only influences RANKING (an in-region expert is preferred) — it never excludes,
    so a case is never left unmatched just because no one is local. Returns [] if no opted-in,
    phone-carrying specialist exists (the caller then degrades to the on-screen/staged handoff)."""
    want = _norm(needed_specialty)
    cands = [e for e in experts
             if is_contactable(e) and (not want or _norm(e.specialty) == want)]

    def rank(e):
        return (
            0 if getattr(e, "on_call", False) else 1,
            0 if (region and _norm(e.region) and _norm(e.region) == _norm(region)) else 1,
            0 if getattr(e, "verified", False) else 1,
            -(e.id or 0),
        )

    return sorted(cands, key=rank)[: max(0, limit)]


def best_match(experts, needed_specialty: str = "neurosurgery",
               region: Optional[str] = None):
    """The single recommended expert, or None if nobody is contactable."""
    matches = match_experts(experts, needed_specialty, region, limit=1)
    return matches[0] if matches else None
