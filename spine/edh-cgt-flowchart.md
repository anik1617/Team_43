# Kyro L1 CGT — Acute TBI / EDH decision tree (No-CT GMO setting)

Rendered from `spine/edh-cgt.sql` (`cgt_meta.version = 4`, graduated-assistance, mentor-signed VF-GRAD-1/2/3).
Every traversal decision is made by **code over a deterministic tree** — the model only phrases the leaf the tree reaches.

```mermaid
---
title: "Kyro L1 CGT · Acute TBI / EDH · v4 (deterministic, no-CT)"
config:
  flowchart:
    curve: basis
    nodeSpacing: 45
    rankSpacing: 55
---
flowchart TD

  %% ============ ① STRUCTURED EVIDENCE-GATHERING ============
  subgraph GATHER["① Structured evidence-gathering"]
    direction TB
    N00(["Start encounter · root N00"])
    N01["N01 · Mechanism + time since injury"]
    N1A["N1A · Anticoagulant / coagulopathy?"]
    N04["N04 · GCS — E / V / M"]
    N05["N05 · Pupils — size + reactivity (L &amp; R)"]
    N06["N06 · SBP · age · SpO₂ · glucose"]
    N07["N07 · Lucid interval?"]
    N08["N08 · Focal weakness · posturing · seizure"]
  end

  %% ============ SAFETY META-RULES (S1–S2) ============
  subgraph SAFE["Safety meta-rules"]
    direction TB
    N09{"N09 · Completeness gate (S1)"}
    N02["N02 · Re-ask missing field"]
    N03["N03 · Contradiction guard (S2)"]
  end

  %% ============ ② STABILIZATION CHAIN ============
  subgraph STAB["② Stabilization chain · secondary-injury prevention"]
    direction TB
    N10{"N10 · GCS severity?"}
    L10a["L10a · Severe — intubate (GCS ≤8)"]
    L10b["L10b · Moderate — airway + O₂"]
    L10c["L10c · Mild — NICE obs"]
    N11{"N11 · SBP vs BTF age target?"}
    L11a["L11a · Resuscitate — 0.9% saline"]
    L11b["L11b · Normotensive — maintain"]
    N12{"N12 · Oxygenation?"}
    L12a["L12a · Low SpO₂ — give O₂"]
    L12b["L12b · No oximeter — empiric O₂"]
    L12c["L12c · Adequate — maintain"]
    N13["N13 → L13 · Head-up ~30° (principle)"]
    N14{"N14 · Mannitol criteria?"}
    L14a["L14a · Give mannitol 0.25–1 g/kg"]
    L14b["L14b · Withhold — correct extracranial first"]
    L14c["L14c · No herniation — no mannitol"]
    N15["N15 → L15 · Phenytoin ≤7d + early TXA"]
    N16["N16 → L16 · No steroids / prophylactic HV / hypothermia"]
    N16B{"N16B · Anticoagulation?"}
    L16Ba["L16Ba · Reverse warfarin / DOAC / coagulopathy"]
    L16Bb["L16Bb · Antiplatelet — PATCH harm-trap"]
    N16H{"N16H · Active herniation?"}
    L16Ha["L16Ha · Brief mild HV (rescue only)"]
    L16Hb["L16Hb · Normoventilate"]
    N17["N17 → L17 · Begin NICE neuro-obs"]
  end

  %% ============ ③ DISPOSITION ============
  subgraph DISPO["③ Disposition · herniation &amp; operate-vs-transfer gate"]
    direction TB
    N20{"N20 · Herniation cluster?"}
    N21{"N21 · Operate-vs-transfer?"}
    N22{"N22 · Transfer feasible?"}
    N23{"N23 · Mild / stable observe gate?"}
    N30(["N30 · Deterioration monitor — loop"])
  end

  %% ============ TERMINAL OUTCOMES ============
  L08S(["L08S · Active seizure — benzo + re-eval airway<br/>STABILIZE_TRANSFER"])
  L21a(["L21a · Transfer now<br/>STABILIZE_TRANSFER"])
  L21b(["L21b · Operate-locally — hand off to live supervisor<br/>GUIDE"])
  L21c(["L21c · No supervisor — maximal medical, keep trying<br/>GUIDE"])
  L22(["L22 · Transfer regardless of imaging<br/>STABILIZE_TRANSFER"])
  L22m(["L22m · No transfer — grounded maximal medical<br/>STABILIZE_TRANSFER"])
  L23(["L23 · Admit + observe<br/>OBSERVE"])
  N40{{"N40 → L40 · Drill-site / craniostomy<br/>ABSTAIN_STOP (imaging wall)"}}
  N97{{"N97 → L97 · Bilateral fixed pupils — maximal medical<br/>ABSTAIN_STOP"}}
  N98(["N98 → L98 · Pediatric (age under 15) — peds stabilization<br/>STABILIZE_TRANSFER"])
  N99{{"N99 → L99 · Invalid / contradictory input<br/>ABSTAIN_STOP"}}

  %% ============ EDGES — gather + safety ============
  N00 --> N01
  N01 -->|"penetrating / blast / open / non-trauma"| N22
  N01 -->|"blunt"| N1A
  N1A --> N04
  N04 -->|"GCS out of range"| N99
  N04 -->|"recapture conflict"| N03
  N04 -->|"valid"| N05
  N05 -->|"pupil reactivity conflict"| N03
  N05 -->|"valid"| N06
  N06 -->|"age under 15"| N98
  N06 -->|"SBP out of range"| N99
  N06 -->|"SBP entries conflict"| N03
  N06 -->|"valid"| N07
  N07 --> N08
  N08 -->|"active / unresolved seizure"| L08S
  L08S --> N10
  N08 -->|"no active seizure"| N09
  N09 -->|"field missing"| N02
  N09 -->|"all present"| N10
  N02 -->|"supplied"| N09
  N03 -->|"revalidated"| N09

  %% ============ EDGES — stabilization chain ============
  N10 -->|"GCS ≤8"| L10a
  N10 -->|"GCS 9–12"| L10b
  N10 -->|"GCS ≥13"| L10c
  L10a --> N11
  L10b --> N11
  L10c --> N11
  N11 -->|"below target"| L11a
  N11 -->|"at target"| L11b
  L11a --> N12
  L11b --> N12
  N12 -->|"low SpO₂"| L12a
  N12 -->|"no oximeter"| L12b
  N12 -->|"adequate"| L12c
  L12a --> N13
  L12b --> N13
  L12c --> N13
  N13 --> N14
  N14 -->|"herniation · extracranial excluded"| L14a
  N14 -->|"herniation · extracranial present/unknown"| L14b
  N14 -->|"no herniation"| L14c
  L14a --> N15
  L14b --> N15
  L14c --> N15
  N15 --> N16
  N16 --> N16B
  N16B -->|"warfarin / DOAC / coagulopathy"| L16Ba
  N16B -->|"antiplatelet"| L16Bb
  N16B -->|"none / unknown"| N16H
  L16Ba --> N16H
  L16Bb --> N16H
  N16H -->|"herniation"| L16Ha
  N16H -->|"no herniation"| L16Hb
  L16Ha --> N17
  L16Hb --> N17
  N17 --> N20

  %% ============ EDGES — disposition ============
  N20 -->|"bilateral fixed · GCS ≤8"| N97
  N20 -->|"unilateral fixed pupil · GCS ≤8"| N21
  N20 -->|"concordant herniation cluster"| N21
  N20 -->|"severe / declining / lucid / posturing / anticoag — no full cluster"| N22
  N20 -->|"all high-risk negated"| N23
  N21 -->|"transfer feasible"| L21a
  N21 -->|"no transfer · teleconsult"| L21b
  N21 -->|"no transfer · no teleconsult"| L21c
  L21a --> N40
  L21b --> N40
  L21c --> N40
  N22 -->|"transfer feasible"| L22
  N22 -->|"no / unknown transfer"| L22m
  L22 --> N40
  L22m --> N40
  N23 --> L23
  L23 --> N30
  N97 --> N40
  N98 --> N40
  N30 -->|"implausible reversal"| N03
  N30 -->|"deterioration confirmed"| N20
  N30 -->|"stable · no red flag"| L23

  %% ============ STYLING (theme #2D7FF9) ============
  classDef start  fill:#1B5FD0,stroke:#0B3A8C,color:#ffffff,font-weight:bold;
  classDef gather fill:#2D7FF9,stroke:#1B5FD0,color:#ffffff;
  classDef decide fill:#1B5FD0,stroke:#0B3A8C,color:#ffffff,font-weight:bold;
  classDef step   fill:#DBEAFE,stroke:#2D7FF9,color:#0B3A8C;
  classDef safety fill:#EFF6FF,stroke:#2D7FF9,color:#0B3A8C,stroke-dasharray:4 3;
  classDef monitor fill:#0EA5E9,stroke:#0369A1,color:#ffffff,font-weight:bold;
  classDef stopT  fill:#DC2626,stroke:#991B1B,color:#ffffff,font-weight:bold;
  classDef xferT  fill:#F59E0B,stroke:#B45309,color:#1F2937,font-weight:bold;
  classDef guideT fill:#7C3AED,stroke:#5B21B6,color:#ffffff,font-weight:bold;
  classDef obsT   fill:#16A34A,stroke:#15803D,color:#ffffff,font-weight:bold;

  class N00 start;
  class N01,N1A,N04,N05,N06,N07,N08 gather;
  class N09,N10,N11,N12,N14,N16B,N16H,N20,N21,N22,N23 decide;
  class L10a,L10b,L10c,L11a,L11b,L12a,L12b,L12c,N13,L14a,L14b,L14c,N15,N16,L16Ba,L16Bb,L16Ha,L16Hb,N17 step;
  class N02,N03 safety;
  class N30 monitor;
  class N40,N97,N99 stopT;
  class L08S,L21a,L22,L22m,N98 xferT;
  class L21b,L21c guideT;
  class L23 obsT;

  style GATHER fill:#F5F9FF,stroke:#2D7FF9,color:#0B3A8C;
  style SAFE   fill:#F5F9FF,stroke:#2D7FF9,color:#0B3A8C;
  style STAB   fill:#F5F9FF,stroke:#2D7FF9,color:#0B3A8C;
  style DISPO  fill:#F5F9FF,stroke:#2D7FF9,color:#0B3A8C;
```

## Legend

| Colour | Meaning |
|---|---|
| `#2D7FF9` / `#1B5FD0` (blue) | Reasoning spine — evidence-gathering & decision nodes (the deterministic core) |
| light blue | Stabilization steps (secondary-injury prevention; the GREEN workhorse leaves) |
| dashed blue | Safety meta-rules (S1 completeness, S2 contradiction) |
| 🟢 green | `OBSERVE` terminal |
| 🟠 amber | `STABILIZE_TRANSFER` terminal (incl. graduated "maximal medical" + pediatric) |
| 🟣 purple | `GUIDE` (operate-locally) — **always funnels into N40 ABSTAIN_STOP** |
| 🔴 red | `ABSTAIN_STOP` terminal (drill-site, bilateral-fixed, invalid input) |
| 🔵 cyan | `N30` deterioration monitor (re-enters the herniation gate) |

## Key invariants visible in the tree

- **Every `GUIDE` path (L21b / L21c) funnels into `N40 → L40 ABSTAIN_STOP`.** Kyro never names a burr-hole / drill site, even under live neurosurgeon supervision — the imaging wall is non-negotiable.
- **No dead ends (graduated v4):** when transfer is infeasible the tree still gives grounded maximal-medical guidance (`L22m`, `N98/L98`) instead of a bare abstain.
- **Safety gates dominate:** the tree cannot reach disposition while a critical field is missing (S1 `N09`) or two entries contradict (S2 `N03`); out-of-range values route to `N99` rather than being guessed.
- **`N30` is the continuity loop:** deterioration with second-observer confirmation re-enters the herniation gate (`N20`); a stable recheck returns to observe (`L23`).
