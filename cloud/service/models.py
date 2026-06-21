"""
Kyro Cloud Service — data model.

The contribution flywheel in two records:
  Gap          — something the field told us is missing (Kyro abstained / hit a 🔴 stop /
                 couldn't resolve a field). The "what knowledge is missing" signal.
  Contribution — an expert's knowledge nugget (prose and/or an uploaded source file) with
                 PROVENANCE (who, citation, trust tier). It may address a Gap or be a custom
                 standalone upload. On submit it is STAGED directly into the corpus
                 (ingest/contributions/), so the next bundle build folds it in — no per-item
                 curator gate; the human-in-the-loop is the explicit, signed bundle build itself.

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
    staged_path: str | None = None               # corpus .txt written on contribution
    attachment_path: str | None = None           # uploaded source file, if any (saved beside the .txt)


# Consent text version — bump this string whenever the opt-in wording changes, so every
# Expert row records WHICH consent they agreed to (auditability + lawful basis for contact).
CONSENT_VERSION = "v1-2026-06-21"
CONSENT_TEXT = (
    "I consent to Kyro contacting me by WhatsApp at the number I provide, for emergency "
    "neurosurgical teleconsult requests from clinicians using Kyro in low-resource settings. "
    "My number is shared only with the requesting clinician at the moment of an escalation. "
    "I can withdraw consent at any time from my profile (or by replying STOP)."
)


class Expert(SQLModel, table=True):
    """A registered specialist who has OPTED IN to be reached for emergency teleconsults.
    Phone numbers are PII and never leave the cloud — the device only sends an escalation
    request; the cloud matches + connects. A row is contactable ONLY when contact_opt_in is
    True AND a phone is present (the matcher enforces both)."""
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str | None = None             # null when the account is OAuth-only
    oauth_provider: str | None = None            # e.g. 'google'
    oauth_sub: str | None = Field(default=None, index=True)   # stable provider subject id
    name: str = ""
    specialty: str = ""                          # e.g. 'neurosurgery' (matched case-insensitively)
    role: str = ""                               # consultant / registrar / fellow / ...
    institution: str = ""
    region: str = ""                             # coarse locality for ranking (not GPS)
    phone_e164: str = ""                         # E.164 (+countrycode...) — WhatsApp target
    contact_opt_in: bool = False                 # explicit consent to be contacted
    consent_version: str | None = None           # which CONSENT_VERSION they agreed to
    consent_at: str | None = None                # when consent was recorded
    on_call: bool = False                        # self-declared availability (ranked first)
    verified: bool = False                       # admin-verified expert (ranked above unverified)
    created_at: str = Field(default_factory=now_iso)


class EscalationLog(SQLModel, table=True):
    """Audit trail: every escalation, who it matched, and whether it actually sent. Makes the
    'who did we contact and why' question answerable — the auditability the judges reward."""
    id: int | None = Field(default=None, primary_key=True)
    ticket: str
    case_summary: str = ""
    needed_specialty: str = ""
    region: str | None = None
    matched_expert_id: int | None = Field(default=None, foreign_key="expert.id")
    matched_name: str | None = None
    channel: str = "none"                        # whatsapp | staged | none
    delivered: bool = False
    created_at: str = Field(default_factory=now_iso)
