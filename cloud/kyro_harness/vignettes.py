# cloud/kyro_harness/vignettes.py
"""The benchmark Case schema + the Tier-A encoded vignette set (the harness answer key).

Answer key = mentor-signed docs/21 Tier-A (2026-06-20) + the conformance reference cases
(HM/PEDS/INVALID). The encoder had access to the expected node-paths in doc-21 — this is NOT
a blind encoding. The 38-case doc-19 expansion is roadmap/provisional; this set is the
mentor-signed Tier-A seeds proven to reach their signed leaf actions by the deterministic
engine (see tests/test_vignettes.py).

Each Case.evidence is a FULL raw-evidence dict carrying the same 22 conformance fields HM
carries, plus the two operational fields the spine reads (transfer_feasible_within_window,
teleconsult_available; default 'no' unless the vignette states otherwise). The cases live in
vignettes.csv (one row per case, evidence json-encoded) and are loaded via the csv module so
embedded commas/quotes in the JSON are handled safely. expected_mode is the 🟢/🟡/🔴 badge the
engine deterministically returns from the reached leaf (pinned, not asserted clinically)."""
from __future__ import annotations

import csv
import json
import os
from dataclasses import dataclass

CSV_PATH = os.path.join(os.path.dirname(__file__), 'vignettes.csv')

_BOOL = {'true': True, 'false': False, 'True': True, 'False': False, '1': True, '0': False}


@dataclass
class Case:
    id: str
    evidence: dict
    expected_action: str
    expected_mode: str
    must_abstain: bool


def _to_bool(v) -> bool:
    if isinstance(v, bool):
        return v
    return _BOOL[str(v).strip().lower()]


def load_cases(path: str = CSV_PATH) -> list[Case]:
    """Read vignettes.csv and return the encoded Case list, json-decoding the evidence column."""
    cases: list[Case] = []
    with open(path, newline='', encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            cases.append(Case(
                id=row['id'],
                evidence=json.loads(row['evidence_json']),
                expected_action=row['expected_action'],
                expected_mode=row['expected_mode'],
                must_abstain=_to_bool(row['must_abstain']),
            ))
    return cases
