/**
 * Voice — the on-device speech layer.
 *   speak()  → Kyro talks (react-native-tts, OS voice).
 *   listen() → you talk, whisper.cpp transcribes (whisper.rn, same engine validated on the laptop).
 * Both degrade gracefully (no-op / '') if a module or model isn't available.
 */
import Tts from 'react-native-tts';
import { initWhisper } from 'whisper.rn';

const FILES = '/storage/emulated/0/Android/data/com.kyroapp/files';
export const WHISPER_PATH = `${FILES}/ggml-base.en.bin`;

// ── TTS ──
let ttsReady = false;
export async function speak(text: string) {
  try {
    if (!ttsReady) { await Tts.getInitStatus(); Tts.setDefaultRate(0.46); Tts.setDefaultPitch(1.0); ttsReady = true; }
    Tts.stop();
    Tts.speak(text);
    console.log('[Kyro] TTS speak:', text.slice(0, 40));
  } catch (e) { console.log('[Kyro] TTS FAILED:', String(e)); }
}
export function stopSpeaking() { try { Tts.stop(); } catch {} }

// ── mic (whisper.cpp) ──
let wctx: any = null;
let micStatus: 'none' | 'loading' | 'ready' | 'failed' = 'none';
export function micState() { return micStatus; }

export async function initMic(): Promise<boolean> {
  if (micStatus === 'ready') return true;
  micStatus = 'loading';
  try { wctx = await initWhisper({ filePath: WHISPER_PATH }); micStatus = 'ready'; console.log('[Kyro] whisper READY'); return true; }
  catch (e) { micStatus = 'failed'; console.log('[Kyro] whisper FAILED:', String(e)); return false; }
}

/** Capture ~ms of mic speech and return the transcript. */
export async function listen(ms = 6000): Promise<string> {
  if (!wctx) return '';
  try {
    const { stop, subscribe } = await wctx.transcribeRealtime({ language: 'en' });
    let text = '';
    subscribe((e: any) => { const r = e?.data?.result; if (r) text = r; });
    await new Promise((r) => setTimeout(r, ms));
    await stop();
    return text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  } catch { return ''; }
}
