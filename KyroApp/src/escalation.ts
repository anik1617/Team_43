/**
 * E8 — Escalation transport (the app side).
 *
 * When Kyro abstains on the irreducible step (drill-site / localization) or the operator chooses
 * to bring in a human, this module hands the PRE-BRIEFED encounter state to the cloud relay
 * (Aniket's /escalate + Twilio → WhatsApp/SMS to a neurosurgeon). Kyro is offline for the DECISION;
 * this is the one online moment — and it degrades gracefully when there is no signal:
 *   - escalate(brief): POST a PHI-MINIMIZED SBAR payload; if offline/failed, QUEUE it and retry
 *     on reconnect with backoff (connectivity probed by a HEAD/GET to the endpoint — no NetInfo dep).
 *   - openExpertCall(): open the dialer / wa.me so the operator can reach the expert directly.
 *
 * NO new native deps: global fetch + react-native Linking only. The queue is in-memory (async-storage
 * is not installed) — fine for the demo; a dropped escalation survives until the next reconnect within
 * the session. Nothing here throws to the UI: every network call is wrapped, status drives the surface.
 */
import { Linking } from 'react-native';
import type { HandoffBrief } from '../engine/e5/handoff';

// ── config (Aniket swaps these for the real relay + expert contact) ──
export const ESCALATE_ENDPOINT = 'https://kyro-relay.example/escalate';
export const EXPERT_CONTACT = 'tel:+10000000000'; // e.g. 'tel:+264...' or 'https://wa.me/264...'

const POST_TIMEOUT_MS = 8000;
const PROBE_TIMEOUT_MS = 4000;
const BACKOFF_MS = [2000, 5000, 15000, 30000, 60000]; // capped; index clamps to last
const MAX_QUEUE = 25; // bound memory; drop oldest beyond this

export type EscalationStatus = 'idle' | 'queued' | 'sending' | 'sent' | 'failed';

// ── PHI-minimized payload: only what E5 already surfaced into the brief ──
interface EscalationPayload {
  v: 1;
  encounterId: string;
  badge: HandoffBrief['badge'];
  sbar: HandoffBrief['sbar'];
  hypotheses: string[];
  abstaining: string | null;
  resumeToken: string;
  generatedAt: number;
}

interface QueueItem {
  payload: EscalationPayload;
  attempts: number;
}

// ── module state ──
let status: EscalationStatus = 'idle';
const queue: QueueItem[] = [];
const subscribers = new Set<(s: EscalationStatus) => void>();
let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

// ── status + subscription ──
export function escalationStatus(): EscalationStatus {
  return status;
}

function setStatus(s: EscalationStatus): void {
  if (s === status) return;
  status = s;
  for (const cb of subscribers) {
    try { cb(s); } catch (e) { console.log('[Kyro] escalation subscriber threw:', String(e)); }
  }
}

/** Subscribe to status transitions. Returns an unsubscribe fn. Fires immediately with current status. */
export function onEscalationStatus(cb: (s: EscalationStatus) => void): () => void {
  subscribers.add(cb);
  try { cb(status); } catch (e) { console.log('[Kyro] escalation subscriber threw:', String(e)); }
  return () => { subscribers.delete(cb); };
}

// ── payload build ──
function toPayload(brief: HandoffBrief): EscalationPayload {
  return {
    v: 1,
    encounterId: brief.encounterId,
    badge: brief.badge,
    sbar: brief.sbar,
    hypotheses: brief.hypotheses.slice(),
    abstaining: brief.abstaining,
    resumeToken: brief.resumeToken,
    generatedAt: brief.generatedAt,
  };
}

// ── network ──
function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(id) };
}

/** POST one payload. Resolves true on a 2xx response, false on any failure (never throws). */
async function postPayload(payload: EscalationPayload): Promise<boolean> {
  const t = withTimeout(POST_TIMEOUT_MS);
  try {
    const res = await fetch(ESCALATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: t.signal,
    });
    return res.ok;
  } catch (e) {
    console.log('[Kyro] escalation POST failed:', String(e));
    return false;
  } finally {
    t.cancel();
  }
}

/** Lightweight reachability probe to the relay — no NetInfo. true if the endpoint answers at all. */
async function isReachable(): Promise<boolean> {
  const t = withTimeout(PROBE_TIMEOUT_MS);
  try {
    // HEAD is cheapest; any response (even 4xx) proves connectivity to the relay.
    const res = await fetch(ESCALATE_ENDPOINT, { method: 'HEAD', signal: t.signal });
    return !!res;
  } catch {
    return false;
  } finally {
    t.cancel();
  }
}

// ── queue ──
function enqueue(payload: EscalationPayload): void {
  queue.push({ payload, attempts: 0 });
  while (queue.length > MAX_QUEUE) queue.shift(); // drop oldest under pressure
  setStatus('queued');
  scheduleFlush(0);
}

function backoffFor(attempts: number): number {
  return BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
}

function scheduleFlush(delayMs: number): void {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  retryTimer = setTimeout(() => { retryTimer = null; void flushQueue(); }, delayMs);
}

/**
 * Drain the queue, oldest-first, with per-item backoff. Re-entrancy guarded. On a failed item we
 * stop the pass and re-arm a backoff timer (queue order preserved, set status 'queued'). Idempotent
 * to call — safe to invoke on reconnect, app-foreground, or after enqueue.
 */
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (!queue.length) { if (status !== 'sent') setStatus('idle'); return; }
  flushing = true;
  try {
    // If nothing is reachable, don't burn attempts — re-arm and bail.
    if (!(await isReachable())) {
      setStatus('queued');
      scheduleFlush(backoffFor(queue[0]?.attempts ?? 0));
      return;
    }
    while (queue.length) {
      const item = queue[0];
      setStatus('sending');
      const ok = await postPayload(item.payload);
      if (ok) {
        queue.shift();
      } else {
        item.attempts += 1;
        setStatus(queue.length > 1 ? 'queued' : 'failed');
        scheduleFlush(backoffFor(item.attempts));
        return;
      }
    }
    setStatus('sent');
  } finally {
    flushing = false;
  }
}

// ── public API ──

/**
 * Queue + attempt to send the pre-briefed handoff to the relay. Tries an immediate POST; on failure
 * or no connectivity it enqueues and retries on reconnect (backoff probe loop). Never throws to the UI.
 */
export async function escalate(brief: HandoffBrief): Promise<void> {
  const payload = toPayload(brief);
  try {
    setStatus('sending');
    const ok = await postPayload(payload);
    if (ok) {
      // Flush any older queued items behind this one before declaring success.
      if (queue.length) { queue.push({ payload, attempts: 0 }); await flushQueue(); return; }
      setStatus('sent');
      return;
    }
    enqueue(payload); // 'queued' + schedules retry
  } catch (e) {
    console.log('[Kyro] escalate unexpected:', String(e));
    enqueue(payload);
  }
}

/**
 * Manually retry the queue (e.g. wired to a "signal restored" / app-foreground event). Safe no-op
 * when the queue is empty. Exposed so the app can flush on reconnect without re-importing internals.
 */
export async function retryEscalations(): Promise<void> {
  await flushQueue();
}

/** Number of escalations still waiting to send (UI badge / debug). */
export function pendingEscalations(): number {
  return queue.length;
}

/**
 * Open the dialer / WhatsApp so the operator reaches the expert directly. Guards with canOpenURL and
 * degrades gracefully (logs + returns) if the URL can't be handled. Never throws to the UI.
 */
export async function openExpertCall(): Promise<void> {
  try {
    const can = await Linking.canOpenURL(EXPERT_CONTACT);
    if (!can) {
      console.log('[Kyro] expert contact not openable:', EXPERT_CONTACT);
      return;
    }
    await Linking.openURL(EXPERT_CONTACT);
  } catch (e) {
    console.log('[Kyro] openExpertCall failed:', String(e));
  }
}
