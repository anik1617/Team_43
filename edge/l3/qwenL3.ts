/**
 * L3 — the real on-device language model, as the four narrow I/O jobs (a mouth, not a brain).
 *
 * Backed by stock Qwen2.5-3B-Instruct-Q4 via node-llama-cpp (the laptop analog of llama.rn on the
 * phone). This validates the QUALITY assumption — can a tiny quantized model do the 4 jobs? — NOT
 * perf (laptop tok/s ≠ phone; that's E0b on real ARM). The model NEVER reasons or decides: it cleans
 * ASR text, classifies an answer into the spine's vocab, phrases a question, and words the leaf the
 * deterministic tree already chose.
 *
 * KEY SAFETY DESIGN: classifyAnswer uses GRAMMAR-CONSTRAINED decoding (JSON-schema enum) — the model
 * is physically unable to emit a value outside the spine's allowed set for that field. A 4B can't
 * hallucinate `gcs_e = 9` or an out-of-vocab pupil state; worst case it picks the wrong IN-vocab
 * value, which read-back confirmation (E6) is there to catch. Constrained decoding turns the small
 * model into a reliable classifier by construction.
 */

import { getLlama, LlamaChatSession, type Llama, type LlamaModel, type LlamaContext } from 'node-llama-cpp';
import type { L3, CgtNode } from '../e3/spineExecutor.ts';
import type { Env } from '../e3/conditions.ts';

// Per-field answer vocabularies — the structured values the spine's edges expect. Mirrors the
// `IN [...]` sets / comparisons in spine/edh-cgt.sql. classifyAnswer is constrained to these.
export const FIELD_VOCAB: Record<string, string[]> = {
  mechanism_class: ['blunt', 'penetrating', 'blast', 'open-depressed-fracture', 'non-trauma'],
  pupil_react_l: ['brisk', 'sluggish', 'fixed'],
  pupil_react_r: ['brisk', 'sluggish', 'fixed'],
  lucid_interval: ['yes', 'no', 'unknown'],
  anticoag_antiplatelet: ['none', 'warfarin', 'DOAC', 'antiplatelet', 'unknown'],
  known_coagulopathy: ['yes', 'no', 'unknown'],
  focal_weakness_side: ['left', 'right', 'none'],
  posturing: ['none', 'decorticate', 'decerebrate'],
  seizure_status: ['none', 'single-resolved', 'active-or-without-recovery'],
  spo2_available: ['yes', 'no'],
  glucose_available: ['yes', 'no'],
};
const NUMERIC = new Set(['gcs_e', 'gcs_v', 'gcs_m', 'time_since_injury_hr', 'pupil_size_l_mm',
  'pupil_size_r_mm', 'sbp_mmhg', 'age_yr', 'spo2_pct', 'blood_glucose']);

// Clinically-loaded fields where the bare vocab word isn't enough — a small model confuses the
// terms (decorticate vs decerebrate) or the concept (lucid interval). Define the values explicitly.
// This is the L3-layer fix for the two validation misses; read-back confirmation (E6) is the backstop.
const FIELD_VALUE_HINTS: Record<string, string> = {
  posturing: 'none = no abnormal posturing. decorticate = arms FLEXED inward toward the chest. decerebrate = arms EXTENDED/straightened stiffly outward (extensor).',
  lucid_interval: 'yes = the patient was awake and coherent for a period AFTER the injury, then declined. no = never had a coherent interval (unconscious since the injury, or never lucid). unknown = not known.',
  pupil_react_l: 'brisk = constricts quickly to light. sluggish = reacts slowly. fixed = no reaction (blown/dilated).',
  pupil_react_r: 'brisk = constricts quickly to light. sluggish = reacts slowly. fixed = no reaction (blown/dilated).',
};

const SYS_CLASSIFY = 'You are a clinical data-entry assistant. Map the responder\'s words to the single best structured value. Output only the value. Do not explain.';

// v1 languages. Knowledge stays English (sources are English guidelines); we translate ONLY at the
// edges — the model words the final recommendation / question in the target language (docs: i18n-native).
export const LANG_NAMES: Record<string, string> = { en: 'English', ur: 'Urdu (اردو)', hi: 'Hindi (हिन्दी)' };

export interface QwenL3 extends L3 { dispose(): Promise<void>; }

/** @param readLeafText optional: returns the leaf's AUTHORED recommendation (from cgt_strings) so
 *  synthesizeLeaf REWORDS guideline text rather than inventing clinical content (the inversion:
 *  the bundle supplies the content, the model only phrases it). On device this reads the open DB. */
export async function createQwenL3(modelPath: string, readLeafText?: (nodeId: string, lang?: string) => string | null): Promise<QwenL3> {
  const llama: Llama = await getLlama();
  const model: LlamaModel = await llama.loadModel({ modelPath });
  const context: LlamaContext = await model.createContext({ contextSize: 2048 });
  const sequence = context.getSequence();  // one reused sequence (avoids per-call sequence churn)

  // one fresh chat turn per call. History is cleared each call so classifications never leak into
  // each other; the per-call system instruction is prepended to the user message.
  const session = new LlamaChatSession({ contextSequence: sequence });
  async function turn(system: string, user: string, grammar?: any): Promise<string> {
    session.setChatHistory([]);
    // repeatPenalty guards small-model degeneration loops (seen in low-resource-language wording).
    return await session.prompt(`${system}\n\n${user}`, grammar
      ? { grammar, maxTokens: 48 }
      : { maxTokens: 240, temperature: 0, repeatPenalty: { penalty: 1.3, lastTokens: 64 } });
  }

  return {
    // 1 · clean ASR — fix obvious transcription noise, keep clinical meaning, no additions.
    async cleanAsr(raw: string): Promise<string> {
      const out = await turn('Tidy this transcribed speech: fix obvious errors and punctuation. Keep all clinical content. Output only the cleaned text.', raw);
      return out.trim();
    },

    // 2 · classify answer — CONSTRAINED to the field's vocab (enum) or an integer.
    async classifyAnswer(field: string, utterance: string, _node: CgtNode): Promise<Env[string]> {
      if (FIELD_VOCAB[field]) {
        const grammar = await llama.createGrammarForJsonSchema({
          type: 'object', properties: { value: { enum: FIELD_VOCAB[field] } }, required: ['value'],
        } as const);
        const hint = FIELD_VALUE_HINTS[field] ? `\nValue meanings: ${FIELD_VALUE_HINTS[field]}` : '';
        const res = await turn(SYS_CLASSIFY, `Field: ${field}\nAllowed values: ${FIELD_VOCAB[field].join(', ')}${hint}\nResponder said: "${utterance}"`, grammar);
        return (grammar.parse(res) as { value: string }).value;
      }
      if (NUMERIC.has(field)) {
        const grammar = await llama.createGrammarForJsonSchema({
          type: 'object', properties: { value: { type: 'integer' } }, required: ['value'],
        } as const);
        const res = await turn(SYS_CLASSIFY, `Field: ${field} (a number).\nResponder said: "${utterance}"\nExtract the integer.`, grammar);
        return (grammar.parse(res) as { value: number }).value;
      }
      return (await turn(SYS_CLASSIFY, `Field: ${field}\nResponder said: "${utterance}"`)).trim();
    },

    // 3 · phrase the next question — re-voice the authored prompt naturally, in the target language.
    async phraseQuestion(node: CgtNode, lang: string): Promise<string> {
      const field = node.field ?? 'the next assessment';
      const langName = LANG_NAMES[lang] ?? 'English';
      return (await turn(`You are an emergency triage co-pilot guiding a rural medical officer. Ask for the data clearly and calmly in one sentence, IN ${langName}. Output only the question.`,
        `Ask the responder to provide: ${field}.`)).trim();
    },

    // 4 · word the cited recommendation FROM the leaf the tree reached, IN the target language.
    //     Rewords + TRANSLATES the AUTHORED guideline text — never invents clinical content (REFUSES if
    //     absent). The knowledge stays English; only the phrasing is localized (translate-at-the-edges).
    async synthesizeLeaf(node: CgtNode, citations: string[], lang: string): Promise<string> {
      const cite = citations.filter(Boolean).join('; ');
      const langName = LANG_NAMES[lang] ?? 'English';
      const authored = readLeafText?.(node.id, lang)?.replace(/^\[[^\]]*\]\s*/, '') ?? null;
      if (!authored) return `[no authored guidance for ${node.id}] ${cite}`.trim();  // fail-closed: no source → no content
      const sys = lang === 'en'
        ? 'You are an emergency triage co-pilot. Reword the guideline recommendation below plainly for a non-specialist, in 2-3 sentences. Do NOT add, remove, or soften any clinical content — only rephrase. End with the citation.'
        : `You are an emergency triage co-pilot. Translate and reword the guideline recommendation below into ${langName}, plainly, for a non-specialist, in 2-3 sentences. Do NOT add, remove, or soften any clinical content — only translate and rephrase. Keep drug names and the citation in English. End with the citation.`;
      return (await turn(sys, `Guideline recommendation: ${authored}\nCitation: ${cite || 'none'}`)).trim();
    },

    async dispose() { await context.dispose(); await model.dispose(); },
  };
}
