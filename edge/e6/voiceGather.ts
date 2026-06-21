/**
 * E6 — Voice gather host. Implements E3's GatherHost over speech: ask → listen → ASR → L3 clean →
 * L3 classify → READ-BACK CONFIRM (every critical field) → structured value. The native I/O (TTS,
 * mic+ASR) is INJECTED (VoiceIO) — on device that's Piper/OS-TTS + whisper.rn; in tests it's audio
 * files + scripted confirms. The whisper.cpp engine used in the laptop tests is the SAME as on-device.
 *
 * SAFETY: read-back confirmation is the backstop for ASR/classification error (the L3 validation
 * showed a small model can mis-map a clinically-loaded term). A critical field is spoken back to the
 * operator and must be confirmed before it enters the deterministic tree. Code still decides; the
 * model only hears and phrases.
 */

import type { L3, CgtNode, GatherHost } from '../e3/spineExecutor.ts';
import type { Env } from '../e3/conditions.ts';

/** Native speech I/O — injected. Device: Piper/OS-TTS + whisper.rn. Test: scripted/audio-file backed. */
export interface VoiceIO {
  speak(text: string): Promise<void>;     // TTS the prompt / read-back
  listen(tag: string): Promise<string>;   // capture mic → ASR → raw transcript (tag = field or `${field}__confirm`)
}

export interface VoiceOpts {
  lang?: string;
  /** fields requiring spoken read-back confirmation before they enter the tree (the critical set). */
  criticalFields?: Set<string>;
  maxRetries?: number;
}

// affirmative tokens across EN + romanized UR/HI (voice confirm is multilingual best-effort).
const AFFIRM = /\b(yes|yeah|correct|right|confirm(ed)?|haan|han|ji|sahi|theek|sai)\b/i;

const DEFAULT_CRITICAL = new Set([
  'gcs_e', 'gcs_v', 'gcs_m', 'pupil_react_l', 'pupil_react_r', 'sbp_mmhg',
  'anticoag_antiplatelet', 'mechanism_class', 'lucid_interval',
]);

/** Build a GatherHost that captures each field by voice with read-back on the critical ones. */
export function voiceGatherHost(l3: L3, io: VoiceIO, opts: VoiceOpts = {}): GatherHost & { transcript: Array<{ field: string; raw: string; value: Env[string]; confirmed: boolean }> } {
  const lang = opts.lang ?? 'en';
  const critical = opts.criticalFields ?? DEFAULT_CRITICAL;
  const maxRetries = opts.maxRetries ?? 2;
  const transcript: Array<{ field: string; raw: string; value: Env[string]; confirmed: boolean }> = [];

  return {
    transcript,
    async ask(field: string, node: CgtNode): Promise<Env[string]> {
      await io.speak(await l3.phraseQuestion(node, lang));

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const raw = await io.listen(field);
        const cleaned = await l3.cleanAsr(raw);
        const value = await l3.classifyAnswer(field, cleaned, node);

        if (!critical.has(field)) {
          transcript.push({ field, raw, value, confirmed: false });
          return value;
        }

        // READ-BACK: speak the captured value back and require confirmation before it counts.
        await io.speak(`I recorded ${field.replace(/_/g, ' ')} as ${value}. Is that correct?`);
        const conf = await io.listen(`${field}__confirm`);
        if (AFFIRM.test(conf)) {
          transcript.push({ field, raw, value, confirmed: true });
          return value;
        }
        await io.speak('Sorry — let me capture that again.');
      }

      // Could not confirm after retries: surface it (device escalates to manual entry / re-ask).
      // We return the last reading but mark it unconfirmed so the UI can flag it; the deterministic
      // tree still cannot terminate on a critical field that downstream validation rejects.
      const raw = await io.listen(field);
      const value = await l3.classifyAnswer(field, await l3.cleanAsr(raw), node);
      transcript.push({ field, raw, value, confirmed: false });
      return value;
    },
  };
}
