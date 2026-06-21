/**
 * E5 — Procedure state machine (the continuity primitive; the differentiator).
 *
 * Captures the encounter as `<evidence, hypotheses, trajectory>` in a DURABLE, event-sourced
 * journal. State is a pure fold over an append-only log, so a dropped call / app-kill / crash
 * "loses nothing": replay the log → exact state, then resume E3 from where it stopped.
 *
 * The design law holds: this is deterministic plumbing. The model never moves the encounter; E5
 * only records what the deterministic tree (E3) and gate (E4) did, and rehydrates it.
 *
 * Layers ON TOP of E3/E4 without modifying them:
 *   - journalingHost() wraps E3's GatherHost → persists each field the instant it's answered.
 *   - resumeSeed() folds the journal back into an Env → feeds E3's opts.seed (E3 skips known fields).
 *   - finalize() records the conclusion + escalation from E3's ExecResult + E4's Gated.
 *
 * Oracle: edge/e5/conformance.py (drop mid-encounter → resume → SAME leaf; handoff carries the abstain).
 */

import type { Env } from '../e3/conditions';
import type { ExecResult, GatherHost } from '../e3/spineExecutor';
import type { Gated, Badge } from '../e4/abstentionGate';

/** Injected time source — no Date.now() in the pure core (keeps fold + tests deterministic).
 *  On device: () => Date.now(). In tests: a monotonic counter. */
export type Clock = () => number;

export type Event =
  | { t: 'started'; ts: number; encounterId: string; lang: string }
  | { t: 'evidence'; ts: number; field: string; value: Env[string]; node: string | null } // captured LIVE — the continuity guarantee
  | { t: 'visited'; ts: number; node: string }
  | { t: 'concluded'; ts: number; action: string; leafId: string; badge: Badge; recommendation: string; citation: string | null }
  | { t: 'escalated'; ts: number; reason: string }
  | { t: 'note'; ts: number; text: string };

export interface EncounterState {
  encounterId: string;
  lang: string;
  startedAt: number;
  lastAt: number;
  evidence: Env;            // raw fields captured so far
  trajectory: string[];     // node path (the tree's reasoning trace)
  status: 'gathering' | 'concluded' | 'escalated';
  conclusion?: { action: string; leafId: string; badge: Badge; recommendation: string; citation: string | null };
  escalationReason?: string;
}

/** Durable append-only log. On device, back this with op-sqlite (a WAL-journaled table) or an
 *  fsync'd file so an append survives process death. The append IS the continuity contract. */
export interface EncounterJournal {
  append(e: Event): void;
  load(): Event[];
}

/** Reference in-memory journal (tests + the fold reference). The device impl persists to disk. */
export class InMemoryJournal implements EncounterJournal {
  private readonly events: Event[] = [];
  append(e: Event): void { this.events.push(e); }
  load(): Event[] { return this.events.slice(); }
}

/** Fold the log into current state. Pure; total; order-preserving. Replaying after a drop is exact. */
export function reduce(events: Event[]): EncounterState {
  const s: EncounterState = {
    encounterId: '', lang: 'en', startedAt: 0, lastAt: 0,
    evidence: {}, trajectory: [], status: 'gathering',
  };
  for (const e of events) {
    s.lastAt = Math.max(s.lastAt, e.ts);
    switch (e.t) {
      case 'started': s.encounterId = e.encounterId; s.lang = e.lang; s.startedAt = e.ts; break;
      case 'evidence': s.evidence[e.field] = e.value; break;
      case 'visited': if (s.trajectory[s.trajectory.length - 1] !== e.node) s.trajectory.push(e.node); break;
      case 'concluded':
        s.status = 'concluded';
        s.conclusion = { action: e.action, leafId: e.leafId, badge: e.badge, recommendation: e.recommendation, citation: e.citation };
        break;
      case 'escalated': s.status = 'escalated'; s.escalationReason = e.reason; break;
      case 'note': break;
    }
  }
  return s;
}

/** Wrap E3's GatherHost so every answered field is journaled the instant it's captured.
 *  This is what makes a mid-gather drop lossless — the field is already on durable storage. */
export function journalingHost(inner: GatherHost, journal: EncounterJournal, clock: Clock): GatherHost {
  return {
    async ask(field, node) {
      const value = await inner.ask(field, node);
      journal.append({ t: 'evidence', ts: clock(), field, value, node: node.id });
      return value;
    },
  };
}

/** Fold the journal's evidence back into an Env to seed E3 on resume (E3 skips already-known fields). */
export function resumeSeed(events: Event[]): Env {
  const seed: Env = {};
  for (const e of events) if (e.t === 'evidence') seed[e.field] = e.value;
  return seed;
}

/** Record the encounter outcome from E3's result + E4's gate. Journals the trajectory, the
 *  conclusion, and (when the gate demands it) the escalation that fires the handoff/E8. */
export function finalize(journal: EncounterJournal, result: ExecResult, gated: Gated, clock: Clock): void {
  for (const node of result.trace) journal.append({ t: 'visited', ts: clock(), node });
  journal.append({
    t: 'concluded', ts: clock(), action: result.action, leafId: result.leaf.id,
    badge: gated.badge, recommendation: result.recommendation, citation: result.citation,
  });
  if (gated.requiresExpertHandoff || gated.badge === 'RED')
    journal.append({ t: 'escalated', ts: clock(), reason: gated.label });
}
