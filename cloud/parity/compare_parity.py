#!/usr/bin/env python3
"""Part B — the cross-plane acceptance gate.

Diffs the cloud parity file (parity_cloud.json, produced here) against the device parity file
(parity_device.json, produced by Gowrish on llama.rn in the SAME schema) and decides PASS/FAIL
against the agreed bar:

    on >=95% of shared queries, the top-3 chunk SET is identical AND there is no swap within
    the top-3 (i.e. identical order for the first three).

The two files must share the `queries[].id` + `queries[].top_chunks[].chunk_id` schema. The
device side need only emit, per query, an ordered `top_chunks` list of `{chunk_id}` — the rest
of the cloud schema is optional for the diff.

Run:  python -m parity.compare_parity parity/parity_cloud.json parity/parity_device.json
"""
from __future__ import annotations

import argparse
import json


def top_ids(qr: dict, n: int) -> list:
    return [c["chunk_id"] for c in qr.get("top_chunks", [])[:n]]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("cloud")
    ap.add_argument("device")
    ap.add_argument("--bar", type=float, default=0.95)
    a = ap.parse_args()

    C = {q["id"]: q for q in json.load(open(a.cloud))["queries"]}
    D = {q["id"]: q for q in json.load(open(a.device))["queries"]}
    ids = sorted(set(C) & set(D))
    if not ids:
        print("FAIL: no shared query ids between the two files")
        return 1

    set_ok = order_ok = both_ok = 0
    rows = []
    for qid in ids:
        c3, d3 = top_ids(C[qid], 3), top_ids(D[qid], 3)
        s = set(c3) == set(d3)
        o = c3 == d3
        set_ok += s
        order_ok += o
        both_ok += s and o
        rows.append((qid, s, o, c3, d3))

    n = len(ids)
    both_rate = both_ok / n
    print(f"queries compared: {n}  (cloud-only: {sorted(set(C) - set(D))}  device-only: {sorted(set(D) - set(C))})")
    print(f"  top-3 SET identical:               {set_ok}/{n} = {set_ok / n:.1%}")
    print(f"  top-3 SET identical AND no swap:   {both_ok}/{n} = {both_rate:.1%}")
    for qid, s, o, c3, d3 in rows:
        if not (s and o):
            tag = "ORDER-SWAP" if s else "SET-DIFF"
            print(f"    [{tag}] {qid}: cloud={c3} device={d3}")
    ok = both_rate >= a.bar
    print(f"ACCEPTANCE (>= {a.bar:.0%}): {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
