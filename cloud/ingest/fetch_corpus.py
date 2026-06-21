"""
fetch_corpus.py — manifest-driven corpus builder for the Kyro edh-core GraphRAG input.

Reads cloud/ingest/manifest.v1.yaml and, for every IN source, produces ONE clean UTF-8
text file at cloud/graphrag/input/<id>.txt (id == sources.py key == graphrag doc stem).

Acquisition (auto-detects PDF vs HTML by Content-Type / magic bytes, so a "fetch_pdf" entry
whose URL is really an HTML article page still extracts correctly):
  in_repo / user_provided -> local file (PDF via PyMuPDF, .txt read directly)
  fetch_pdf / fetch_html  -> HTTP GET, then PyMuPDF (PDF) or trafilatura (HTML main content)

Run:
  cd cloud
  .venv/Scripts/python.exe -m ingest.fetch_corpus                 # core + optional + provided textbooks
  .venv/Scripts/python.exe -m ingest.fetch_corpus --core-only     # v1_core only
  .venv/Scripts/python.exe -m ingest.fetch_corpus --only statpearls_edh,enls_tbi_protocol
  .venv/Scripts/python.exe -m ingest.fetch_corpus --list          # show plan, fetch nothing

NOTHING here is committed: graphrag/input/*.txt and ingest/textbooks/ are gitignored. The
manifest + this script are the reproducible source of truth — re-run to rebuild the corpus.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))          # cloud/ingest
CLOUD = os.path.dirname(HERE)                               # cloud
REPO = os.path.dirname(CLOUD)                               # repo root
MANIFEST = os.path.join(HERE, "manifest.v1.yaml")
TEXTBOOKS = os.path.join(HERE, "textbooks")
INPUT_DIR = os.path.join(CLOUD, "graphrag", "input")
REPORT = os.path.join(HERE, "fetch_report.json")

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
TIMEOUT = 40

# Sections of the manifest that are IN the corpus. user_provided only ingests if the PDF exists.
IN_SECTIONS = ("v1_core", "v1_optional", "v1_demo_only")


def load_sources(manifest_path: str) -> list[dict]:
    with open(manifest_path, encoding="utf-8") as f:
        m = yaml.safe_load(f)
    out = []
    for sec in IN_SECTIONS:
        for s in (m.get(sec) or []):
            s = dict(s)
            s["_section"] = sec
            out.append(s)
    return out


def _clean_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"-\n(?=[a-z])", "", text)          # de-hyphenate wrapped words
    text = re.sub(r"[ \t]+\n", "\n", text)            # trailing ws
    text = re.sub(r"\n{3,}", "\n\n", text)            # collapse blank runs
    return text.strip()


def _pdf_to_text(data: bytes, pages: str | None = None) -> str:
    """Extract text. `pages` = 0-based inclusive range "start-end" (for slicing big
    textbooks to their EDH/trauma-relevant chapters); None = whole document."""
    import fitz
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        if pages:
            a, b = (int(x) for x in str(pages).split("-"))
            idx = range(max(0, a), min(b + 1, doc.page_count))
        else:
            idx = range(doc.page_count)
        return "\n".join(doc.load_page(i).get_text() for i in idx)
    finally:
        doc.close()


def _html_to_text(html: str, url: str) -> str:
    import trafilatura
    txt = trafilatura.extract(html, url=url, include_comments=False,
                              include_tables=True, favor_recall=True)
    return txt or ""


def _local(path_rel: str) -> bytes:
    p = path_rel if os.path.isabs(path_rel) else os.path.join(REPO, path_rel)
    with open(p, "rb") as f:
        return f.read()


def acquire(src: dict) -> tuple[str, str, str]:
    """Return (text, method, note). Raises on hard failure."""
    aq = src["acquire"]
    sid, raw = src["id"], (src.get("src") or "")

    if aq == "in_repo":
        # strip any trailing parenthetical the manifest used for prose
        path = raw.split("  (")[0].strip()
        data = _local(path)
        if path.lower().endswith(".pdf"):
            return _pdf_to_text(data), "in_repo:pdf", path
        return data.decode("utf-8", "replace"), "in_repo:txt", path

    if aq == "user_provided":
        cand = os.path.join(TEXTBOOKS, f"{sid}.pdf")
        if not os.path.exists(cand):
            raise FileNotFoundError(f"awaiting file at ingest/textbooks/{sid}.pdf")
        pages = src.get("pages")
        method = f"user_provided:pdf[{pages}]" if pages else "user_provided:pdf"
        return _pdf_to_text(_local(cand), pages), method, cand

    # fetch_pdf / fetch_html — GET then sniff
    import requests
    url = raw.split("  (")[0].strip()
    r = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT)
    r.raise_for_status()
    ctype = r.headers.get("Content-Type", "").lower()
    is_pdf = "pdf" in ctype or r.content[:5] == b"%PDF-"
    if is_pdf:
        return _pdf_to_text(r.content), f"http:pdf({len(r.content)}B)", url
    text = _html_to_text(r.text, url)
    if not text:
        raise ValueError("trafilatura extracted no main content (likely JS-gated or blocked)")
    return text, "http:html", url


def write_doc(src: dict, text: str) -> int:
    os.makedirs(INPUT_DIR, exist_ok=True)
    header = (f"[Kyro source: {src.get('title', src['id'])}]\n"
              f"Citation: {src.get('citation', '')}\n\n")
    body = header + _clean_text(text) + "\n"
    out = os.path.join(INPUT_DIR, f"{src['id']}.txt")
    with open(out, "w", encoding="utf-8") as f:
        f.write(body)
    return len(body)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated ids to fetch")
    ap.add_argument("--core-only", action="store_true", help="v1_core only")
    ap.add_argument("--list", action="store_true", help="print the plan and exit")
    a = ap.parse_args()

    sources = load_sources(MANIFEST)
    if a.core_only:
        sources = [s for s in sources if s["_section"] == "v1_core"]
    if a.only:
        want = {x.strip() for x in a.only.split(",")}
        sources = [s for s in sources if s["id"] in want]

    if a.list:
        for s in sources:
            print(f"  [{s['_section']:12}] {s['id']:34} {s['acquire']:14} {s.get('src','')[:70]}")
        print(f"\n{len(sources)} sources planned.")
        return

    results, ok = [], 0
    for s in sources:
        sid = s["id"]
        try:
            text, method, loc = acquire(s)
            n = write_doc(s, text)
            ok += 1
            results.append({"id": sid, "status": "ok", "method": method, "chars": n})
            print(f"  OK    {sid:34} {method:18} {n:>8} chars")
        except Exception as e:
            status = "awaiting" if isinstance(e, FileNotFoundError) and s["acquire"] == "user_provided" else "blocked"
            results.append({"id": sid, "status": status, "method": s["acquire"], "error": str(e)[:200]})
            print(f"  {status.upper():6}{sid:34} {s['acquire']:18} {str(e)[:90]}")

    with open(REPORT, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    blocked = [r["id"] for r in results if r["status"] == "blocked"]
    awaiting = [r["id"] for r in results if r["status"] == "awaiting"]
    print(f"\n{ok}/{len(sources)} ok"
          + (f" | blocked: {', '.join(blocked)}" if blocked else "")
          + (f" | awaiting file: {', '.join(awaiting)}" if awaiting else ""))
    print(f"report -> {os.path.relpath(REPORT, CLOUD)}   corpus -> {os.path.relpath(INPUT_DIR, CLOUD)}")


if __name__ == "__main__":
    main()
