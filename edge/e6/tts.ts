/**
 * E6 — TTS binding (the "speaking" half). ONE interface, two bindings:
 *   • laptop/dev  → makeSapiTts  (Windows SAPI via PowerShell — zero install, Windows-only)
 *   • phone/prod  → Piper        (cross-platform neural TTS, ships on-device; reference below)
 *
 * SAPI is dev-only (Windows). The shippable on-device voice is Piper (same role, runs on Android),
 * so the speak() contract is identical and only the binding swaps — mirrors the ASR design (asr.ts).
 */

import { spawn } from 'node:child_process';

export interface Tts {
  speak(text: string): Promise<void>;
}

/** LAPTOP/DEV binding — Windows SAPI. Text is piped via stdin to avoid quoting issues. */
export function makeSapiTts(opts: { rate?: number } = {}): Tts {
  const rate = opts.rate ?? 0;
  return {
    speak(text) {
      return new Promise((resolve, reject) => {
        const ps = spawn('powershell', ['-NoProfile', '-Command',
          `Add-Type -AssemblyName System.Speech; $v=New-Object System.Speech.Synthesis.SpeechSynthesizer; $v.Rate=${rate}; $v.SetOutputToDefaultAudioDevice(); $v.Speak([Console]::In.ReadToEnd()); $v.Dispose()`,
        ]);
        ps.on('error', reject);
        ps.on('close', () => resolve());
        ps.stdin.write(text);
        ps.stdin.end();
      });
    },
  };
}

/**
 * PHONE/PROD binding — Piper (reference; runs in the RN app at E0a). Same speak() contract.
 *   // react-native-nitro-piper or a piper native module, with a bundled voice (e.g. en_US-*.onnx)
 *   const piper = await Piper.load({ model: 'en_US-amy-medium.onnx' });
 *   export const phoneTts: Tts = { async speak(t) { await piper.synthesizeAndPlay(t); } };
 *
 * Piper voices exist for en / hi (and more) — the in-language recommendation (from the reviewed
 * bundle string) is spoken by the matching Piper voice. Urdu TTS is best-effort (voice availability).
 */
export const PHONE_TTS_REFERENCE = 'Piper — see edge/e6/tts.ts header';
