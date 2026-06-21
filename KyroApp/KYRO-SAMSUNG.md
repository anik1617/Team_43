# Deploying Kyro to a phone (Samsung / any Android 8+)

Kyro is **offline-first**: the app is ~138 MB, but it runs **3 on-device models (~3.4 GB)** —
Qwen 2.5-3B (reasoning I/O), BGE-M3 FP16 (semantic retrieval), and Whisper base.en (voice).
Those can't fit in an APK, so the app **downloads them itself on first launch** (one time, then
fully offline). No computer, no `adb` needed.

---

## ✅ Easiest path — just install the APK (no computer)

1. **Get the APK onto the phone.** Share `app-release.apk` (138 MB) via a link (Drive / WhatsApp /
   email). On the phone, tap it to install. If Android blocks it: *Settings → Apps → Special access →
   Install unknown apps →* allow your browser/Files app, then tap the APK again.
2. **Open Kyro.** First launch shows **"First-time setup"** → tap **Download models · ~3.4 GB**.
   - Use **Wi-Fi** (it's 3.4 GB). Keep the app open; there's a live progress bar.
   - This happens **once**. After it finishes the app is fully offline forever.
3. **Done.** You'll see `Kyro · Offline · on-device`, the mic works, and the gather → decision →
   handoff all run on the phone.

> The models come straight from public HuggingFace (`Qwen/Qwen2.5-3B-Instruct-GGUF`,
> `gpustack/bge-m3-GGUF`, `ggerganov/whisper.cpp`). Nothing of yours leaves the phone.

**Requirements:** Android 8+ (tested target Android 14), **~4.5 GB free storage**, and Wi-Fi for the
one-time download. A 6 GB-RAM phone or better is comfortable for the 3B model.

---

## ⚡ Faster path — pre-load the models with a computer (skips the in-app download)

If you have a USB cable + computer, you can push the models directly and skip the 3.4 GB download:

1. On the phone: *Settings → About phone → tap **Build number** 7× → Developer options → enable
   **USB debugging***. Plug into the computer, accept the prompt.
2. Install [platform-tools](https://developer.android.com/tools/releases/platform-tools) (gives you `adb`).
3. ```
   adb install app-release.apk
   ```
   Open the app once (creates its data folder), then push the 3 models you already have:
   ```
   adb push qwen.gguf          /sdcard/Android/data/com.kyroapp/files/qwen.gguf
   adb push bge-m3.gguf        /sdcard/Android/data/com.kyroapp/files/bge-m3.gguf
   adb push ggml-base.en.bin   /sdcard/Android/data/com.kyroapp/files/ggml-base.en.bin
   ```
   (`scripts/push-models.ps1` does exactly this on Windows.)
4. Reopen Kyro — it detects the models and skips setup entirely.

---

## 🏪 Play Store path (internal testing — for a clean "install from Play" demo)

The release **App Bundle** is already built: `android/app/build/outputs/bundle/release/app-release.aab`.

1. Create a **Google Play Developer account** (one-time $25) at <https://play.google.com/console>.
2. **Create app** → upload `app-release.aab` to the **Internal testing** track (fastest review).
3. Add your friend's Google account email as a tester → share the opt-in link → they install from Play.
4. On first open, the app downloads the models (same B1 flow) — Play distributes the *app*, not the 3.4 GB.

**Before you can publish you'll need:** a privacy policy URL, the Data safety form, a content rating,
and a clear **"research prototype — not a medical device"** disclaimer (a clinical app draws health-
policy review; Internal testing minimizes this). Keep it on the testing track for the hackathon.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "App not installed" / blocked | Allow "install unknown apps" for your browser/Files app (see step 1). |
| Setup says a model "incomplete" | Network dropped mid-download. Tap **Retry** — it resumes the unfinished file. |
| Stuck on "Offline · on-device" with Wi-Fi on | That's correct for the *cloud* link (expert handoff). The app is meant to be offline; "Online" only lights up when it can reach the escalation service. |
| Mic says "Voice unavailable" | Grant the microphone permission when prompted (or *Settings → Apps → Kyro → Permissions → Microphone*). |
| Want text-only (no 3.4 GB) | Tap **Skip — text-only mode** at setup: deterministic decisions + authored guidance still work; voice/AI-wording/semantic-retrieval are off. |
| Model load is slow on first decision | The 3B model loads into RAM once per app start (~10–20 s on a mid phone), then it's fast. |

---

## What's in the build (all verified)

- Interactive voice/tap gather → deterministic spine → cited recommendation + 🟢/🟡/🔴 + drill-site abstain
- **Signed** knowledge bundle `edh-core-v1.kyro` (ed25519 + pinned key, **verified on-device**, fail-closed)
- On-device **Qwen + Whisper + BGE-M3** (FP16 — embedding parity passed) via the first-run download
- Cloud (the one online moment): **WhatsApp escalation** (`/escalate`), **knowledge portal** (`/portal`),
  connectivity (`/healthz`) — all live-tested against the deployed service
- Release-signed (own keystore) · `RECORD_AUDIO` + `INTERNET` only · Android App Bundle ready for Play
