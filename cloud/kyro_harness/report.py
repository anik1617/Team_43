# cloud/kyro_harness/report.py
"""Render the ablation-ladder validation artifacts: the spine-ablation collapse
chart, the directional confusion matrix, and a machine-readable results.json.

The collapse chart (Kyro with vs. without the L1 spine) is the single most
persuasive validation artifact in the deck. This module turns scored arms into
images a slide can carry, plus a results.json a downstream consumer can read.

Headless by construction: matplotlib's Agg backend is selected BEFORE pyplot is
imported, so this renders on a server/CI with no display. Pure rendering — it
imports nothing from the engine; it consumes ``Scores`` objects produced by
``score.score_run`` and writes files to ``out_dir``.

What "provisional" means here (printed to stdout and stamped into results.json):
the answer key is the mentor-signed docs/21 Tier-A set (10 cases); the 38-case
doc-19 expansion is roadmap; and blind-encoding is NOT claimed — the encoder saw
the expected paths. We say so plainly so a skeptical-MD reader is never misled.
"""
from __future__ import annotations

import json
import os
from typing import Dict, Mapping

import matplotlib

matplotlib.use("Agg")  # headless — MUST precede the pyplot import below

import matplotlib.pyplot as plt  # noqa: E402

from kyro_harness.score import Scores  # noqa: E402

# The arms a collapse chart can carry, and their slide labels (the ladder rungs).
ARM_LABELS = {
    1: "bare Qwen",
    2: "+graph",
    3: "+spine",
    4: "+spine+gate",
}

# The four-action vocabulary, fixed order for the confusion heatmap axes so the
# safe/transfer cells sit in a predictable place across runs.
ACTIONS = ["GUIDE", "OBSERVE", "STABILIZE_TRANSFER", "ABSTAIN_STOP"]

_PROVISIONAL_NOTE = (
    "provisional — answer key is mentor-signed docs/21 Tier-A (10 cases); "
    "38-case doc-19 expansion is roadmap; blind-encoding NOT claimed "
    "(encoder saw expected paths)."
)


def _n_of(s: Scores) -> int:
    """Number of rows scored. Prefer the stored ``n``; otherwise recover it from
    the confusion totals (every scored row contributes exactly one cell count)."""
    if getattr(s, "n", 0):
        return s.n
    return sum(s.confusion.values())


def _harm_rate(s: Scores) -> float:
    n = _n_of(s)
    return (s.harm_count / n) if n else 0.0


def _render_collapse(scores_by_arm: Mapping[int, Scores], path: str) -> None:
    """Grouped bar chart over the arms present: action accuracy vs. harm rate.

    Arms absent from ``scores_by_arm`` are simply omitted — never implied present.
    """
    arms = sorted(scores_by_arm.keys())
    labels = [ARM_LABELS.get(a, f"arm {a}") for a in arms]
    accuracy = [scores_by_arm[a].action_accuracy for a in arms]
    harm = [_harm_rate(scores_by_arm[a]) for a in arms]

    x = list(range(len(arms)))
    width = 0.38

    fig, ax = plt.subplots(figsize=(max(4, 1.8 * len(arms) + 2), 4.2))
    bars_acc = ax.bar([i - width / 2 for i in x], accuracy, width,
                      label="action accuracy", color="#2a7d4f")
    bars_harm = ax.bar([i + width / 2 for i in x], harm, width,
                       label="harm rate", color="#b3352b")

    ax.set_title("Spine-ablation: action accuracy vs harm rate")
    ax.set_ylabel("rate")
    ax.set_ylim(0, 1.0)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.legend(loc="upper right")
    ax.bar_label(bars_acc, fmt="%.2f", padding=2, fontsize=8)
    ax.bar_label(bars_harm, fmt="%.2f", padding=2, fontsize=8)

    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def _render_confusion(s: Scores, arm: int, path: str) -> None:
    """Heatmap of one arm's confusion matrix over the four actions.

    Rows = expected, columns = got (the score module keys confusion as
    ``(expected, got)``), so a directionally-safe error — operating-indicated case
    handled by transferring/abstaining — lands above the diagonal, making the
    "errors cluster on the safe/transfer side" claim legible.
    """
    n_act = len(ACTIONS)
    idx = {a: i for i, a in enumerate(ACTIONS)}
    grid = [[0] * n_act for _ in range(n_act)]
    for (expected, got), count in s.confusion.items():
        # Tolerate any action outside the canonical four without crashing.
        if expected in idx and got in idx:
            grid[idx[expected]][idx[got]] += count

    fig, ax = plt.subplots(figsize=(5.6, 5.0))
    im = ax.imshow(grid, cmap="Reds", aspect="equal")

    ax.set_title(f"Directional confusion (arm {arm} = {ARM_LABELS.get(arm, arm)})")
    ax.set_xlabel("got (system action)")
    ax.set_ylabel("expected (answer key)")
    ax.set_xticks(range(n_act))
    ax.set_yticks(range(n_act))
    ax.set_xticklabels(ACTIONS, rotation=30, ha="right", fontsize=8)
    ax.set_yticklabels(ACTIONS, fontsize=8)

    # Annotate every cell so the matrix reads without a colorbar lookup.
    for r in range(n_act):
        for c in range(n_act):
            v = grid[r][c]
            ax.text(c, r, str(v), ha="center", va="center",
                    color="white" if v and v == max(max(row) for row in grid) else "black",
                    fontsize=9)

    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def render(scores_by_arm: Dict[int, Scores], out_dir: str) -> None:
    """Render the collapse chart, confusion heatmap, and results.json.

    ``scores_by_arm`` maps arm number (1/3/4) -> a ``Scores`` object. Absent arms
    are omitted from the chart AND recorded as absent in results.json (the keys in
    ``arms_run`` are exactly the arms passed — never silently implied present).
    Creates ``out_dir`` if needed.
    """
    os.makedirs(out_dir, exist_ok=True)

    collapse_path = os.path.join(out_dir, "collapse.png")
    confusion_path = os.path.join(out_dir, "confusion.png")
    results_path = os.path.join(out_dir, "results.json")

    _render_collapse(scores_by_arm, collapse_path)

    # Confusion: the highest available deterministic arm (4 > 3); fall back to any
    # arm present if neither deterministic arm was run.
    conf_arm = None
    for candidate in (4, 3):
        if candidate in scores_by_arm:
            conf_arm = candidate
            break
    if conf_arm is None and scores_by_arm:
        conf_arm = sorted(scores_by_arm.keys())[0]

    if conf_arm is not None:
        _render_confusion(scores_by_arm[conf_arm], conf_arm, confusion_path)
    else:
        # No arms at all — still emit an (empty) confusion image so the artifact
        # set is complete and downstream consumers never hit a missing file.
        _render_confusion(
            Scores(action_accuracy=0.0, confusion={}, must_abstain_recall=1.0,
                   harm_count=0, coverage=0.0, n=0),
            arm=-1, path=confusion_path,
        )

    arms = sorted(scores_by_arm.keys())
    per_arm = {
        str(a): {
            "action_accuracy": scores_by_arm[a].action_accuracy,
            "harm_count": scores_by_arm[a].harm_count,
            "must_abstain_recall": scores_by_arm[a].must_abstain_recall,
            "coverage": scores_by_arm[a].coverage,
        }
        for a in arms
    }
    results = {
        "arms_run": [str(a) for a in arms],
        "per_arm": per_arm,
        "provisional": True,
        "note": _PROVISIONAL_NOTE,
    }
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    present = ", ".join(f"{a}={ARM_LABELS.get(a, a)}" for a in arms) or "none"
    print(
        f"[report] PROVISIONAL — arms_run: [{present}]; "
        f"confusion = arm {conf_arm}; key = docs/21 Tier-A (10 cases); "
        f"blind-encoding NOT claimed. -> {out_dir}"
    )
