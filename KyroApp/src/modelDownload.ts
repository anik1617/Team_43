/**
 * First-run model download (B1) — fetch the 3 GGUFs into the app's OWN external files dir.
 *
 * Why this exists: the models are ~3.4 GB and cannot ship inside the APK/AAB (Play's base cap is
 * ~200 MB). So on first launch — if the models aren't already present (e.g. an adb push) — Kyro
 * downloads them once. This makes the app installable from the Play Store OR a bare APK with NO
 * computer and NO adb: tap install → app self-provisions → fully offline forever after.
 *
 * Android 14 note: the destination is the app's OWN getExternalFilesDir() (the same paths
 * qwenL3/voice/bgeEmbed already load from) — writable with NO storage permission on any Android
 * version. Only INTERNET is needed (already granted).
 *
 * Streaming: react-native-blob-util writes the response straight to disk (a plain fetch() would buffer
 * 2 GB in memory → OOM), with progress events and a .part → final atomic move so an interrupted
 * download is never mistaken for a complete file. Already-present files are skipped (resume-friendly).
 *
 * Sources default to the EXACT public HuggingFace files we validated (bge-m3 FP16 + whisper base.en
 * are byte-identical to the parity-tested files; Qwen is the official q4_k_m, equivalent). Override
 * any `url` below to self-host. A failed/absent model is non-fatal — the app degrades to authored
 * text / stub retrieval (see qwenL3/bgeEmbed), so a bad network never bricks the device.
 */
import ReactNativeBlobUtil from 'react-native-blob-util';
import { MODEL_PATH } from './qwenL3';
import { WHISPER_PATH } from './voice';
import { BGE_MODEL_PATH } from './bgeEmbed';

export interface ModelSpec {
  key: 'qwen' | 'bge' | 'whisper';
  label: string;
  dest: string;
  url: string;
  bytes: number;     // expected size (for the progress bar + a completeness check)
  minBytes: number;  // a file smaller than this is treated as partial/corrupt
}

// The validated set. bge-m3 FP16 + whisper here are byte-identical to the parity-tested files.
export const MODELS: ModelSpec[] = [
  {
    key: 'whisper', label: 'Whisper base.en · voice', dest: WHISPER_PATH,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    bytes: 147_964_211, minBytes: 140_000_000,
  },
  {
    key: 'bge', label: 'BGE-M3 FP16 · semantic retrieval', dest: BGE_MODEL_PATH,
    url: 'https://huggingface.co/gpustack/bge-m3-GGUF/resolve/main/bge-m3-FP16.gguf',
    bytes: 1_157_671_200, minBytes: 1_100_000_000,
  },
  {
    key: 'qwen', label: 'Qwen 2.5-3B · reasoning I/O', dest: MODEL_PATH,
    url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
    bytes: 2_104_932_768, minBytes: 1_900_000_000,
  },
];

export const TOTAL_BYTES = MODELS.reduce((n, m) => n + m.bytes, 0);

export interface DLProgress {
  key: ModelSpec['key'];
  label: string;
  fileIdx: number;       // 0-based index among the files being fetched this run
  fileCount: number;     // how many files this run will fetch
  received: number;      // bytes received for the CURRENT file
  total: number;         // total bytes for the CURRENT file
  overallReceived: number; // bytes received across all files this run
  overallTotal: number;    // total bytes across all files this run
}

async function fileOk(m: ModelSpec): Promise<boolean> {
  try {
    if (!(await ReactNativeBlobUtil.fs.exists(m.dest))) return false;
    const st = await ReactNativeBlobUtil.fs.stat(m.dest);
    return Number(st.size) >= m.minBytes;
  } catch { return false; }
}

/** True iff all 3 models are present + complete (already pushed via adb, or a prior download). */
export async function modelsPresent(): Promise<boolean> {
  for (const m of MODELS) if (!(await fileOk(m))) return false;
  return true;
}

/** The subset still needing download (resume-friendly — a half-finished setup only fetches the rest). */
export async function missingModels(): Promise<ModelSpec[]> {
  const out: ModelSpec[] = [];
  for (const m of MODELS) if (!(await fileOk(m))) out.push(m);
  return out;
}

let cancelled = false;
export function cancelModelDownload(): void { cancelled = true; }

/**
 * Download every missing model into the app's files dir, oldest-cheapest first (whisper → bge → qwen,
 * so the small files land fast and the user sees progress). Atomic per file (.part → mv). Throws on
 * the first hard failure (HTTP error / incomplete / cancelled) with the partial cleaned up.
 */
export async function downloadModels(onProgress: (p: DLProgress) => void): Promise<void> {
  cancelled = false;
  const missing = await missingModels();
  const overallTotal = missing.reduce((n, m) => n + m.bytes, 0);
  let overallBase = 0;

  for (let i = 0; i < missing.length; i++) {
    const m = missing[i];
    const tmp = `${m.dest}.part`;
    if (await ReactNativeBlobUtil.fs.exists(tmp)) await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {});

    const task = ReactNativeBlobUtil.config({ path: tmp, overwrite: true, timeout: 0, fileCache: false })
      .fetch('GET', m.url);
    task.progress({ interval: 300 }, (received, total) => {
      const r = Number(received);
      const t = Number(total) > 0 ? Number(total) : m.bytes;
      onProgress({
        key: m.key, label: m.label, fileIdx: i, fileCount: missing.length,
        received: r, total: t, overallReceived: overallBase + r, overallTotal,
      });
    });

    let res;
    try { res = await task; }
    catch (e) {
      await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {});
      throw new Error(`${m.label}: download failed (${String(e)})`);
    }
    if (cancelled) { await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {}); throw new Error('Setup cancelled'); }

    const status = res.info().status;
    if (status < 200 || status >= 300) {
      await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {});
      throw new Error(`${m.label}: HTTP ${status}`);
    }
    const st = await ReactNativeBlobUtil.fs.stat(tmp);
    if (Number(st.size) < m.minBytes) {
      await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {});
      throw new Error(`${m.label}: incomplete (${Math.round(Number(st.size) / 1e6)} MB) — check the connection and retry`);
    }
    // atomic finalize
    if (await ReactNativeBlobUtil.fs.exists(m.dest)) await ReactNativeBlobUtil.fs.unlink(m.dest).catch(() => {});
    await ReactNativeBlobUtil.fs.mv(tmp, m.dest);
    overallBase += m.bytes;
  }
}
