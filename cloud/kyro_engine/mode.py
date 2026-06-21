# cloud/kyro_engine/mode.py
"""Graduated-assistance badge: 🟢 Protocol / 🟡 Principles / 🔴 Stop. Parsed from the leaf
recommendation's LEADING [GREEN|YELLOW|RED ...] tag (ANCHORED at the start via .match, so a
color word appearing mid-body — e.g. inside a [GUIDE - ...; RED at the act] tag — can never
mis-badge). Default 🟡 (grounded principles, the workhorse) — the badge comes from spine
structure, NEVER from model confidence, and a missing/untagged recommendation degrades to 🟡,
never empty or 🔴."""
import re

_TAG = re.compile(r'\s*\[\s*(GREEN|YELLOW|RED)')
_BADGE = {'GREEN': '🟢', 'YELLOW': '🟡', 'RED': '🔴'}


def parse_mode(text: str) -> str:
    if not text:
        return '🟡'
    m = _TAG.match(text)
    return _BADGE[m.group(1)] if m else '🟡'
