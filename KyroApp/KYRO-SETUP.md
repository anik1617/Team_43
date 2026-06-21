# Kyro — run on your Samsung phone

This RN app runs the **real Kyro edge engine on-device**, loading the signed mock bundle and reaching
a real clinical decision. It's wired and bundle-validated; **you build the UI** (see `App.tsx`).

## What's already done (set up while you were away)
- ✅ Android toolchain (no Android Studio needed): JDK 17, SDK (platform-tools/adb, platform-35, build-tools 36, **NDK 27 + cmake** for native builds, emulator + AVD `kyro_pixel`) at `C:\Users\gowri\android-dev`. `JAVA_HOME` / `ANDROID_HOME` are set persistently.
- ✅ RN 0.86 app scaffolded with native deps: `@op-engineering/op-sqlite` (+ sqlite-vec), `@noble/hashes`, `@noble/curves`.
- ✅ The edge engine (E1–E5) copied into `engine/`; the mock bundle shipped at `android/app/src/main/assets/sqlite/edh-core-v0-mock.kyro`.
- ✅ `src/kyroDb.ts` — op-sqlite adapter (bridges op-sqlite rows → the engine's shim; copies the bundle out of the APK; read-only).
- ✅ `src/useKyroEncounter.ts` — runs the full engine (loadSpine → execute → gate → handoff) on the severe-HM seed; returns the decision.
- ✅ `App.tsx` — minimal screen rendering the decision, with a clear **`⬇️ BUILD YOUR UI HERE`** marker.
- ✅ **JS bundle validated** (Metro compiles the whole engine+adapter+hook graph, 0 errors).
- ⏳ Native APK build (op-sqlite via NDK) — running / see status at bottom.

## Run it on your Samsung phone
1. **One-time phone setup:** Settings → About phone → Software information → tap **Build number 7×** to unlock Developer options. Then Settings → Developer options → enable **USB debugging**. Plug into the PC via USB, set USB mode to **File transfer / MTP** (charging-only blocks adb). Tap **Allow** on the "Allow USB debugging?" prompt (check "Always allow").
   - *Samsung-specific:* if the device doesn't show up, install the **Samsung USB Driver for Mobile Phones** (developer.samsung.com) — Google's generic driver often won't bind Samsung devices.
2. **Verify it's seen:** `adb devices` → your phone serial should show as `device` (not `unauthorized`/`offline`).
3. **Build + install + launch:**
   ```powershell
   cd C:\Users\gowri\mb_hack\Team_43\KyroApp
   npx react-native run-android --active-arch-only
   ```
   First build is slow (Gradle + native compile). The app installs and launches on the phone, showing a real **🟢 GUIDE @ L21c** decision.
   - If Metro can't connect over USB: `adb reverse tcp:8081 tcp:8081`.

## Emulator alternative (no phone)
```powershell
C:\Users\gowri\android-dev\sdk\emulator\emulator.exe -avd kyro_pixel
# then, in the app dir:
npx react-native run-android
```
(The emulator needs hardware virtualization / WHPX enabled on Windows.)

## Where you build the UI
- **`App.tsx`** — everything below the `⬇️ BUILD YOUR UI HERE` marker is throwaway. The hook hands you a finished `result`:
  `result.badge` (GREEN/YELLOW/RED) · `result.action` · `result.leafId` · `result.recommendation` · `result.citation` · `result.drillAbstain` · `result.trace` · `result.handoff.sbar.*` (the SBAR expert handoff).
- The clinical logic already ran in `useKyroEncounter` — you only render. To change the case, edit the `HM_SEVERE` seed there.

## Gotchas (from setup research)
- **JDK must be 17** (pinned in `android/gradle.properties` → `org.gradle.java.home`). JDK 21/24 on PATH breaks Gradle.
- **MAX_PATH:** project is fairly deep; git `core.longpaths` is enabled. If a native C++ compile fails on a >260-char path, move the project nearer the drive root.
- The L3 model + whisper voice are **stubbed** here (hardware-gated); the deterministic decision is fully real. Live model/voice = a later `llama.rn` / `whisper.rn` wire-up.

---
## ✅ Native build: VERIFIED
`./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a` → **BUILD SUCCESSFUL (8m05s)**, produced
`android/app/build/outputs/apk/debug/app-debug.apk` (38.4 MB). op-sqlite compiled clean for arm64 via NDK.
The app is ready to install on the phone — just connect it and run `npx react-native run-android --active-arch-only`.
(First connect: see "Run it on your Samsung phone" above. The APK already exists; run-android will rebuild + install.)
