/**
 * E6 — ASR binding. ONE interface, TWO bindings to the SAME engine (whisper.cpp) + SAME ggml model:
 *   • laptop/dev  → makeWhisperCliAsr  (prebuilt whisper-cli.exe via child_process)
 *   • phone/prod  → makeWhisperRnAsr   (whisper.rn, the React-Native binding — runs in the RN app)
 *
 * This is what makes "test on laptop, deploy to phone" real: whisper.rn bundles whisper.cpp and
 * loads the identical ggml-*.bin, so the transcription quality measured on the laptop is the quality
 * that runs on the device. Only the binding swaps; the contract (16 kHz mono WAV → text) is shared.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const pexec = promisify(execFile);

/** Shared contract. Input: path to a 16 kHz mono WAV. Output: the transcript text. */
export interface Asr {
  transcribe(wavPath: string): Promise<string>;
}

/** LAPTOP/DEV binding — prebuilt whisper.cpp CLI (no build needed). */
export function makeWhisperCliAsr(cfg: { exe: string; model: string; lang?: string }): Asr {
  return {
    async transcribe(wavPath) {
      // -nt = no timestamps, -np = no progress prints; transcript goes to stdout.
      const { stdout } = await pexec(cfg.exe, ['-m', cfg.model, '-f', wavPath, '-l', cfg.lang ?? 'en', '-nt', '-np'], { maxBuffer: 1 << 20 });
      return stdout.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();  // strip any residual [..] markers
    },
  };
}

/**
 * PHONE/PROD binding — reference only (runs inside the RN app at E0a, not on this host).
 * Identical contract, same ggml model. Wiring (whisper.rn):
 *
 *   import { initWhisper } from 'whisper.rn';
 *   const ctx = await initWhisper({ filePath: 'ggml-base.en.bin' });   // same model file as the CLI
 *   export const phoneAsr: Asr = {
 *     async transcribe(wavPath) {
 *       const { promise } = ctx.transcribe(wavPath, { language: 'en' });
 *       return (await promise).result.trim();
 *     },
 *   };
 *
 * On a live mic, whisper.rn streams via ctx.transcribeRealtime(...) — same engine, same weights.
 */
export const PHONE_ASR_REFERENCE = 'whisper.rn — see edge/e6/asr.ts header';
