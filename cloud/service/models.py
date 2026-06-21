"""
Kyro Cloud Service — data model.

The contribution flywheel in three records:
  Gap          — something the field told us is missing (Kyro abstained / hit a 🔴 stop /
                 couldn't resolve a field). The "what knowledge is missing" signal.
  Contribution — an expert's knowledge nugget addressing a gap, with PROVENANCE
                 (who, citation, trust tier). Pending until a curator rules on it.
  On approval  — the contribution is STAGED into the corpus (ingest/contributions/), so the
                 next bundle build folds it in. That staging step is the loop closing.

Trust tiers mirror sources.py: 0 = canonical/guideline (never crowdsourced),
1 = expert/textbook depth, 2 = community contribution (lowest trust, always badged).
"""
from __future__ import annotations

import datetime as dt
from enum import Enum

from sqlmodel import Field, SQLModel


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


class GapStatus(str, Enum):
    open = "open"
    addressed = "addressed"   # an approved contribution now covers it


class ContribStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Gap(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    summary: str                                  # short "what's missing"
    detail: str = ""                              # which node/field/case surfaced it
    source: str = "field"                         # field | abstention | must_abstain_vignette | manual
    status: GapStatus = Field(default=GapStatus.open)
    created_at: str = Field(default_factory=now_iso)


class Contribution(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    gap_id: int | None = Field(default=None, foreign_key="gap.id")
    title: str
    body: str                                     # the knowledge nugget (prose)
    citation: str                                 # provenance citation string
    tier: int = 2                                 # 0/1/2 trust tier (community default = 2)
    contributor: str                             # identity — provenance
    status: ContribStatus = Field(default=ContribStatus.pending)
    created_at: str = Field(default_factory=now_iso)
    reviewed_at: str | None = None
    reviewer: str | None = None
    review_note: str | None = None
    staged_path: str | None = None               # corpus file written on approval
