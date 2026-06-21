# Cloud `kyro_engine` + `kyro_harness` Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic spine executor (`kyro_engine`) and the benchmark harness (`kyro_harness`) that produce Kyro's GPU-free validation evidence — the spine-ablation collapse chart + the deterministic metrics — on the existing mock/selftest bundle.

**Architecture:** `kyro_engine` *reconciles and refactors* Gowrish's validated `edge/e3/conformance.py` (the Python oracle his TS executor already matches) into clean modules, then adds a result object, mode badge, citation collection, and bundle-signature verification. `kyro_harness` drives the engine over the 38 vignettes (encoded blind), scores the metrics, and renders the collapse chart across ablation arms 1 (bare Qwen), 3 (spine), 4 (spine+gate). The deterministic action decision needs only the `cgt_*` tables, so the whole MUST runs on the mock bundle with no model and no GPU.

**Tech Stack:** Python 3.11, stdlib `sqlite3` + `sqlite-vec`, `cryptography` (ed25519 verify, reuse `cloud/kyro_bundle/signing.py`), `matplotlib`, `pytest`. Arm 1 only: `llama-cpp-python` + a Qwen-4B-Q4 GGUF (CPU).

**Ground truth to mirror (read before coding):** `edge/e3/conformance.py` (executor + `derive()` + `to_py()`), `spine/edh-cgt.sql` (the tree), `cloud/kyro_bundle/signing.py` (verify), `docs/19-test-vignettes.md` + `docs/21-cgt-mentor-pack.md` (the answer key). **Parity rule:** `kyro_engine`'s `conditions.py`/`derive.py` MUST stay byte-equivalent in behavior to `conformance.py` — when his `derive()` changes, ours changes; a CI parity test (Task 11) enforces it.

**Test-harness setup (do FIRST — blocker fix):** tests run from **inside `cloud/`** and `tests/` is **NOT** a package (do not create `cloud/tests/__init__.py`). Run all tests: `cd cloud && .venv/Scripts/python -m pytest tests -v`. This is the one combination that resolves BOTH `import kyro_engine`/`kyro_harness` AND the flat `from test_derive import HM` cross-test imports (verified). Every `Run:` command below is relative to `cloud/`.

---

## Chunk 1: `kyro_engine` core (the deterministic executor)

**File structure (all under `cloud/kyro_engine/`):**
- `__init__.py` — package marker
- `conditions.py` — `to_py()` + `cond_true()` (ported verbatim from `conformance.py`, the `cgt_edges` condition grammar)
- `derive.py` — `derive()` (ported from `conformance.py`; the `[VERIFY-MENTOR]` clinical formulas + S1–S4 sentinels)
- `loader.py` — load `cgt_*` from a `.kyro` + **verify signature** (reuse `kyro_bundle.signing`) + expose strings/citations
- `result.py` — `KyroResult` dataclass
- `executor.py` — `traverse()` → `KyroResult` (action / leaf / mode / citations / trajectory)
- Tests: `cloud/tests/test_conditions.py`, `test_derive.py`, `test_loader.py`, `test_executor.py`, `test_parity.py`

---

### Task 1: `conditions.py` — the condition grammar (port + lock)

**Files:** Create `cloud/kyro_engine/__init__.py`, `cloud/kyro_engine/conditions.py`, `cloud/tests/test_conditions.py`  *(do NOT create `cloud/tests/__init__.py` — `tests/` must stay non-packaged, per the setup note above)*

- [ ] **Step 1: Write the failing test**

```python
# cloud/tests/test_conditions.py
from kyro_engine.conditions import to_py, cond_true

def test_to_py_translates_grammar():
    assert to_py("gcs_total <= 8") == "gcs_total <= 8"
    assert to_py("mechanism = 'rta'") == "mechanism == 'rta'"
    assert to_py("x <> 'none'") == "x != 'none'"
    assert to_py("age_yr BETWEEN 15 AND 49") == "(15 <= age_yr <= 49)"

def test_cond_true_evaluates_against_env():
    env = {"gcs_total": 7, "mechanism": "rta", "herniation_signs": True}
    assert cond_true("gcs_total <= 8 AND mechanism = 'rta'", env) is True
    assert cond_true("herniation_signs = true", env) is True
    assert cond_true("gcs_total > 12", env) is False
    assert cond_true("true", env) is True

def test_cond_true_is_sandboxed():
    # no builtins available inside the eval except range
    import pytest
    with pytest.raises(Exception):
        cond_true("__import__('os')", {})
```

- [ ] **Step 2: Run test to verify it fails** — `cd cloud && .venv/Scripts/python -m pytest tests/test_conditions.py -v` → FAIL (module not found)

- [ ] **Step 3: Write minimal implementation** (port from `edge/e3/conformance.py` lines 26–42, unchanged behavior)

```python
# cloud/kyro_engine/conditions.py
"""cgt_edges condition grammar → Python. Behavioral mirror of edge/e3/conformance.py
to_py/cond_true and edge/e3/conditions.ts. PARITY-CRITICAL: keep byte-equivalent in behavior."""
import re

def to_py(cond: str) -> str:
    s = cond
    s = re.sub(r'\btrue\b', 'True', s); s = re.sub(r'\bfalse\b', 'False', s)
    s = s.replace('<>', '!=')
    s = re.sub(r'(?<![<>=!])=(?!=)', '==', s)
    s = re.sub(r'(\w+)\s+BETWEEN\s+(\d+)\s+AND\s+(\d+)', r'(\2 <= \1 <= \3)', s)
    s = re.sub(r'NOT\s+IN\s+\[(\d+)\.\.(\d+)\]',
               lambda m: f'not in range({int(m.group(1))},{int(m.group(2))+1})', s)
    s = re.sub(r'\bIN\b', 'in', s); s = re.sub(r'\bNOT\b', 'not', s)
    s = re.sub(r'\bAND\b', 'and', s); s = re.sub(r'\bOR\b', 'or', s)
    return s

def cond_true(cond: str, env: dict) -> bool:
    if cond == 'true':
        return True
    return bool(eval(to_py(cond), {'__builtins__': {}, 'range': range}, env))
```

- [ ] **Step 4: Run test to verify it passes** — same pytest command → PASS

- [ ] **Step 5: Commit** — `git add cloud/kyro_engine/__init__.py cloud/kyro_engine/conditions.py cloud/tests/ && git commit -m "feat(engine): conditions grammar (port of conformance.py to_py/cond_true)"`

---

### Task 2: `derive.py` — the derivation layer

**Files:** Create `cloud/kyro_engine/derive.py`, `cloud/tests/test_derive.py`

- [ ] **Step 1: Write the failing test**

```python
# cloud/tests/test_derive.py
from kyro_engine.derive import derive

HM = dict(mechanism='rta', mechanism_class='blunt', time_since_injury_hr=3,
          gcs_e=1, gcs_v=2, gcs_m=4, pupil_size_l_mm=6, pupil_react_l='fixed',
          pupil_size_r_mm=3, pupil_react_r='brisk', sbp_mmhg=160, age_yr=31,
          spo2_pct=95, spo2_available='yes', blood_glucose=0, glucose_available='no',
          lucid_interval='yes', focal_weakness_side='right', posturing='none',
          seizure_status='none', anticoag_antiplatelet='none', known_coagulopathy='no')

def test_derive_computes_clinical_fields():
    e = derive(dict(HM))
    assert e['gcs_total'] == 7
    assert e['fixed_pupil_side'] == 'left'
    assert e['herniation_signs'] is True
    assert e['gcs_valid'] is True

def test_derive_flags_out_of_range_gcs():
    e = derive({**HM, 'gcs_e': 7})           # invalid component
    assert e['gcs_valid'] is False
    assert e['any_critical_field_missing'] is True

def test_derive_sbp_age_stratified():
    assert derive({**HM, 'age_yr': 60, 'sbp_mmhg': 95})['sbp_at_target'] is False
    assert derive({**HM, 'age_yr': 60, 'sbp_mmhg': 105})['sbp_at_target'] is True
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement** — port `edge/e3/conformance.py` lines 48–76 verbatim into `derive(e: dict) -> dict`, keeping every `# [VERIFY-MENTOR]` comment. (Copy the function body exactly; do not "improve" the clinical formulas — parity + sign-off depend on it.)

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** — `git commit -m "feat(engine): derivation layer (port of conformance.py derive, VERIFY-MENTOR markers kept)"`

---

### Task 3: `loader.py` — load + verify a bundle

**Files:** Create `cloud/kyro_engine/loader.py`, `cloud/tests/test_loader.py`

- [ ] **Step 1: Write the failing test** (uses the committed mock bundle)

```python
# cloud/tests/test_loader.py
import os
from kyro_engine.loader import load_spine, BundleError
import pytest

MOCK = os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro')

def test_load_spine_reads_cgt():
    sp = load_spine(MOCK)
    assert sp.root == 'N00'
    assert len(sp.nodes) == 60
    assert sp.nodes['N40']['action'] == 'ABSTAIN_STOP'
    assert 'en' in sp.strings['L40']                  # L40 is a leaf that HAS an en string

def test_load_spine_verifies_signature_by_default():
    # tampering is out of scope here; assert it does NOT raise on a genuine bundle
    load_spine(MOCK, verify=True)

def test_load_spine_rejects_missing_file():
    with pytest.raises(BundleError):
        load_spine('does-not-exist.kyro')
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement** — first define the return type, then `load_spine`:

```python
# cloud/kyro_engine/loader.py (top)
from dataclasses import dataclass, field
class BundleError(Exception): ...
@dataclass
class Spine:
    nodes: dict                                   # id -> {kind, field, action, source_citation, trust_tier}
    edges: list                                   # [{src, dst, cond}]
    root: str
    strings: dict = field(default_factory=dict)   # node_id -> {lang: (prompt, recommendation)}; ONLY nodes with rows
```

`load_spine(path, verify=True)` raises `BundleError` if the file is missing; opens the bundle with sqlite-vec (mirror `cloud/kyro_bundle/bundle_writer.open_bundle`); when `verify=True`, reuses `kyro_bundle.signing` — `verify(manifest_digest(conn), m_sig, pub)` and `verify(cgt_digest(conn), cgt_sig, pub)` — raising `BundleError` on failure. Reads `cgt_nodes` (incl. `source_citation`, `trust_tier`), `cgt_edges`, `root_id`, and `cgt_strings` into the `Spine`. Mirror `conformance.load()` (lines 16–23) for nodes/edges/root. **Consumers MUST use `spine.strings.get(id, {})`** — terminals (N40/N98/N99) have no string row.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** — `git commit -m "feat(engine): bundle loader with signature verify (reuses kyro_bundle.signing)"`

---

### Task 4: `result.py` + `executor.py` — traverse to a rich result

**Files:** Create `cloud/kyro_engine/result.py`, `cloud/kyro_engine/executor.py`, `cloud/tests/test_executor.py`

- [ ] **Step 1: Write the failing test** (the three canonical cases — parity with conformance)

```python
# cloud/tests/test_executor.py
import os
from kyro_engine.loader import load_spine
from kyro_engine.executor import run
from kyro_engine.derive import derive  # for the HM/PEDS/INVALID fixtures
from test_derive import HM             # reuse the fixture

MOCK = os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro')

def test_run_three_canonical_cases():
    sp = load_spine(MOCK)
    assert run(sp, HM).action == 'GUIDE'
    assert run(sp, {**HM, 'age_yr': 10}).action == 'STABILIZE_TRANSFER'
    assert run(sp, {**HM, 'gcs_e': 7}).action == 'ABSTAIN_STOP'

def test_result_has_trajectory_and_leaf():
    r = run(load_spine(MOCK), HM)
    assert r.leaf_id and r.trajectory[0] == 'N00'
    assert r.action in ('GUIDE','OBSERVE','STABILIZE_TRANSFER','ABSTAIN_STOP')
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement**

```python
# cloud/kyro_engine/result.py
from dataclasses import dataclass, field
@dataclass
class KyroResult:
    action: str
    leaf_id: str
    mode: str = ""            # 🟢/🟡/🔴 — set in Task 5
    citations: list = field(default_factory=list)
    trajectory: list = field(default_factory=list)
    stuck: bool = False
```

```python
# cloud/kyro_engine/executor.py
"""Code-driven CGT traversal. Behavioral mirror of conformance.py traverse(), returning
a KyroResult. CODE decides traversal; the model never does."""
from .conditions import cond_true
from .derive import derive
from .result import KyroResult

def run(spine, raw_evidence: dict, max_steps: int = 60) -> KyroResult:
    env = derive(dict(raw_evidence))
    cur, path = spine.root, []
    for _ in range(max_steps):
        node = spine.nodes[cur]; path.append(cur)
        if node['action'] is not None:                       # ACT (leaf/terminal)
            return KyroResult(action=node['action'], leaf_id=cur, trajectory=path)
        nxt = next((e['dst'] for e in spine.edges
                    if e['src'] == cur and cond_true(e['cond'], env)), None)
        if nxt is None:                                      # STUCK (no edge fired)
            return KyroResult(action='ABSTAIN_STOP', leaf_id=cur, trajectory=path, stuck=True)
        cur = nxt                                            # ADVANCE
    return KyroResult(action='ABSTAIN_STOP', leaf_id=cur, trajectory=path, stuck=True)
```

*(Note: a STUCK/loop fails safe to ABSTAIN_STOP — stricter than conformance.py's `STUCK@`/`LOOP` sentinels, which were diagnostic.)*

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** — `git commit -m "feat(engine): executor.run → KyroResult (parity with conformance.traverse)"`

---

### Task 5: mode badge + citations from the bundle

**Files:** Modify `cloud/kyro_engine/executor.py`, create `cloud/kyro_engine/mode.py`, `cloud/tests/test_mode.py`

- [ ] **Step 1: Write the failing test**

```python
# cloud/tests/test_mode.py
from kyro_engine.mode import parse_mode
def test_parse_mode_from_recommendation_tag():
    assert parse_mode("[RED / ABSTAIN_STOP] STOP. ...") == "🔴"
    assert parse_mode("[GREEN / OBSERVE] Admit and observe ...") == "🟢"
    assert parse_mode("[YELLOW - LABELED PRINCIPLE] ...") == "🟡"
    assert parse_mode("no tag here") == "🟡"   # default to grounded-principles, never empty
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement** `parse_mode(text)` — regex `\[\s*(GREEN|YELLOW|RED)` → 🟢/🟡/🔴; **default 🟡** for text without a leading tag or for `None`/empty (never raises, never empty). Then in `executor.run`, on the ACT branch: `rec = spine.strings.get(leaf_id, {}).get('en', ('', ''))[1]` (tolerant — terminals have no string) → `mode = parse_mode(rec)`; collect `citations` by walking `path`, gathering each node's `source_citation` (dedup, drop None).

  **Modes the canonical cases actually yield** (verified against the spine — terminals have no string of their own): INVALID→N99 → **🟡** (graduated default, *not* 🔴); HM→L21c (`[GUIDE - …; RED at the act]`, no *leading* tag) → **🟡**. So assert `run(sp, {**HM,'gcs_e':7}).mode == '🟡'` and `run(sp, HM).mode in ('🟢','🟡','🔴')`. *(Fine-grained 🔴-on-invalid + 🟢-with-coverage is a SHOULD refinement tied to L2 retrieval; the MUST badge is the leaf tag with a 🟡 default.)*

- [ ] **Step 4: Run → PASS** (both test_mode.py and test_executor.py)

- [ ] **Step 5: Commit** — `git commit -m "feat(engine): 🟢/🟡/🔴 mode badge (parsed from cgt_strings) + citation collection"`

---

### Task 6 (Chunk 1 close): three-way parity test

**Files:** Create `cloud/tests/test_parity.py`

- [ ] **Step 1: Write the test** — load the mock bundle, run `kyro_engine.executor.run` and `edge/e3/conformance.traverse` (import it) over `[HM, PEDS, INVALID]`; assert identical actions. This is the guard that `kyro_engine` never drifts from the edge oracle. **Keep the parity set to NON-STUCK cases** — all 3 canonical reach genuine action leaves (HM→L21c GUIDE, PEDS→N98 STABILIZE_TRANSFER, INVALID→N99 ABSTAIN_STOP); a stuck case would diverge (engine→`ABSTAIN_STOP` vs oracle→`STUCK@…`), so never add one to this set.

```python
# cloud/tests/test_parity.py
import os, importlib.util
from kyro_engine.loader import load_spine
from kyro_engine.executor import run
from test_derive import HM

def _load_conformance():
    p = os.path.join(os.path.dirname(__file__), '..', '..', 'edge', 'e3', 'conformance.py')
    spec = importlib.util.spec_from_file_location("conformance", p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

def test_engine_matches_edge_oracle():
    MOCK = os.path.join(os.path.dirname(__file__), '..', 'bundles', 'edh-core-v0-mock.kyro')
    conf = _load_conformance(); nodes, edges, root = conf.load(MOCK); sp = load_spine(MOCK)
    for raw in (HM, {**HM,'age_yr':10}, {**HM,'gcs_e':7}):
        assert run(sp, raw).action == conf.traverse(nodes, edges, root, raw)[0]
```

- [ ] **Step 2–4:** run → PASS (if it fails, the engine diverged from the oracle — fix the engine, never the oracle).
- [ ] **Step 5: Commit** — `git commit -m "test(engine): three-way parity vs edge/e3/conformance.py"`

---

## Chunk 2: `kyro_harness` — vignettes + scoring

**File structure (`cloud/kyro_harness/`):** `__init__.py`, `vignettes.py` (Case schema + the encoded cases + a `vignettes.csv` data file), `score.py`. Tests: `cloud/tests/test_vignettes.py`, `test_score.py`.

---

### Task 7: `Case` schema + blind-encoded vignette data

**Files:** Create `cloud/kyro_harness/__init__.py`, `cloud/kyro_harness/vignettes.py`, `cloud/kyro_harness/vignettes.csv`, `cloud/tests/test_vignettes.py`

**Blind-encoding protocol (do in this order, it is the methodological control):**
1. First commit: write `vignettes.csv` with `id, evidence_json` columns ONLY (no expected_action/mode), transcribed from a labels/paths-stripped reading of `docs/19`. Seed with HM + the 8 TA cases (their raw-evidence dicts are in `conformance.py` / `docs/21`).
2. Second commit: fill `expected_action, expected_mode, must_abstain` columns from `docs/21`'s coverage table. Git history proves inputs preceded targets.

- [ ] **Step 1: Write the failing test**

```python
# cloud/tests/test_vignettes.py
from kyro_harness.vignettes import load_cases, Case
def test_cases_load_and_are_well_formed():
    cases = load_cases()
    assert len(cases) >= 9                       # HM + 8 TA seeds at minimum (grows to 38)
    hm = next(c for c in cases if c.id == 'HM')
    assert hm.evidence['gcs_e'] == 1 and hm.expected_action == 'GUIDE'
    for c in cases:
        assert c.expected_action in ('GUIDE','OBSERVE','STABILIZE_TRANSFER','ABSTAIN_STOP')
        assert isinstance(c.must_abstain, bool)
```

- [ ] **Step 2: Run → FAIL**
- [ ] **Step 3: Implement** `Case` dataclass `{id, evidence: dict, expected_action, expected_mode, must_abstain}` + `load_cases()` reading `vignettes.csv` (json-decode the evidence column). Create `vignettes.csv` per the 2-commit protocol above (seed set first).
- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** (two commits per the protocol) — `git commit -m "data(harness): blind-encoded vignette evidence (inputs only)"` then `git commit -m "data(harness): vignette expected actions/modes from docs/21"`

---

### Task 8: `score.py` — metrics

**Files:** Create `cloud/kyro_harness/score.py`, `cloud/tests/test_score.py`

- [ ] **Step 1: Write the failing test**

```python
# cloud/tests/test_score.py
from kyro_harness.score import score_run, SAFE_ACTIONS
def test_action_accuracy_and_confusion():
    results = [("GUIDE","GUIDE",False), ("OBSERVE","STABILIZE_TRANSFER",False)]  # (got, expected, must_abstain)
    s = score_run(results)
    assert s.action_accuracy == 0.5
    assert s.confusion[("STABILIZE_TRANSFER","OBSERVE")] == 1   # expected->got

def test_abstention_recall_and_harm():
    results = [("ABSTAIN_STOP","ABSTAIN_STOP",True), ("GUIDE","ABSTAIN_STOP",True)]
    s = score_run(results)
    assert s.must_abstain_recall == 0.5
    assert s.harm_count == 1            # GUIDE on a must-abstain case = harmful
    assert 0.0 <= s.coverage <= 1.0
```

- [ ] **Step 2: Run → FAIL**
- [ ] **Step 3: Implement** `score_run(results)` → a `Scores` object: `action_accuracy`, `confusion` (dict[(expected,got)]→count), `must_abstain_recall` (over `must_abstain` subset), `harm_count` (a non-ABSTAIN action where `must_abstain` is True, OR GUIDE on an expected-STABILIZE_TRANSFER — "operated when should transfer"), `coverage` (fraction NOT forwarded-empty, i.e. action != ABSTAIN_STOP OR mode != 🔴). Define `SAFE_ACTIONS` and the within-safe-band logic.
- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** — `git commit -m "feat(harness): scoring (accuracy, confusion, abstention recall, harm, coverage)"`

---

### Task 9 (Chunk 2 close): harness regression vs docs/21

**Files:** Create `cloud/kyro_harness/run.py`, `cloud/tests/test_regression.py`

- [ ] **Step 1: Write the test** — load the mock bundle + all cases, run the engine over each, score; assert the deterministic arm reproduces `docs/21`: **0 harm**, and ≥ (37/len(cases)) safe-leaf rate. (As cases grow to 38, this becomes the literal "37/38, 0 harm" claim.)

```python
# cloud/tests/test_regression.py
import os
from kyro_engine.loader import load_spine
from kyro_engine.executor import run as run_engine
from kyro_harness.vignettes import load_cases
from kyro_harness.score import score_run

def test_deterministic_arm_zero_harm():
    sp = load_spine(os.path.join(os.path.dirname(__file__),'..','bundles','edh-core-v0-mock.kyro'))
    rows = [(run_engine(sp, c.evidence).action, c.expected_action, c.must_abstain) for c in load_cases()]
    s = score_run(rows)
    assert s.harm_count == 0
    assert s.must_abstain_recall == 1.0
```

- [ ] **Step 2–5:** run → PASS; investigate any harm/miss as either an encoding bug (fix the case) or a real spine gap (flag for mentor, do NOT edit the spine here). Commit — `git commit -m "test(harness): deterministic-arm regression (0 harm, full must-abstain recall)"`

---

## Chunk 3: ablation ladder + collapse chart

**File structure (`cloud/kyro_harness/`):** `ablation.py`, `narrator.py` (bare-Qwen arm), `report.py`. Tests: `test_ablation.py`, `test_report.py`.

---

### Task 10: `ablation.py` — arms 3 and 4 (deterministic)

**Files:** Create `cloud/kyro_harness/ablation.py`, `cloud/tests/test_ablation.py`

- [ ] **Step 1: Write the failing test** — `run_arm(arm, spine, cases)` returns scored rows. Arm 3 = `executor.run` as-is. Arm 4 = arm 3 + an explicit post-gate that forces ABSTAIN_STOP when `derive()` set `gcs_valid=False`/`any_critical_field_missing` (belt over the spine). Assert arm 4 abstains on the INVALID case and arm 3/4 agree on HM.
- [ ] **Step 2: Run → FAIL**
- [ ] **Step 3: Implement** the arm runners. Arm 4 **recomputes** `derive(dict(case.evidence))` inside `ablation.py` (derive is pure/idempotent — it copies via `dict()`) and forces `ABSTAIN_STOP` when `gcs_valid is False` or `any_critical_field_missing` — do NOT add a `return_env` flag to `executor.run` (keep its signature stable for parity).
- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** — `git commit -m "feat(harness): ablation arms 3 (spine) + 4 (spine+gate)"`

---

### Task 11: `narrator.py` + arm 1 (bare Qwen) — guarded

**Files:** Create `cloud/kyro_harness/narrator.py`, `cloud/tests/test_narrator.py`

**Note:** needs `llama-cpp-python` + a Qwen-4B-Q4 GGUF (`pip install llama-cpp-python`; model path via `KYRO_QWEN_GGUF` env). Tests **skip** when the model/lib is absent so the suite stays green on machines without it.

- [ ] **Step 1: Write the test** — `@pytest.mark.skipif(no model)`; assert `bare_qwen_action(prose)` returns one of the 4 actions (parse the model's output to a label). Add a non-skipped test for the output parser (`parse_action("...I would TRANSFER...") == 'STABILIZE_TRANSFER'`) so the parsing logic is always covered.
- [ ] **Step 2: Run → FAIL** (parser test), skip the model test
- [ ] **Step 3: Implement** a single-turn prompt ("You are a rural GMO with no CT. Given: <prose>. Choose exactly one: GUIDE/OBSERVE/STABILIZE_TRANSFER/ABSTAIN_STOP") + a strict output parser; wire into `ablation.run_arm(1, ...)`.
- [ ] **Step 4: Run → PASS** (parser), model test skipped/collected
- [ ] **Step 5: Commit** — `git commit -m "feat(harness): arm 1 bare-Qwen baseline (guarded by model availability)"`

---

### Task 12 (Chunk 3 close): `report.py` — the collapse chart

**Files:** Create `cloud/kyro_harness/report.py`, `cloud/tests/test_report.py`

- [ ] **Step 1: Write the test** — `render(scores_by_arm, out_dir)` writes `collapse.png` + `confusion.png` + `results.json`; assert the files exist and `results.json` records which arms ran (so a deferred arm 1 is **explicitly** marked absent, never silently). Use `matplotlib` Agg backend.
- [ ] **Step 2: Run → FAIL**
- [ ] **Step 3: Implement** a grouped bar chart (action-accuracy + harm-rate per arm 1/3/4) + the directional confusion matrix heatmap + a JSON dump; print a one-line provenance note ("arms run: …; provisional — answer key not mentor-signed; blind-encoding git-history proves inputs-before-targets ordering, not that the encoder never saw the answer-path").
- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** — `git commit -m "feat(harness): collapse chart + confusion matrix + results.json"`

---

### Task 13: end-to-end CLI

**Files:** Create `cloud/kyro_harness/__main__.py`

- [ ] **Step 1–5 (TDD):** `python -m kyro_harness --bundle cloud/bundles/edh-core-v0-mock.kyro --out cloud/out/` loads cases, runs available arms, scores, renders. Test asserts it exits 0 and produces `cloud/out/collapse.png`. Commit — `git commit -m "feat(harness): end-to-end CLI (python -m kyro_harness)"`

---

## Definition of done (MUST)

`cd cloud && .venv/Scripts/python -m pytest tests -v` green; `python -m kyro_harness` renders `collapse.png` showing arms 1/3/4 (or 3/4 + an explicit "arm 1 pending model" note); deterministic arm = 0 harm + full must-abstain recall; three-way parity test green. Every output stamped **provisional — answer key not mentor-signed**.

## Out of scope (SHOULD / later plans)
Real `edh-core-v1.kyro` (GraphRAG+Claude build), L2 retrieval (`retrieval.py`) for 🟡 coverage, the "ask"/incremental-field protocol (metric 2), the LLM-as-generalist arm (metric 5), multi-turn dialogue sim, E8 escalate, C7 portal.
