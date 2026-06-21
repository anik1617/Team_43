/**
 * E4 — Graduated-assistance gate (🟢 Protocol / 🟡 Principles / 🔴 Stop).
 *
 * Takes E3's ExecResult (the leaf the DETERMINISTIC tree reached) + E2's retrieval coverage,
 * and emits the AUTHORITATIVE badge + gating verdict. The badge is a pure function of
 * STRUCTURE (leaf action + node id + path) and DATA COVERAGE — never of model confidence,
 * and never of the leaf's authored string prefix (those `[GREEN]/[YELLOW]/[RED]` tags are L3
 * rendering hints, sometimes authored for emphasis — see L21a `[RED / STABILIZE_TRANSFER]`,
 * which is structurally a safe 🟡 STABILIZE_TRANSFER). E4 is the authority; L3 renders what E4 says.
 *
 * DESIGN LAW (the inversion): code decides the badge. The model never moves it.
 * FAIL CLOSED: unknown coverage → 🟡 (never 🟢); an irreversible operate decision requires 🟢.
 *
 * Policy source: CLAUDE.md "graduated assistance" + docs/22-graduated-rescore.md (0/38 harm, 100% coverage).
 * Oracle: edge/e4/conformance.py (HM→🟢GUIDE+N40🔴, peds→🟡STABILIZE_TRANSFER, invalid→🔴).
 */

import type { ExecResult, CgtNode } from '../e3/spineExecutor';

export type Badge = 'GREEN' | 'YELLOW' | 'RED';

/** What E2 (GraphRAG local-search) reports about how well retrieval grounds this leaf. */
export interface Coverage {
  covered: boolean;                 // did retrieval ground the leaf above the grounding threshold?
  score?: number;                   // optional similarity/grounding score (diagnostic only)
  topTrustTier?: number | null;     // best trust_tier among supporting chunks (0 = highest)
  supportingCitations?: string[];   // source ids backing the recommendation
}

export interface DrillRider { badge: 'RED'; node: string; text: string; }

export interface Gated {
  badge: Badge;                     // the authoritative badge L3 MUST render
  label: string;                    // human label: "Protocol" / "Principles (extrapolated…)" / "Stop — …"
  action: string;                   // the leaf action (GUIDE/OBSERVE/STABILIZE_TRANSFER/ABSTAIN_STOP)
  cleared: boolean;                 // may the product surface this as an actionable recommendation?
  irreducibleStop: boolean;         // true for the N40/N99/N97 set — the only headline 🔴
  requiresExpertHandoff: boolean;   // fire the E5/E8 handoff?
  degradeToTransfer: boolean;       // GUIDE that couldn't reach 🟢 → surface stabilize+transfer, NOT operate-locally
  drillSiteAbstain: DrillRider | null; // present iff action===GUIDE: the mandatory 🔴 N40 rider
  authoredLabel: string | null;     // the leaf's raw `[...]` prefix from cgt_strings (audit only — NOT the badge authority)
  badgeMismatch: boolean;           // authored color ≠ computed badge (e.g. L21a/L22 `[RED / STABILIZE_TRANSFER]` urgency-vs-badge conflation)
  reasons: string[];                // auditable structural justification for the badge
}

/**
 * Extract the authored badge COLOR from a leaf's `[...]` string prefix, for audit cross-check ONLY.
 * The CGT conflates clinical urgency with the badge (L21a/L22 are `[RED / STABILIZE_TRANSFER]` but
 * structurally safe 🟡), so this NEVER overrides the structural badge — it only surfaces the divergence.
 */
export function parseAuthoredBadge(rawLeafString: string | null | undefined): { color: Badge | null; label: string | null } {
  const m = /^\s*\[([^\]]+)\]/.exec(rawLeafString ?? '');
  if (!m) return { color: null, label: null };
  const label = m[1];
  const color: Badge | null = /\bRED\b/.test(label) && !/\bYELLOW\b.*\bRED\b/.test(label) ? 'RED'  // pure RED prefix
    : /\bRED\b/.test(label) ? 'RED' : /\bYELLOW\b/.test(label) ? 'YELLOW' : /\bGREEN\b/.test(label) ? 'GREEN' : null;
  return { color, label };
}

// ---- the irreducible-stop set (the ONLY headline 🔴 — verified against the v4 SQL) ----
const DRILL_LOCALIZATION = new Set(['N40', 'L40']);      // imaging wall — where-to-cut, never derivable from non-CT signs
const INVALID_INPUT      = new Set(['N99', 'L99']);      // out-of-range / contradictory input (S3)
const BFDP_FUTILITY      = new Set(['N97', 'L97']);      // bilateral fixed pupils — futility-aware, not auto-futile
const IRREDUCIBLE = new Set([...DRILL_LOCALIZATION, ...INVALID_INPUT, ...BFDP_FUTILITY]);

// Canonical drill-site abstain text. Prefer the bundle's own L40 string (auditable); this is the fallback.
const DEFAULT_DRILL_ABSTAIN =
  'Drill-site localization is OUTSIDE scope and is never derivable from non-CT signs. Kyro provides ' +
  'ZERO operative or localization guidance under ANY input, including active supervision. Connect a ' +
  'neurosurgeon for the operative step.';

/** Per-call options. `rawLeafString` = the leaf's cgt_strings.recommendation (for the audit cross-check). */
export interface GateOpts { drillAbstainText?: string; rawLeafString?: string; }

/**
 * Gate one encounter result. Pure; deterministic; no I/O.
 * @param opts.drillAbstainText pass the bundle's L40 string when available (auditability); defaults otherwise.
 * @param opts.rawLeafString    pass the leaf's authored string so the gate can flag urgency-vs-badge conflations.
 */
export function gate(result: ExecResult, coverage: Coverage, opts: GateOpts = {}): Gated {
  const { drillAbstainText, rawLeafString } = opts;
  const leaf: CgtNode = result.leaf;
  const action = result.action;
  const reasons: string[] = [];

  // Audit cross-check: the authored `[...]` prefix is advisory ONLY; the structural badge below is authoritative.
  const authored = parseAuthoredBadge(rawLeafString);
  const audit = (computed: Badge) => {
    const mismatch = authored.color != null && authored.color !== computed;
    if (mismatch) reasons.push(`authored label "[${authored.label}]" (${authored.color}) ≠ computed ${computed} — rendering computed (structure wins)`);
    return { authoredLabel: authored.label, badgeMismatch: mismatch };
  };

  // 1 · IRREDUCIBLE 🔴 — the imaging wall, invalid input, and BFDP futility. Structure wins; coverage is irrelevant.
  if (IRREDUCIBLE.has(leaf.id) || action === 'ABSTAIN_STOP') {
    const kind = DRILL_LOCALIZATION.has(leaf.id) ? 'drill-site localization (imaging wall)'
               : INVALID_INPUT.has(leaf.id)      ? 'invalid / contradictory input'
               : BFDP_FUTILITY.has(leaf.id)      ? 'bilateral fixed pupils (defer operative decision)'
               : 'abstain';
    reasons.push(`irreducible stop: ${leaf.id} — ${kind}`);
    return {
      badge: 'RED', label: `Stop — ${kind}`, action, cleared: false,
      irreducibleStop: IRREDUCIBLE.has(leaf.id), requiresExpertHandoff: true,
      degradeToTransfer: false, drillSiteAbstain: null, ...audit('RED'), reasons,
    };
  }

  // 2 · ACTIONABLE leaf (GUIDE / OBSERVE / STABILIZE_TRANSFER) — badge from structure + coverage.
  const cited = leaf.source_citation != null && leaf.source_citation !== '';
  const sanctioned = leaf.action != null;       // reached a real terminal action (E3 never lands actionable via fallback)
  const tier = leaf.trust_tier ?? 2;            // absent tier → treat as lowest (fail-closed)
  const guidelineGrade = tier <= 1;             // tier 0/1 = cited guideline; tier 2 = labeled principle/convention (→ 🟡 by definition)
  if (!cited) reasons.push(`leaf ${leaf.id} carries no source_citation → cannot be 🟢`);
  if (!guidelineGrade) reasons.push(`leaf ${leaf.id} is trust_tier ${tier} (labeled principle, not cited guideline) → 🟡`);
  if (!coverage.covered) reasons.push('retrieval coverage not met → fail-closed to 🟡');

  const isGreen = sanctioned && cited && guidelineGrade && coverage.covered;
  const primary: Badge = isGreen ? 'GREEN' : 'YELLOW';
  reasons.push(isGreen
    ? `🟢 sanctioned cited leaf ${leaf.id} (trust_tier ${leaf.trust_tier ?? '?'}) + retrieval covered`
    : `🟡 grounded principles: ${cited ? 'cited' : 'uncited'}, coverage ${coverage.covered ? 'met' : 'absent'}`);

  // 3 · GUIDE is compound: the operate-locally DECISION is badged, but the drill step is ALWAYS the 🔴 N40 abstain.
  if (action === 'GUIDE') {
    const drill: DrillRider = { badge: 'RED', node: 'N40', text: drillAbstainText ?? DEFAULT_DRILL_ABSTAIN };
    // Irreversible call (operate-locally) requires 🟢. If it couldn't reach 🟢, do NOT clear it — degrade to transfer.
    const degradeToTransfer = primary !== 'GREEN';
    if (degradeToTransfer) reasons.push('operate-locally decision requires 🟢 but coverage absent → degrade to stabilize+transfer');
    return {
      badge: primary,
      label: primary === 'GREEN' ? 'Protocol — operate-locally decision (drill step deferred)'
                                  : 'Principles — operate context, drill step deferred',
      action, cleared: !degradeToTransfer, irreducibleStop: false,
      requiresExpertHandoff: true, degradeToTransfer, drillSiteAbstain: drill, ...audit(primary), reasons,
    };
  }

  // 4 · OBSERVE / STABILIZE_TRANSFER — surfaced; STABILIZE_TRANSFER carries handoff/transfer.
  return {
    badge: primary,
    label: primary === 'GREEN' ? 'Protocol' : 'Principles — extrapolated from related guidance, not validated for this exact case',
    action, cleared: true, irreducibleStop: false,
    requiresExpertHandoff: action === 'STABILIZE_TRANSFER',
    degradeToTransfer: false, drillSiteAbstain: null, ...audit(primary), reasons,
  };
}
