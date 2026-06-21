# cloud/kyro_engine/mode.py
"""Graduated-assistance badge: 🟢 Protocol / 🟡 Principles / 🔴 Stop. Parsed from the leaf
recommendation's leading [GREEN|YELLOW|RED ...] tag. Default 🟡 (grounded principles, the
workhorse) — the badge comes from spine structure, NEVER from model confidence, and a missing
or untagged recommendation degrades to 🟡, never to empty or 🔴."""
import re

_TAG = re.compile(r'\[\s*(GREEN|YELLOW|RED)')
_BADGE = {'GREEN': '🟢', 'YELLOW': '🟡', 'RED': '🔴'}


def parse_mode(text: str) -> str:
    if not text:
        return '🟡'
    m = _TAG.search(text)
    return _BADGE[m.group(1)] if m else '🟡'
