"""
The flywheel closing: a contribution becomes a provenance-headed corpus file in
cloud/ingest/contributions/, so the next `build_bundle` run ingests it into the graph.

This is deliberately the SAME shape fetch_corpus.py writes into graphrag/input/ — a community
contribution is just another source document, with its provenance baked into the header and
its (lowest) trust tier recorded. Staging (not auto-signing into the live bundle) keeps a human
in the loop: the bundle build is still an explicit, signed step — that, not a per-item curator
review, is the gate. A contribution may also carry an uploaded source file, saved beside the .txt.
"""
from __future__ import annotations

import os
import re

_HERE = os.path.dirname(os.path.abspath(__file__))      # cloud/service/portal
_SERVICE = os.path.dirname(_HERE)                         # cloud/service
_CLOUD = os.path.dirname(_SERVICE)                        # cloud
CONTRIB_DIR = os.path.join(_CLOUD, "ingest", "contributions")

# Upload policy. Doctors attach source documents (guideline PDFs, textbook scans, notes).
# Whitelist by extension — the on-disk name is ALWAYS derived from the contribution slug, never
# from the user's filename, so a malicious "../../etc" name can't escape CONTRIB_DIR.
ALLOWED_EXT = {".pdf", ".txt", ".md", ".doc", ".docx", ".rtf", ".csv",
               ".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024                      # 15 MB


def _slug(text: str, n: int = 40) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return s[:n] or "untitled"


def safe_ext(filename: str) -> str:
    """Return a sanitized, whitelisted extension for an uploaded file, or '' if not allowed."""
    ext = os.path.splitext(filename or "")[1].lower()
    return ext if ext in ALLOWED_EXT else ""


def contribution_stem(contrib) -> str:
    return f"contrib_{contrib.id:04d}_{_slug(contrib.title)}"


def stage_attachment(contrib, filename: str, data: bytes) -> str:
    """Save an uploaded source file beside the provenance .txt under a slug-derived,
    traversal-safe name. The `__` infix keeps it distinct from the `{stem}.txt` provenance
    file even when the upload is itself a .txt, while preserving a hint of the original name."""
    os.makedirs(CONTRIB_DIR, exist_ok=True)
    base = _slug(os.path.splitext(os.path.basename(filename or ""))[0]) or "file"
    path = os.path.join(CONTRIB_DIR, f"{contribution_stem(contrib)}__{base}{safe_ext(filename)}")
    with open(path, "wb") as f:
        f.write(data)
    return path


def stage_contribution(contrib, attachment_name: str | None = None) -> str:
    """Write the contribution as a provenance-headed corpus .txt; return its path."""
    os.makedirs(CONTRIB_DIR, exist_ok=True)
    path = os.path.join(CONTRIB_DIR, f"{contribution_stem(contrib)}.txt")
    addressed = f" addresses gap #{contrib.gap_id}" if contrib.gap_id else " (custom contribution)"
    header = (
        f"[Kyro community contribution: {contrib.title}]{addressed}\n"
        f"Citation: {contrib.citation or '—'}\n"
        f"Contributor: {contrib.contributor} | trust tier {contrib.tier} | contribution #{contrib.id}\n"
    )
    if attachment_name:
        header += f"Attached source file: {attachment_name}\n"
    body = (contrib.body or "").strip()
    with open(path, "w", encoding="utf-8") as f:
        f.write(header + "\n" + (body + "\n" if body else ""))
    return path
