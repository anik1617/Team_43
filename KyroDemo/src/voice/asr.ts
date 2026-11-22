/**
 * On-device speech recognition: whisper.cpp (whisper.rn) fed by the KyroMic PCM stream.
 *
 * Everything runs on the phone. The model ships inside the APK (assets/models), the audio stays in
 * memory, and nothing is sent anywhere. While the clinician talks, the current stretch of audio is
 * re-transcribed every time the previous pass finishes, so the transcript grows live. Long speech is
 * cut into segments at a pause (or at ~27 s, the edge of whisper's 30 s window).
 */
import { PermissionsAndroid, Platform } from 'react-native';
import { initWhisper, type WhisperContext } from 'whisper.rn/index'; // the package only exports subpaths
import KyroMic from '../../modules/kyro-mic';

const RATE = 16000;
const BYTES_PER_SEC = RATE * 2;
const CUT_AFTER_SEC = 16; // look for a pause to cut a segment after this much audio
const HARD_CUT_SEC = 27;
const MIN_NEW_SEC = 0.6; // re-transcribe once this much new audio has arrived

// Steers spelling of clinical words. No numbers, so it can't put values in his mouth.
const PROMPT =
  'Emergency head injury handover. Glasgow Coma Scale, GCS, blood pressure, heart rate, sats, ' +
  'room air, loss of consciousness, vomited, pupils, motorcycle, helmet, boggy swelling, temple, kilometres.';

// ── Model ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MODEL = require('../../assets/models/ggml-base.en.bin');

let ctx: WhisperContext | null = null;
let loading: Promise<WhisperContext> | null = null;

export const asrSupported = () => Platform.OS === 'android' && !!KyroMic;

/** Loads the whisper model once. Safe to call repeatedly; later calls share the first load. */
export function warmUp(): Promise<WhisperContext> {
  if (ctx) return Promise.resolve(ctx);
  if (!loading) {
    loading = initWhisper({ filePath: MODEL, useGpu: false })
      .then((c) => { ctx = c; return c; })
      .catch((e) => { loading = null; throw e; });
  }
  return loading!;
}

export async function requestMic(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const p = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  if (await PermissionsAndroid.check(p)) return true;
  const r = await PermissionsAndroid.request(p, {
    title: 'Microphone',
    message: 'Kyro transcribes your case description on this phone. Audio never leaves the device.',
    buttonPositive: 'Allow',
  });
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = (() => { const t = new Uint8Array(256); for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i; return t; })();
function b64ToBytes(s: string): Uint8Array {
  let len = s.length;
  while (len > 0 && s[len - 1] === '=') len--;
  const out = new Uint8Array((len * 3) >> 2);
  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const a = LOOKUP[s.charCodeAt(i)], b = LOOKUP[s.charCodeAt(i + 1)];
    const c = i + 2 < len ? LOOKUP[s.charCodeAt(i + 2)] : 0, d = i + 3 < len ? LOOKUP[s.charCodeAt(i + 3)] : 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

/** Removes whisper's non-speech markers and stray hallucinated sign-offs. */
export function cleanText(t: string): string {
  return t
    .replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*/g, ' ')
    .replace(/♪/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Live session ─────────────────────────────────────────────────────────────

export type LiveUpdate = {
  /** Finished segments plus the latest pass over the current one. */
  text: string;
  /** Mic level of the latest chunk, 0..1. */
  level: number;
  /** Seconds of audio captured. */
  seconds: number;
  /** True once ~3 s have passed with no sound at all (emulator host mic off, muted mic). */
  silentMic: boolean;
};

type Chunk = { bytes: Uint8Array; level: number };

export class LiveTranscriber {
  private chunks: Chunk[] = []; // current segment
  private segBytes = 0;
  private done: string[] = []; // finished segments
  private partial = '';
  private transcribedBytes = 0; // segBytes at the last pass
  private busy: Promise<void> | null = null;
  private running = false;
  private totalBytes = 0;
  private peakLevel = 0;
  private maxLevel = 0;
  private lastLevel = 0;
  private subs: { remove(): void }[] = [];

  constructor(private onUpdate: (u: LiveUpdate) => void, private onError: (msg: string) => void) {}

  get text() { return [...this.done, this.partial].filter(Boolean).join(' ').trim(); }

  async start() {
    if (!KyroMic) throw new Error('Microphone module not available in this build');
    const w = await warmUp();
    this.running = true;
    this.subs.push(KyroMic.addListener('onAudio', (e) => this.onAudio(e.data, e.level)));
    this.subs.push(KyroMic.addListener('onMicError', (e) => this.onError(e.message)));
    await KyroMic.start(RATE);
    void w;
  }

  /** Stops the mic, transcribes whatever is left, and resolves with the full transcript. */
  async stop(): Promise<string> {
    this.running = false;
    try { await KyroMic?.stop(); } catch { /* already stopped */ }
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    if (this.busy) await this.busy;
    if (this.segBytes > this.transcribedBytes && this.segBytes > BYTES_PER_SEC * 0.3) await this.pass(true);
    else this.finishSegment();
    this.emit();
    return this.text;
  }

  /** Abandons the session without a final pass (screen unmounted). */
  cancel() {
    this.running = false;
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    KyroMic?.stop().catch(() => {});
  }

  private onAudio(b64: string, level: number) {
    if (!this.running) return;
    const bytes = b64ToBytes(b64);
    this.chunks.push({ bytes, level });
    this.segBytes += bytes.length;
    this.totalBytes += bytes.length;
    this.lastLevel = level;
    this.maxLevel = Math.max(this.maxLevel, level);
    this.peakLevel = Math.max(level, this.peakLevel * 0.995);
    this.emit();
    this.maybeCut();
    if (!this.busy && this.segBytes - this.transcribedBytes >= BYTES_PER_SEC * MIN_NEW_SEC) {
      this.busy = this.pass(false).finally(() => { this.busy = null; });
    }
  }

  /** Starts a new segment at a pause once the current one is long, so whisper's window never overflows. */
  private maybeCut() {
    const sec = this.segBytes / BYTES_PER_SEC;
    if (sec < CUT_AFTER_SEC || this.busy) return;
    const last = this.chunks.slice(-4);
    const quiet = last.length === 4 && last.every((c) => c.level < Math.max(0.004, this.peakLevel * 0.12));
    if (quiet || sec >= HARD_CUT_SEC) {
      // Final pass over the closed segment, then start fresh.
      const closing = this.chunks;
      const closingBytes = this.segBytes;
      this.chunks = [];
      this.segBytes = 0;
      this.transcribedBytes = 0;
      this.busy = this.transcribe(closing, closingBytes)
        .then((t) => { if (t) this.done.push(t); else if (this.partial) this.done.push(this.partial); this.partial = ''; this.emit(); })
        .catch((e) => this.onError(String(e?.message ?? e)))
        .finally(() => { this.busy = null; });
    }
  }

  private async pass(final: boolean) {
    const bytes = this.segBytes;
    try {
      const t = await this.transcribe(this.chunks, bytes);
      this.transcribedBytes = bytes;
      if (t || final) this.partial = t || this.partial;
      if (final) this.finishSegment();
      this.emit();
    } catch (e: any) {
      this.onError(String(e?.message ?? e));
    }
  }

  private finishSegment() {
    if (this.partial) this.done.push(this.partial);
    this.partial = '';
    this.chunks = [];
    this.segBytes = 0;
    this.transcribedBytes = 0;
  }

  private async transcribe(chunks: Chunk[], bytes: number): Promise<string> {
    if (!ctx || bytes < BYTES_PER_SEC * 0.3) return '';
    // Skip near-silent audio: whisper hallucinates on silence.
    if (!chunks.some((c) => c.level > 0.006)) return '';
    const pcm = new Uint8Array(bytes);
    let o = 0;
    for (const c of chunks) { if (o + c.bytes.length > bytes) break; pcm.set(c.bytes, o); o += c.bytes.length; }
    const prompt = [PROMPT, this.done.slice(-1)[0]].filter(Boolean).join(' ');
    const { promise } = ctx.transcribeData(pcm.buffer as ArrayBuffer, { language: 'en', maxThreads: 4, prompt, temperature: 0 });
    const r = await promise;
    return cleanText(r.result ?? '');
  }

  private emit() {
    const seconds = this.totalBytes / BYTES_PER_SEC;
    this.onUpdate({ text: this.text, level: this.lastLevel, seconds, silentMic: seconds > 3 && this.maxLevel < 0.0015 });
  }
}
