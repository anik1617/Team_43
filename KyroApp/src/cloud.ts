/**
 * Cloud config — the ONE online edge of an otherwise fully-offline app.
 *
 * Single source of truth for Aniket's deployed Kyro Cloud Service (FastAPI):
 *   • POST /escalate  — E8 hard-stop handoff → deterministic expert match → Twilio WhatsApp.
 *   • /portal         — C7 community-knowledge flywheel (gap inbox + contribute). Web UI.
 *   • /healthz        — liveness; drives the real online/offline indicator.
 *
 * The clinical DECISION never depends on the cloud — this is purely the human handoff + the
 * knowledge flywheel + connectivity sensing. Everything here degrades gracefully with no signal.
 *
 * ⚙️  SET THESE FOR THE DEMO:
 *   CLOUD_BASE          → the live service URL (Render blueprint name kyro-cloud → the default below;
 *                         for a local tunnel use the printed cloudflared/ngrok https URL).
 *   KYRO_ESCALATE_TOKEN → only if the relay is locked (KYRO_ESCALATE_TOKEN set server-side; required
 *                         once Twilio is live). '' = open relay (the demo default).
 *   EXPERT_CONTACT      → a real direct-dial / WhatsApp fallback number for "Open secure call".
 */
import { Linking } from 'react-native';

// No trailing slash. Override for a local tunnel (cloudflared/ngrok) during dev.
export const CLOUD_BASE = 'https://kyro-cloud.onrender.com';

// Shared secret for the relay, if locked server-side. Sent as the X-Kyro-Token header. '' = open.
export const KYRO_ESCALATE_TOKEN = '';

// Optional escalation context (improves the cloud's deterministic in-region expert match). '' = omit.
export const ESCALATE_REGION = '';                 // e.g. 'Namibia'
export const ESCALATE_CALLBACK = '';               // how the on-scene clinician is reached, e.g. 'BHU radio'

// Direct-dial fallback (the cloud relay never returns the surgeon's number — this is a known hotline).
export const EXPERT_CONTACT = 'tel:+10000000000';  // e.g. 'tel:+264...' or 'https://wa.me/264...'

export const ESCALATE_URL = `${CLOUD_BASE}/escalate`;
export const PORTAL_URL = `${CLOUD_BASE}/portal`;
export const HEALTHZ_URL = `${CLOUD_BASE}/healthz`;

/** Open the community-knowledge contribution portal (C7) in the browser. Never throws. */
export async function openKnowledgePortal(): Promise<boolean> {
  try {
    await Linking.openURL(PORTAL_URL);
    return true;
  } catch (e) {
    console.log('[Kyro] open knowledge portal failed:', String(e));
    return false;
  }
}

/** Ping /healthz. true iff the service answers ok — the real online/offline signal. Never throws. */
export async function checkCloudHealth(timeoutMs = 4000): Promise<boolean> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(HEALTHZ_URL, { signal: ctrl.signal });
    if (!res.ok) return false;
    const j: any = await res.json().catch(() => null);
    return !!(j && j.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(id);
  }
}
