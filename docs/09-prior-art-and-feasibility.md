*Output of the `kyro-prior-art-deep-read` multi-agent workflow (2026-06-20): 24 prior-art sources deep-read by 29 agents, synthesized through architecture / benchmark / feasibility / adversarial-skeptic lenses into a merged verdict. **This brief drove the 2026-06-20 safety-model inversion; `CLAUDE.md` + docs `04`/`05`/`06`/`07`/`08` are now fully reconciled to it** (see §7 for the resolved changelog). Retained as the feasibility / rationale trail.*

# 09 — Prior Art & Feasibility: Is Kyro Doable?

**Verdict: YES — with one non-negotiable correction (now APPLIED).** The system is buildable by 2 devs in a short window, and the pitch is winnable in a room of AI-skeptic neurosurgeons — *but only because the team inverted the safety model that earlier docs (05, 08) described.* The corpus was unanimous on the fix; it is also unanimous that the earlier "the 4B model may reason/extrapolate, gated by its own confidence" framing would have been torn apart in Q&A. **That framing has been removed repo-wide** (see §7).

This brief is written so the repo owner can act on it directly. (Ownership: **Gowrish now owns the whole repo** — see [08-build-plan-and-task-split.md](08-build-plan-and-task-split.md) §2.)

---

## 1. The one-paragraph answer

Every Kyro layer has a published, benchmarked precedent, most with forkable open-source code. "Small model + symbolic structure beats a big standalone model" is validated across 5+ independent papers. Offline GraphRAG clinical QA is peer-reviewed and proven. A 160-node graph demonstrably suffices. The genuine whitespace — a quantized SLM doing this on a cheap Android, offline — is exactly what nobody has shipped (one published team *failed* to get a local 7B running), so it is yours to own. The feasibility risk is **engineering-shaped, not research-shaped**, which is absorbable. The catch: a 4B model is **not a reasoner** (a fine-tuned 8B scored 42% on USMLE; there is no 4B datapoint anywhere), and model confidence is **near-random** at knowing when it is wrong (AUROC ~0.5). So the deterministic guideline tree must do the reasoning and own the abstention; the model is a *mouth, not a brain*. Build it that way and Kyro is real. Ship the "competent reasoner + confidence gate" in docs 05/08 and it is the hallucinating chatbot the judges fear.

---

## 2. The confirmed 3-layer architecture

**L1 — Reasoning spine (the controller; the credibility core).**
A hand-authored, **deterministic** clinical-guidance tree in MedDM's IEET format (one EDH/head-trauma triage tree; each node carries a Peshawar/BTF citation), executed by a CDM-style loop where **code decides traversal** and the LLM only classifies the operator's answer and phrases the next question. The spine sits in **veto position** over the model — the neuro-symbolic survey shows advisory KGs "fail silently" and that accuracy *and* safety rise monotonically with symbolic authority (+9% → +40%). Plus the ClinicalAgents working-memory object `<evidence, hypotheses, trajectory>` = the **procedure state machine** = the dropped-call continuity primitive.

**L2 — Knowledge (provenance).**
A small curated, source-cited GraphRAG graph (160-node-class is proven sufficient), built **offline on the supercomputer**, shipped as a **signed SQLite bundle** (the team's `edh-core-v{N}.kyro` contract is sound). Use MedGraphRAG's Triple-Graph idea (entity/source/definition) for citations and MedRAG's discriminability (1/degree-centrality) to order questions with **no LLM call**. The team's stack (Microsoft GraphRAG + BGE-M3 + sqlite-vec + op-sqlite on React Native) is viable; the **#1 project-killer they correctly flagged is embedder mismatch** — pin BGE-M3 1024-d byte-identical on both planes.

**L3 — Language I/O only (a mouth).**
Qwen-4B-Q4 via llama.rn + whisper.cpp + Piper/OS-TTS, **English first** (Urdu = roadmap; Urdu on-device ASR is itself unsolved). The model does four narrow jobs: clean ASR text, classify answers at each node, phrase the next question, synthesize the final cited recommendation. Nothing load-bearing on the critical path.

**Safety triad — gated NOT on model confidence:**
1. The deterministic tree reaching a guideline-sanctioned leaf.
2. Hard out-of-bounds rules (missing required inputs, contradictory vitals, out-of-protocol values, any out-of-tree input).
3. "Cannot terminate while critical evidence is missing; mark unresolved if unavailable" (ClinicalAgents).
Per-token entropy from the local model is a *secondary, redundant* flag only.

---

## 3. Components to replicate / fork / use

| Component | Source | Action | Integration note |
|---|---|---|---|
| **IEET tree + CDM loop** | MedDM (arXiv:2312.02441, no code) | **REPLICATE** | One EDH tree, if/elif/Action JSON+citations. The deterministic L1. Days of work, zero ML risk, max judge credibility. |
| **5-action trajectory + GRPO/format-gate training** | DiagRL — github.com/MAGIC-AI4Med/Deep-DxSearch (**Apache-2.0**) | **FORK** | verl harness for the QLoRA fine-tune; format-gate guarantees parseable traces; DiagRL-Corpus (16k profiles) as KB seed. Drop the 27M-doc corpus. |
| **Triple Graph + U-Retrieval** | MedGraphRAG — github.com/MedicineToken/Medical-Graph-RAG (**MIT**) | **FORK + MODIFY** | Source-cited provenance (biggest accuracy driver). Port OpenAI+Neo4j → on-device + embedded store; or apply the *idea* on top of the team's Microsoft-GraphRAG stack. |
| **Triage eval harness** | medLLMbenchmark — github.com/BIMSBbioinfo/medLLMbenchmark (**MIT**) | **FORK** | Exact-match + within-1-ESI + MIMIC extraction, pre-built. Swap Claude→Qwen; add an EDH slice. |
| **Discriminability question-picker** | MedRAG-KG — github.com/SNOWTEAM2023/MedRAG (verify license) | **USE** | 1/degree-centrality picks the next question with no LLM call. Keep the graph pruned (small models knowledge-conflict on over-granular KGs). |
| **Confidence-scored KG construction** | AMG-RAG — github.com/MrRezaeiUofT/AMG-RAG (verify) | **USE** | 1–10 confidence per edge; decoupled build-vs-QA = offline. Armor: 8B+KG beats Meditron-70B. |
| **Working-memory + backtrack rule** | ClinicalAgents (KDD'26, CC-BY; empty repo) | **REPLICATE** | `<E,H,τ>` = the state machine; "can't terminate while critical evidence missing" = the abstain gate. **Drop the MCTS.** |
| **3-pass prompt + rule safety net + % agreement metric** | Karamanlioglu (Appl. Sci. 2025, CC-BY) | **USE** | Output stage + hard herniation-escalate the LLM can't override + the 75.8% accepted/minor/rejected headline. Heed 8B=42% USMLE. |
| **Multi-turn harness + History-taking metric + Director ablation** | MedKGEval (2025, code on request) | **REPLICATE** | Info-gathering number + the spine-ablation collapse chart. |
| **"Confidence is near-random" argument** | UQ survey (arXiv:2602.05073, 2026) | **USE AS ARGUMENT** | The armor for "how does it know when it's wrong?" Gate on guideline boundaries, not confidence. |
| **Self-play data/eval engine** | AMIE (closed) | **REPLICATE METHOD** | Generate synthetic TBI dialogues + the 0-interventions/100 safety-demo design. Don't claim AMIE's 90/75/56. |
| **Tabular prognosis** | Adil/Duke (World Neurosurgery 2022) | **REPLICATE** | Kilobyte elastic-net over 13 GMO-collectable variables; "simple noninferior to deep learning" armor. Decision support, never a verdict. |

---

## 4. The benchmark playbook (the win condition)

**Governing rule: never a bare number — every metric is a delta against a named baseline.** Six headline numbers:

1. **Triage accuracy (operate-vs-transfer)** — ≥80% exact / ≥90% within-safe-band, with a **directional confusion matrix** (errors cluster on the safe side). Bar: Gaber frontier-cloud ceiling ~64–66% exact / ~82% within-1.
2. **Info-gathering completeness** — MedKGEval History-taking 0–2, ≥0.90 fields elicited. Cite MedRAG 52.8%→66.0%.
3. **Guideline-concordance** — content concordance AND **citation faithfulness** (catches the correct-but-ungrounded failure), ≥90% on critical-path steps.
4. **Abstention accuracy (the safety number nobody else reports)** — must-abstain recall ≥95% on a labeled out-of-bounds set (with an explicit out-of-scope control), false-abstention rate reported honestly, AUROC framed against the UQ ~0.5 baseline.
5. **vs unaided generalist** — +20 to +25 pts. Anchor: Deep-DxSearch 45.6%→69.1%.
6. **vs generic LLM (the ablation ladder: bare Qwen → +graph → +spine → +gate)** — anchor the symbolic-authority gradient +9/+16/+26/+40%.

**Eval set, three tiers:**
- **Tier A** — 30–50 hand-authored, mentor-signed EDH vignettes (HM's case = #1 + live demo); ~20 operate / ~10 transfer / ~10–20 must-abstain. *This is validation pillar #1.*
- **Tier B** — AMIE-style self-play synthetic dialogues (volume + fine-tune fuel). **Reported only as engineering regression metrics**, never the headline.
- **Tier C** — MIMIC-IV head-trauma slice via the Gaber harness ("real data"). **Start PhysioNet/CITI credentialing today** (days of lead time).

**Harness:** MedKGEval 3-agent multi-turn (patient sim from the same L2 graph + system-under-test + LLM-judge validated vs mentor by MAE/κ), run on the supercomputer, not the phone. **The single most persuasive artifact is the spine-ablation collapse chart.** Reporting discipline (PROBAST armor): report calibration + abstention rates alongside accuracy; name Tier A vs Tier C as two distributions; **replace BLEU/Jaccard/BERTScore** with concordance/triage/completeness/abstention.

---

## 5. Offline reality (what actually runs on a cheap phone)

**Runs offline:** the deterministic IEET tree (kilobytes, code-traversed, no model needed); a small GraphRAG bundle (low-MB signed SQLite); whisper.cpp (~75–150 MB) + Piper (~50–100 MB); the elastic-net prognosis (kilobytes). **Tight-but-possible:** Qwen-4B-Q4 (~2.7 GB) + BGE-M3 (~0.4 GB) + whisper-small (~0.5 GB) ≈ 3.5–4.5 GB live — fine on 8 GB, drop to 2B on a true 4 GB device (the E0 spike decides this on day 1). **Does NOT run offline:** multi-round/multi-agent inference — MA-RAG is 70.7s/question on a *server GPU*; on a 4B-Q4 phone that's minutes/case. **Ban multi-agent / MCTS / self-consistency on the critical path;** reserve at most N=2–3 sampling for the single operate-vs-transfer checkpoint. Latency, not RAM, is the real risk and is currently **faith-based** — no source measured this stack on the target phone (one published team failed the local-model port entirely). Heavy graph construction runs once on the supercomputer and ships as data; the phone only retrieves.

---

## 6. Biggest risks + mitigations

1. **(Would be fatal if ignored) The current docs gate safety on model confidence.** → Invert: deterministic tree in veto position, model as I/O only, abstention on guideline boundaries + hard rules, not confidence. Cite the UQ survey *against yourselves*. This turns the deepest hole into your best Q&A answer.
2. **4B-Q4 quality/faithfulness unmeasured** (all wins are 7–8B; 8B=42% USMLE; faithfulness leaks). → Keep the model off the reasoning path; measure on the real phone at E0; 2B fallback; benchmark the *shipped Q4 GGUF*, not bf16.
3. **Emergency latency unverified, live-demo risk.** → Deterministic spine + short constrained outputs (1–3s realistic); ban multi-agent on the critical path; rehearse on the actual phone.
4. **Rigorous validation unreachable in days** (N~30, single-rater = PROBAST high-RoB the judges will recognize). → Name the limitation first; lead with mentor-signed concordance + abstention demo + spine-ablation; MIMIC as concordance, not an RCT.
5. **"What does the LLM add over a laminated card?"** (elastic-net noninferiority). → Don't claim diagnostic superiority. Lead with continuity (state machine) + evidence-gathering discipline + hands-free voice + auditable citations.
6. **Integration surface for 2 devs in days** (a published team failed the on-device port). → Hold the vertical slice; cut Urdu, fine-tuning, multi-agent, real WhatsApp to roadmap; E0 de-risks the killer first.
7. **Sycophantic mis-parsing corrupts the spine's input** (garbage-in laundered through a deterministic-looking spine looks *more* authoritative). → Read-back confirmation of every critical field; contradictory vitals → re-ask, not advance.

---

## 7. What this brief changed — APPLIED 2026-06-20 (resolved changelog, not a to-do list)

Every item below was applied repo-wide in the 2026-06-20 consolidation:

- ✅ **Inverted the safety model** in `05` + `08` (+ `CLAUDE.md`/`04`/`06`/`07`): the deterministic tree reasons; the model is I/O only; abstention is gated on guideline boundaries + hard out-of-bounds rules + missing-evidence — **not** confidence.
- ✅ **Repositioned** as a "Verifiable Workflow Automator + Grounded Synthesizer"; the free-reasoning "Latent Space Clinician" is explicitly disclaimed.
- ✅ **Spine-ablation collapse chart** is now a first-class validation artifact (`08` §8, `04`).
- ✅ **Abstention AUROC vs the ~0.5 baseline** added; the "how does it know when it's wrong?" Q&A answer is pre-written in `04`.
- ✅ **English-only v1** across `05`/`06`/`07`/`08`; Urdu is roadmap.
- ✅ **Pitch hero = continuity + evidence-gathering discipline + auditable citations** (not decision-quality); the "synthesizes answers" overreach removed.
- ✅ **MedDM IEET + CDM** adopted as the explicit L1 spine spec in `05`/`08`.
- ✅ **Stack reconciled** repo-wide: React Native / llama.rn / Qwen-4B-Q4 / Microsoft GraphRAG (no Flutter, no Qwen3.5-2B, no LightRAG).
- ✅ **Hard rule** "no multi-agent / no MCTS / no self-consistency on the critical path" written into `08`.

**Still genuinely OPEN (real to-dos):**

- ⏳ **Start PhysioNet + CITI credentialing now** — the MIMIC-IV Tier-C slice has days of lead time.
- ⏳ **Verify licenses** before depending on them: MedRAG-KG, AMG-RAG KG release, MA-RAG.
- ⏳ **Run the E0 spike** — Qwen-4B-Q4 tokens/sec + peak RAM on the real phone; confirm op-sqlite loads sqlite-vec on Android.

---

## 8. Open questions

- Real tokens/sec + peak RAM for Qwen-4B-Q4 (and a 2B fallback) on the target phone? (E0 decides everything.)
- Does the small-model-rescue effect hold at 4B-Q4 (no datapoint below 7–8B exists)?
- Can a mentor neurosurgeon be secured for *this* sprint to sign the tree + vignette ground truth? (Their time is the bottleneck.)
- Will PhysioNet/CITI clear in time for the MIMIC slice?
- Verify licenses before depending: MedRAG-KG, AMG-RAG KG release, MA-RAG.
- Does op-sqlite reliably load sqlite-vec on Android? (E0.)
- Does read-back confirmation keep encounter length acceptable, or confirm-only-on-contradiction?
- Is the dropped-call → handoff state machine buildable alongside everything else, or must it be the priority other features yield to? (It is the true differentiator.)

---

## Sources

Key prior-art sources synthesized:
- MedDM — arXiv:2312.02441
- Deep-DxSearch / DiagRL — github.com/MAGIC-AI4Med/Deep-DxSearch (Apache-2.0); DiagRL-Corpus on HuggingFace
- MedGraphRAG — github.com/MedicineToken/Medical-Graph-RAG (MIT); arXiv:2408.04187
- medLLMbenchmark — github.com/BIMSBbioinfo/medLLMbenchmark (MIT); Gaber et al., npj Digital Medicine 2025; MIMIC-IV-Ext PhysioNet DOI 10.13026/stnm-qx35
- MedRAG (KG-elicited) — github.com/SNOWTEAM2023/MedRAG; arXiv:2502.04413
- AMG-RAG — github.com/MrRezaeiUofT/AMG-RAG; arXiv:2502.13010
- MA-RAG — github.com/NJU-RL/MA-RAG; arXiv:2603.03292 (ICML 2026)
- ClinicalAgents — KDD 2026 (arXiv:2603.26182)
- Karamanlioglu et al. — Appl. Sci. 2025, 15, 8412 (CC-BY)
- MedKGEval — Yu et al., 2025
- UQ in LLM Agents — arXiv:2602.05073 (2026); tau2-uq-artifacts on HuggingFace (MIT)
- Saidu & Wall — Electronics 2026, 15(3):555; DOI 10.3390/electronics15030555
- AMIE — Nature 2025 (arXiv:2401.05654); real-clinic feasibility arXiv:2603.08448 (2026); NCT06911398
- Neuro-symbolic review (Gorenshtein et al.) — 2026 (CC-BY)
- GraphRAG-GDM PoC (Evangelista et al.) — JMIR Diabetes 2026; diabetes.jmir.org/2026/1/e76454
- WD3QNE TBI vital-signs RL — JMIR 2025; doi:10.2196/63847
- LMIC-TBI prognosis (Adil et al.) — World Neurosurgery 2022;164:e8–e16
- Reinventing Clinical Dialogue survey — arXiv:2512.01453 (2025)
- Han & Choi ED multi-agent KTAS — arXiv:2408.07531 (2024)
- Resource indexes: yczhou001/Awesome-Medical-LLM-Agent; xqz614/Awesome-Agentic-Clinical-Dialogue
