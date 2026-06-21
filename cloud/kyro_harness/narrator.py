# cloud/kyro_harness/narrator.py
"""Ablation arm 1 — the BARE-Qwen baseline (no spine, no graph, no gate).

This is the floor of the ablation ladder (bare Qwen -> +graph -> +spine -> +gate):
a stock Qwen2.5-3B-Q4 reads a plain-language case summary and is asked to pick ONE of
the four harness actions, with nothing else holding it up. Its job in the report is to
make the spine-ablation collapse chart legible — to show how badly raw-model reasoning
does on operate-vs-transfer relative to the deterministic spine.

Three pure, ALWAYS-TESTED pieces + one GUARDED model call:

  - render_prose(evidence)  : deterministic, readable clinical summary of a raw-evidence
                              dict. No model. (Feeds the prompt; also handy for logs.)
  - parse_action(text)      : case-insensitive keyword map of free model prose -> exactly
                              one of the 4 action labels. NEVER raises; safe conservative
                              default (STABILIZE_TRANSFER) when nothing matches.
  - model_available()       : True only when llama-cpp-python imports AND KYRO_QWEN_GGUF
                              points at an existing file. Never raises.
  - bare_qwen_action(prose) : single-turn Qwen2.5-3B-Q4 completion -> parse_action.
                              Only call when model_available() is True (the heavy dep).

The on-device model Gowrish ships is Qwen2.5-3B-Q4; llama-cpp-python is an OPT-IN heavy
dependency (NOT installed by default) so the suite stays green where it is absent — the
model test SKIPS, the parser + renderer tests always run.
"""
from __future__ import annotations

import math
import os

# The four harness actions (matches kyro_harness.score.SAFE_ACTIONS, but inlined to keep
# this module import-light and avoid a cycle). The conservative default for parse_action
# is the transfer-out: when the model says nothing decidable, ship the patient.
ACTIONS = ('GUIDE', 'OBSERVE', 'STABILIZE_TRANSFER', 'ABSTAIN_STOP')
_DEFAULT_ACTION = 'STABILIZE_TRANSFER'

_QWEN_ENV = 'KYRO_QWEN_GGUF'


def _yn(v) -> str:
    """Normalise a yes/no-ish evidence value to a readable 'yes'/'no'/the raw string."""
    if isinstance(v, bool):
        return 'yes' if v else 'no'
    s = str(v).strip().lower()
    if s in ('yes', 'true', '1'):
        return 'yes'
    if s in ('no', 'false', '0', 'none', ''):
        return 'no'
    return s


def render_prose(evidence: dict) -> str:
    """Deterministic, readable clinical one-paragraph summary from a raw-evidence dict.

    Pulls the fields a clinician would narrate at the bedside: mechanism, GCS total + the
    lucid interval, pupil reactivity/size L and R, focal weakness side, posturing, age,
    SBP, the availability (not just the value) of SpO2 and glucose, anticoagulation, and
    whether transfer is feasible. Tolerant of missing keys (uses .get with 'unknown') so a
    partial evidence dict still renders. No model needed — pure string assembly."""
    e = evidence or {}

    age = e.get('age_yr', 'unknown')
    mech = e.get('mechanism', 'unknown')

    # GCS total: prefer a present component sum (do not depend on derive() having run).
    parts = [e.get('gcs_e'), e.get('gcs_v'), e.get('gcs_m')]
    if all(isinstance(p, (int, float)) for p in parts):
        gcs_total = int(parts[0] + parts[1] + parts[2])
        gcs_str = f"GCS {gcs_total} (E{int(parts[0])}V{int(parts[1])}M{int(parts[2])})"
    elif isinstance(e.get('gcs_total'), (int, float)) and not (
            isinstance(e.get('gcs_total'), float) and math.isnan(e['gcs_total'])):
        gcs_str = f"GCS {int(e['gcs_total'])}"
    else:
        gcs_str = "GCS unknown"

    lucid = _yn(e.get('lucid_interval', 'unknown'))

    pl_r = e.get('pupil_react_l', 'unknown')
    pr_r = e.get('pupil_react_r', 'unknown')
    pl_s = e.get('pupil_size_l_mm', '?')
    pr_s = e.get('pupil_size_r_mm', '?')
    pupils = (f"left pupil {pl_s}mm {pl_r}, right pupil {pr_s}mm {pr_r}")

    weak = e.get('focal_weakness_side', 'none')
    weak_str = "no focal weakness" if str(weak).lower() in ('none', 'no', '') \
        else f"{weak}-sided focal weakness"

    posturing = e.get('posturing', 'none')
    post_str = "no posturing" if str(posturing).lower() in ('none', 'no', '') \
        else f"{posturing} posturing"

    sbp = e.get('sbp_mmhg', 'unknown')

    spo2 = (f"SpO2 {e.get('spo2_pct')}%" if _yn(e.get('spo2_available')) == 'yes'
            and e.get('spo2_pct') is not None else "SpO2 unavailable")
    glucose = (f"glucose {e.get('blood_glucose')}" if _yn(e.get('glucose_available')) == 'yes'
               and e.get('blood_glucose') is not None else "glucose unavailable")

    anticoag = e.get('anticoag_antiplatelet', 'unknown')
    anticoag_str = "no anticoagulant/antiplatelet" if str(anticoag).lower() in ('none', 'no', '') \
        else f"on {anticoag}"

    tsi = e.get('time_since_injury_hr', 'unknown')
    transfer = _yn(e.get('transfer_feasible_within_window', 'unknown'))
    transfer_str = ("transfer feasible within window" if transfer == 'yes'
                    else "transfer NOT feasible within window" if transfer == 'no'
                    else "transfer feasibility unknown")

    return (
        f"{age}-year-old, mechanism {mech}, {tsi}h since injury. "
        f"{gcs_str}; lucid interval: {lucid}. "
        f"Pupils: {pupils}. "
        f"{weak_str}; {post_str}. "
        f"SBP {sbp} mmHg; {spo2}; {glucose}; {anticoag_str}. "
        f"{transfer_str}."
    )


def parse_action(text: str) -> str:
    """Map free model prose -> exactly one of the 4 actions, case-insensitively.

    Priority order resolves conflicts sensibly:
      1. ABSTAIN / STOP / 'cannot' / 'unable' / 'defer'  -> ABSTAIN_STOP
         (an explicit refusal beats everything — safest to honour the model declining)
      2. TRANSFER / refer / evacuate-elsewhere / 'send'  -> STABILIZE_TRANSFER
      3. OBSERVE / monitor / 'serial' / 'watch' / 'wait' -> OBSERVE
      4. GUIDE / operate / drill / burr / craniotomy / evacuate / decompress -> GUIDE

    NEVER raises. If nothing matches, returns the conservative default
    (STABILIZE_TRANSFER — transfer the patient out)."""
    if not text:
        return _DEFAULT_ACTION
    t = str(text).lower()

    # If the model emitted an exact label token, that is the strongest signal — honour it.
    # (Checked in the same priority order so a label still beats a looser keyword elsewhere.)
    for label in ('ABSTAIN_STOP', 'STABILIZE_TRANSFER', 'OBSERVE', 'GUIDE'):
        if label.lower() in t:
            return label

    # 1. explicit abstention / inability — beats everything else.
    if any(k in t for k in ('abstain', 'stop', 'cannot', "can't", 'unable', 'defer',
                            'do not proceed', "don't proceed", 'insufficient')):
        return 'ABSTAIN_STOP'

    # 2. transfer / refer out. (NB: 'evacuate' is intentionally NOT here — in this surgical
    #    context it means evacuate the clot = GUIDE, handled in branch 4 below.)
    if any(k in t for k in ('transfer', 'refer', 'send to', 'ship to', 'higher center',
                            'higher centre', 'tertiary', 'higher level')):
        return 'STABILIZE_TRANSFER'

    # 3. observe / monitor / watchful waiting.
    if any(k in t for k in ('observe', 'monitor', 'serial', 'watch', 'wait', 'conservativ',
                            'expectant')):
        return 'OBSERVE'

    # 4. operate / drill the burr hole / evacuate the clot locally.
    if any(k in t for k in ('guide', 'operate', 'surger', 'surgical', 'drill', 'burr',
                            'crani', 'evacuat', 'decompress', 'trephin')):
        return 'GUIDE'

    return _DEFAULT_ACTION


def model_available() -> bool:
    """True only if llama-cpp-python imports AND KYRO_QWEN_GGUF points at an existing file.

    Never raises — any import or filesystem error means 'not available' (the model test
    SKIPS, the suite stays green on machines without the heavy dep / the GGUF)."""
    try:
        path = os.environ.get(_QWEN_ENV)
        if not path or not os.path.isfile(path):
            return False
        import importlib.util
        return importlib.util.find_spec('llama_cpp') is not None
    except Exception:
        return False


_PROMPT = (
    "You are a rural GMO with no CT scanner. Given this case: {prose}. "
    "Choose EXACTLY ONE next action: GUIDE, OBSERVE, STABILIZE_TRANSFER, or ABSTAIN_STOP. "
    "Answer with only the action."
)


_LLM = None


def _get_llm():
    """Lazily load + cache the Qwen GGUF once. A fresh Llama() per case would reload the
    ~2 GB model ten times over a harness run. Guarded import — only reached when
    model_available() is True."""
    global _LLM
    if _LLM is None:
        from llama_cpp import Llama  # heavy, opt-in import
        # n_threads=1 for REPRODUCIBILITY: multi-threaded float-reduction order makes llama.cpp
        # non-deterministic even at temp=0, which would wobble the benchmark run-to-run. Arm 1 is
        # only 10 short generations, so single-thread is an acceptable cost for a citable number.
        _LLM = Llama(model_path=os.environ.get(_QWEN_ENV), n_ctx=1024,
                     n_threads=1, seed=0, verbose=False)
    return _LLM


def bare_qwen_action(prose: str) -> str:
    """Run stock Qwen2.5-3B-Q4 (the on-device model class) once on the case prose and
    return one of the 4 actions via parse_action.

    Single-turn, deterministic (temp=0). Uses create_chat_completion so the model's INSTRUCT
    chat template is applied: a raw create_completion makes an instruct model *continue* the
    prompt text instead of answering it, which collapses the baseline to noise (0/10). With
    the chat template the unaided model gives real (mostly over-cautious 'transfer') answers.
    Only call when model_available() is True; the GGUF (KYRO_QWEN_GGUF) is loaded once + cached."""
    out = _get_llm().create_chat_completion(
        messages=[{'role': 'user', 'content': _PROMPT.format(prose=prose)}],
        max_tokens=16,
        temperature=0.0,
        top_p=1.0,
        seed=0,
    )
    text = out['choices'][0]['message']['content']
    return parse_action(text)
