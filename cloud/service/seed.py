"""Seed the gap inbox with realistic gaps so the portal tells the flywheel story out of the
box. These mirror real abstention scenarios: places the deterministic spine has no branch, or
must-abstain vignettes from the harness. In production these arrive from on-device encounters."""
from __future__ import annotations

from sqlmodel import Session, select

from .db import engine
from .models import Gap

SEED_GAPS = [
    ("Pediatric EDH evacuation thresholds",
     "Kyro abstained: the acute-EDH spine has no pediatric branch. A GMO asked about a 6-year-old "
     "with a temporal EDH. Volume and GCS thresholds differ from adults.", "abstention"),
    ("Posterior fossa EDH",
     "Must-abstain vignette: posterior-fossa location falls outside the supratentorial EDH tree; "
     "spine correctly stopped. Needs a posterior-fossa pathway.", "must_abstain_vignette"),
    ("Anticoagulant reversal before burr hole",
     "Field gap: patient on warfarin with an expanding EDH. No node covers reversal "
     "(vitamin K / PCC / FFP) or timing before evacuation.", "field"),
    ("Improvised twist-drill depth control",
     "Field question from a district hospital: how to avoid plunging with a hand-crank Hudson brace "
     "when there is no drill stop. Out of the decision tree (a 🔴 where-to-cut stop).", "field"),
    ("Post-evacuation ICP monitoring without a monitor",
     "Field gap: how to watch for re-accumulation post-burr-hole when no ICP monitor or repeat CT "
     "is available. Spine ends at the operate/transfer decision.", "abstention"),
]


def seed_if_empty() -> int:
    with Session(engine) as s:
        if s.exec(select(Gap)).first():
            return 0
        for summary, detail, source in SEED_GAPS:
            s.add(Gap(summary=summary, detail=detail, source=source))
        s.commit()
        return len(SEED_GAPS)
