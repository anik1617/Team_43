/**
 * E8 — Escalation transport (the app side), wired to Aniket's real cloud relay.
 *
 * When Kyro abstains on the irreducible step (drill-site / localization) or the operator brings in a
 * human, this hands the PRE-BRIEFED encounter state to the cloud: POST {CLOUD_BASE}/escalate. The
 * cloud DETERMINISTICALLY matches an opted-in specialist and relays the briefing over Twilio WhatsApp,
 * returning only WHO was contacted (specialty / on-call) — never the surgeon's number (PII stays cloud
 * side). Kyro is offline for the DECISION; this is the one online moment, and it degrades gracefully:
 *   - escalate(brief): POST a PHI-minimized SBAR briefing; if offline/failed, QUEUE + retry on
 *     reconnect with backoff (connectivity probed via /healthz — no NetInfo dep).
 *   - openExpertCall(): open the dialer / wa.me fallback so the operator can reach a hotline directly.
 *
 * NO new native deps: global fetch + react-native Linking. Queue is in-memory (async-storage absent) —
 * fine for the demo. Nothing here throws to the UI: every network call is wrapped; status drives the surface.
 */
import { Linking } from 'react-native';
import type { HandoffBrief } from '../engine/e5/handoff';
import {
  ESCALATE_URL, KYRO_ESCALATE_TOKEN, ESCALATE_REGION, ESCALATE_CALLBACK, EXPERT_CONTACT, checkCloudHealth,
} from './cloud';

const POST_TIMEOUT_MS = 8000;
const BACKOFF_MS = [2000, 5000, 15000, 30000, 60000]; // capped; index clamps to last
const MAX_QUEUE = 25; // bound memory; drop oldest beyond this

export type EscalationStatus = 'idle' | 'queued' | 'sending' | 'sent' | 'failed';

/** What the cloud /escalate relay tells us back (NO surgeon PII — only who/how it was handled). */
export interface EscalationResult {
  ticket: string;
  matched: boolean;
  channel: string;                                  // 'whatsapp' | 'staged' | ...
  delivered: boolean;
  recommended: { specialty: string; on_call: boolean } | null;
}

// The exact POST /escalate body the cloud expects (cloud/service/escalate/routes.py · Escalation).
interface EscalateBody {
  case_summary: string;        // ≤4000 — the pre-briefed SBAR handoff
  needed_specialty: string;
  reached_leaf?: string;       // ≤120
  region?: string;
  callback?: string;
}

interface QueueItem { body: EscalateBody; attempts: number; }

// ── module state ──
let status: EscalationStatus = 'idle';
let lastResult: EscalationResult | null = null;
const queue: QueueItem[] = [];
const subscribers = new Set<(s: EscalationStatus) => void>();
let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

// ── status + subscription ──
export function escalationStatus(): EscalationStatus { return status; }
export function lastEscalationResult(): EscalationResult | null { return lastResult; }

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

// ── payload build: HandoffBrief (E5) → the cloud /escalate contract ──
function toBody(brief: HandoffBrief): EscalateBody {
  const s = brief.sbar;
  const case_summary = [
    `S: ${s.situation}`,
    `B: ${s.background}`,
    `A: ${s.assessment}`,
    s.recommendation ? `R: ${s.recommendation}` : '',
    brief.hypotheses.length ? `Active concerns: ${brief.hypotheses.join('; ')}` : '',
    brief.abstaining ? `Kyro NOT doing: ${brief.abstaining}` : '',
  ].filter(Boolean).join('\n').slice(0, 3900); // stay under the 4000 cap
  const body: EscalateBody = { case_summary, needed_specialty: 'neurosurgery' };
  if (brief.abstaining) body.reached_leaf = brief.abstaining.replace(/\s+/g, ' ').slice(0, 110);
  if (ESCALATE_REGION) body.region = ESCALATE_REGION;
  if (ESCALATE_CALLBACK) body.callback = ESCALATE_CALLBACK;
  return body;
}

// ── network ──
function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(id) };
}

/** POST one briefing. Sets lastResult + returns true on a 2xx, false on any failure (never throws). */
async function postBody(body: EscalateBody): Promise<boolean> {
  const t = withTimeout(POST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (KYRO_ESCALATE_TOKEN) headers['X-Kyro-Token'] = KYRO_ESCALATE_TOKEN;
    const res = await fetch(ESCALATE_URL, {
      method: 'POST', headers, body: JSON.stringify(body), signal: t.signal,
    });
    if (!res.ok) return false;
    const j: any = await res.json().catch(() => null);
    if (j && typeof j.ticket === 'string') {
      lastResult = {
        ticket: j.ticket, matched: !!j.matched, channel: String(j.channel ?? 'unknown'),
        delivered: !!j.delivered, recommended: j.recommended ?? null,
      };
    }
    return true;
  } catch (e) {
    console.log('[Kyro] escalation POST failed:', String(e));
    return false;
  } finally {
    t.cancel();
  }
}

// ── queue ──
function enqueue(body: EscalateBody): void {
  queue.push({ body, attempts: 0 });
  while (queue.length > MAX_QUEUE) queue.shift();   // drop oldest under pressure
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
 * Drain the queue, oldest-first, with per-item backoff. Re-entrancy guarded. On a failed item we stop
 * the pass and re-arm a backoff timer (queue order preserved). Idempotent — safe to call on reconnect /
 * app-foreground / after enqueue.
 */
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (!queue.length) { if (status !== 'sent') setStatus('idle'); return; }
  flushing = true;
  try {
    if (!(await checkCloudHealth())) {              // nothing reachable — don't burn attempts
      setStatus('queued');
      scheduleFlush(backoffFor(queue[0]?.attempts ?? 0));
      return;
    }
    while (queue.length) {
      const item = queue[0];
      setStatus('sending');
      const ok = await postBody(item.body);
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
 * Queue + attempt to send the pre-briefed handoff to the cloud relay. Tries an immediate POST; on
 * failure / no connectivity it enqueues and retries on reconnect (backoff probe loop). Never throws.
 * After a 'sent', lastEscalationResult() holds who was matched + the channel (whatsapp/staged).
 */
export async function escalate(brief: HandoffBrief): Promise<void> {
  const body = toBody(brief);
  try {
    setStatus('sending');
    const ok = await postBody(body);
    if (ok) {
      if (queue.length) { queue.push({ body, attempts: 0 }); await flushQueue(); return; }
      setStatus('sent');
      return;
    }
    enqueue(body); // 'queued' + schedules retry
  } catch (e) {
    console.log('[Kyro] escalate unexpected:', String(e));
    enqueue(body);
  }
}

/** Manually retry the queue (wire to a "signal restored" / app-foreground event). No-op if empty. */
export async function retryEscalations(): Promise<void> { await flushQueue(); }

/** Number of escalations still waiting to send (UI badge / debug). */
export function pendingEscalations(): number { return queue.length; }

/**
 * Open the dialer / WhatsApp so the operator reaches a hotline directly (the cloud relay never returns
 * the surgeon's number). Guards with canOpenURL and degrades gracefully. Never throws to the UI.
 */
export async function openExpertCall(): Promise<void> {
  try {
    const can = await Linking.canOpenURL(EXPERT_CONTACT);
    if (!can) { console.log('[Kyro] expert contact not openable:', EXPERT_CONTACT); return; }
    await Linking.openURL(EXPERT_CONTACT);
  } catch (e) {
    console.log('[Kyro] openExpertCall failed:', String(e));
  }
}
