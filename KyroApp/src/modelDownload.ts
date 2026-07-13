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
  asset: string;     // bundle-assets:// path — the model is shipped INSIDE the APK (no download needed)
  bytes: number;     // expected size (for the progress bar + a completeness check)
  minBytes: number;  // a file smaller than this is treated as partial/corrupt
}

// The validated set. bge-m3 FP16 + whisper here are byte-identical to the parity-tested files.
// Hosted on GitHub Releases (Fastly CDN) instead of HuggingFace: HF migrated large-file serving to its
// "Xet" CDN (cas-bridge.xethub.hf.co), which drops mobile connections mid-stream in some regions/ISPs.
// GitHub's release-asset CDN is a reliable direct download (resumable, no virus-scan interstitial).
// Files are byte-identical mirrors of the validated HF originals — sizes below are pinned + verified.
const GH = 'https://github.com/anik1617/Team_43/releases/download/models-v1';
export const MODELS: ModelSpec[] = [
  {
    key: 'whisper', label: 'Whisper base.en · voice', dest: WHISPER_PATH,
    url: `${GH}/ggml-base.en.bin`, asset: 'bundle-assets://models/ggml-base.en.bin',
    bytes: 147_964_211, minBytes: 140_000_000,
  },
  {
    key: 'bge', label: 'BGE-M3 FP16 · semantic retrieval', dest: BGE_MODEL_PATH,
    url: `${GH}/bge-m3-FP16.gguf`, asset: 'bundle-assets://models/bge-m3-FP16.gguf',
    bytes: 1_157_671_200, minBytes: 1_100_000_000,
  },
  {
    key: 'qwen', label: 'Qwen 2.5-3B · reasoning I/O', dest: MODEL_PATH,
    url: `${GH}/Qwen2.5-3B-Instruct-Q4_K_M.gguf`, asset: 'bundle-assets://models/qwen.gguf',
    bytes: 1_929_903_264, minBytes: 1_850_000_000,
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

/** The subset still needing provisioning (resume-friendly — a half-finished setup only does the rest). */
export async function missingModels(): Promise<ModelSpec[]> {
  const out: ModelSpec[] = [];
  for (const m of MODELS) if (!(await fileOk(m))) out.push(m);
  return out;
}

/** Are the models shipped INSIDE this APK? (true for the bundled build; false for the download build.) */
export async function modelsBundled(): Promise<boolean> {
  try { return await ReactNativeBlobUtil.fs.exists(MODELS[0].asset); } catch { return false; }
}

/**
 * Provision models by COPYING them out of the APK's bundled assets into the app files dir (no network).
 * This is the demo build's path: the 3 GGUFs ship inside the APK, so first-run is a local copy, never a
 * download. Atomic per file (.part → mv) + size-verified, same guarantees as the download path.
 */
export async function copyBundledModels(onProgress: (p: DLProgress) => void): Promise<void> {
  cancelled = false;
  const missing = await missingModels();
  const overallTotal = missing.reduce((n, m) => n + m.bytes, 0);
  let overallBase = 0;

  for (let i = 0; i < missing.length; i++) {
    const m = missing[i];
    if (cancelled) throw new Error('Setup cancelled');
    if (!(await ReactNativeBlobUtil.fs.exists(m.asset))) {
      throw new Error(`${m.label}: not bundled in this build — use the download build instead.`);
    }
    onProgress({
      key: m.key, label: `${m.label} · installing`, fileIdx: i, fileCount: missing.length,
      received: 0, total: m.bytes, overallReceived: overallBase, overallTotal,
    });

    const tmp = `${m.dest}.part`;
    if (await ReactNativeBlobUtil.fs.exists(tmp)) await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {});
    try {
      await ReactNativeBlobUtil.fs.cp(m.asset, tmp);            // copy out of the APK (decompresses if needed)
      const st = await ReactNativeBlobUtil.fs.stat(tmp);
      if (Number(st.size) < m.minBytes) throw new Error(`copied ${Math.round(Number(st.size) / 1e6)} MB, expected ~${Math.round(m.bytes / 1e6)} MB`);
      if (await ReactNativeBlobUtil.fs.exists(m.dest)) await ReactNativeBlobUtil.fs.unlink(m.dest).catch(() => {});
      await ReactNativeBlobUtil.fs.mv(tmp, m.dest);
    } catch (e) {
      await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {});
      throw new Error(`${m.label}: install failed (${String((e as any)?.message ?? e)})`);
    }
    overallBase += m.bytes;
    onProgress({
      key: m.key, label: `${m.label} · ready`, fileIdx: i, fileCount: missing.length,
      received: m.bytes, total: m.bytes, overallReceived: overallBase, overallTotal,
    });
  }
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

  const MAX_TRIES = 5; // a flaky-Wi-Fi / CDN-reset "interrupted" mid-stream is transient — retry it.

  for (let i = 0; i < missing.length; i++) {
    const m = missing[i];
    const tmp = `${m.dest}.part`;
    let lastErr = '';

    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      if (cancelled) { await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {}); throw new Error('Setup cancelled'); }
      if (await ReactNativeBlobUtil.fs.exists(tmp)) await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {});

      const task = ReactNativeBlobUtil.config({ path: tmp, overwrite: true, timeout: 0, fileCache: false })
        .fetch('GET', m.url);
      task.progress({ interval: 300 }, (received, total) => {
        const r = Number(received);
        const t = Number(total) > 0 ? Number(total) : m.bytes;
        onProgress({
          key: m.key, label: attempt > 1 ? `${m.label} · retry ${attempt - 1}/${MAX_TRIES - 1}` : m.label,
          fileIdx: i, fileCount: missing.length,
          received: r, total: t, overallReceived: overallBase + r, overallTotal,
        });
      });

      try {
        const res = await task;
        if (cancelled) { await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {}); throw new Error('Setup cancelled'); }
        const status = res.info().status;
        if (status < 200 || status >= 300) throw new Error(`HTTP ${status}`);
        const st = await ReactNativeBlobUtil.fs.stat(tmp);
        if (Number(st.size) < m.minBytes) throw new Error(`incomplete (${Math.round(Number(st.size) / 1e6)} MB)`);
        // success → atomic finalize, move to the next file
        if (await ReactNativeBlobUtil.fs.exists(m.dest)) await ReactNativeBlobUtil.fs.unlink(m.dest).catch(() => {});
        await ReactNativeBlobUtil.fs.mv(tmp, m.dest);
        overallBase += m.bytes;
        lastErr = '';
        break;
      } catch (e) {
        lastErr = String((e as any)?.message ?? e);
        await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => {});
        if (cancelled || lastErr === 'Setup cancelled') throw new Error('Setup cancelled');
        if (attempt < MAX_TRIES) await new Promise((r) => setTimeout(r, 2000 * attempt)); // linear backoff: 2s,4s,6s,8s
      }
    }

    if (lastErr) throw new Error(`${m.label}: ${lastErr} — couldn't finish after ${MAX_TRIES} tries. Check Wi-Fi, keep Kyro open, and tap Retry.`);
  }
}
