# cloud/kyro_harness/__main__.py
"""End-to-end harness CLI — the one command that runs the ablation ladder and renders the
spine-ablation collapse chart (the single most persuasive validation artifact in the deck).

    python -m kyro_harness --bundle cloud/bundles/edh-core-v0-mock.kyro --out cloud/out/

It wires the pieces already on disk:

  1. load_cases()           — the mentor-signed Tier-A vignette answer key.
  2. load_spine(bundle)     — the signed L1 CGT (signature-verified on load).
  3. run_arm(3) / run_arm(4) — the deterministic rungs (+spine, +spine+gate). ALWAYS run.
  4. run_arm(1)             — the bare-Qwen floor. Run ONLY if narrator.model_available();
                              otherwise recorded ABSENT (note "arm 1 pending"), never a crash.
  5. score_run(rows)        — per-arm metrics aligned to the same (got, expected, must_abstain).
  6. report.render(...)     — writes collapse.png, confusion.png, results.json into --out.

Deterministic arms are pure (no model libs), so this runs green on the cloud build plane
where llama-cpp / the GGUF are absent. Arm 1 is gated, not assumed — it is the only rung that
needs the heavy dep, and its absence is the EXPECTED state here, reported plainly.

Paths are resolved against the repo root so the command works run from the repo root OR from
cloud/ (the default --bundle / --out are relative to the repo, but an absolute --bundle / --out
is honoured as-is)."""
from __future__ import annotations

import argparse
import os
import sys

from kyro_engine.loader import load_spine
from kyro_harness import narrator, report
from kyro_harness.ablation import run_arm
from kyro_harness.score import score_run
from kyro_harness.vignettes import load_cases

# Repo root = two levels up from this file: cloud/kyro_harness/__main__.py -> repo/.
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_THIS_DIR, '..', '..'))

DEFAULT_BUNDLE = os.path.join('cloud', 'bundles', 'edh-core-v0-mock.kyro')
DEFAULT_OUT = os.path.join('cloud', 'out')


def _resolve_input(p: str) -> str:
    """Resolve an INPUT path (the bundle) that must already exist, robustly across cwds.

    Absolute paths are honoured as-is. A relative path is tried first against the current
    working directory (so ``bundles/edh-core-v0-mock.kyro`` works when run from cloud/), then
    against the repo root (so the ``cloud/bundles/...`` default works when run from the repo
    root). The first existing candidate wins; if none exists we fall back to the repo-root
    candidate so the loader raises a clear, absolute 'bundle not found'."""
    if os.path.isabs(p):
        return p
    for base in (os.getcwd(), _REPO_ROOT):
        cand = os.path.abspath(os.path.join(base, p))
        if os.path.exists(cand):
            return cand
    return os.path.abspath(os.path.join(_REPO_ROOT, p))


def _resolve_output(p: str) -> str:
    """Resolve an OUTPUT path (the out dir), which need not exist yet.

    Absolute paths are honoured as-is. A relative path that names an existing cloud/ default
    (``cloud/...``) is anchored to the repo root so it lands in the right place from either cwd;
    otherwise it is anchored to the current working directory (so a user-supplied ``--out foo``
    writes where they ran the command)."""
    if os.path.isabs(p):
        return p
    norm = p.replace('\\', '/')
    if norm.startswith('cloud/'):
        return os.path.abspath(os.path.join(_REPO_ROOT, p))
    return os.path.abspath(os.path.join(os.getcwd(), p))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog='kyro_harness',
        description='Run the Kyro ablation ladder and render the spine-ablation collapse chart.',
    )
    parser.add_argument('--bundle', default=DEFAULT_BUNDLE,
                        help='signed .kyro spine bundle (default: %(default)s, relative to repo)')
    parser.add_argument('--out', default=DEFAULT_OUT,
                        help='output dir for collapse.png/confusion.png/results.json '
                             '(default: %(default)s, relative to repo)')
    args = parser.parse_args(argv)

    bundle = _resolve_input(args.bundle)
    out_dir = _resolve_output(args.out)

    cases = load_cases()
    spine = load_spine(bundle)

    scores_by_arm = {}
    arm_status = {}  # arm -> 'ran' | 'absent'

    # Deterministic rungs — always run (no model libs needed).
    for arm in (3, 4):
        scores_by_arm[arm] = score_run(run_arm(arm, spine, cases))
        arm_status[arm] = 'ran'

    # Model arms — gated on a real model. Absent is the EXPECTED state on the build plane.
    #   arm 1 = bare Qwen (floor); arm 2 = +graph (model + retrieved L2 context, needs the bundle).
    if narrator.model_available():
        for arm in (1, 2):
            try:
                scores_by_arm[arm] = score_run(run_arm(arm, spine, cases, bundle=bundle))
                arm_status[arm] = 'ran'
            except (RuntimeError, ValueError) as e:  # model/bundle gap at call time
                arm_status[arm] = 'absent'
                print(f"[harness] arm {arm} ({report.ARM_LABELS.get(arm, arm)}) skipped: {e}")
    else:
        for arm in (1, 2):
            arm_status[arm] = 'absent'
        print("[harness] arms 1 (bare Qwen) + 2 (+graph) pending: no model "
              "(set KYRO_QWEN_GGUF + install llama-cpp-python to run them).")

    report.render(scores_by_arm, out_dir)

    # Concise summary: which arms ran, their headline numbers, and where the chart landed.
    print(f"[harness] cases: {len(cases)}; bundle: {bundle}")
    for arm in sorted(set(arm_status) | set(scores_by_arm)):
        label = report.ARM_LABELS.get(arm, f"arm {arm}")
        if arm in scores_by_arm and arm_status.get(arm) == 'ran':
            s = scores_by_arm[arm]
            print(f"[harness] arm {arm} ({label}): RAN  "
                  f"action_accuracy={s.action_accuracy:.2f}  harm_count={s.harm_count}")
        else:
            print(f"[harness] arm {arm} ({label}): PENDING (model absent)")

    chart = os.path.join(out_dir, 'collapse.png')
    print(f"[harness] collapse chart -> {chart}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
