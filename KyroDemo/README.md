# Kyro demo app

A clickable concept demo of Kyro for the Emergent Ventures and 1517 Medici applications. It shows how Kyro would look and feel fully built. **Everything is simulated:** the patient, the voice transcription, the guideline-tree walk, the sync and the specialist reply are all scripted. Nothing here is the real engine (that lives in `../KyroApp`).

Built with Expo SDK 58 (React Native 0.88). It has no native AI dependencies, so it builds fast and runs on any emulator.

## Run it on the Android emulator (Windows)

You need Node 20 or newer, and Android Studio with one emulator (AVD) set up. You already have both if you have built `KyroApp`.

```powershell
cd C:\Personal_Coding\Kyro\Team_43
git fetch origin
git checkout aniket/kyro-demo
cd KyroDemo
npm install
```

Start an emulator from Android Studio (**Device Manager → ▶**). A Pixel 7 or Pixel 8 image looks best on video.

**Option A: quickest (Expo Go)**

```powershell
npx expo start
```

When the QR code shows, press `a`. Expo installs Expo Go on the emulator and opens Kyro. Good for checking the flow.

**Option B: best for recording (standalone app, no developer overlays)**

```powershell
npx expo run:android --variant release
```

The first build takes 5 to 10 minutes. After that, "Kyro" sits in the emulator's app drawer with its own icon and opens with no Expo menus or banners. If the build complains about the SDK location, set `ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk`, the same as for KyroApp.

### Recording

Use the emulator's own recorder: the **⋯** (Extended controls) button, then **Record and Playback → Start recording**. It saves a .webm or .gif. Or run `adb shell screenrecord /sdcard/kyro.mp4`, stop it with Ctrl+C, and then run `adb pull /sdcard/kyro.mp4`.

## Demo walkthrough (about 3 minutes)

The case follows the Loom script: a 17-year-old after a motorcycle crash at a district hospital with no CT and no signal. His GCS falls from 14 to 11.

| # | Screen | What to tap | What it shows |
|---|---|---|---|
| 1 | Splash | Wait, or tap | Models and the signed guideline bundle load on the phone, with no network |
| 2 | Home | **Start a new assessment** | Offline status, sync queue, recent cases |
| 3 | Voice intake | The **mic**, then wait about 15 s | Speech becomes a structured record as fields appear live |
| 4 | Read-back | **Confirm all**, then **Continue** | Kyro reads critical fields back. Numbers are never guessed |
| 5 | Missing info | **Equal & reactive**, **None**, **Continue** | Guidance stays locked while a decision-changing finding is missing |
| 6 | Your call first | **Prepare transfer**, **Fairly**, **Lock in** | The clinician commits before seeing Kyro, to counter automation bias |
| 7 | Tree walk | Wait | A deterministic guideline tree with a citation at every node and 0 model decisions |
| 8 | Guidance | Open 1 or 2 reasons, then **Show what to do now** | You vs Kyro, risk, why, and what Kyro will not decide |
| 8b | "That was quick" | Tap **Show what to do now** within 8 s without opening reasons | The automation-bias nudge. Show it on purpose, it's a key feature |
| 8c | What to do now | Wait ~3 s, open a source chip, tick **TXA** and **glucose**, then **Start neuro checks** | Kyro matches the patient to the library, then 8 steps with exact targets, doses and clocks (TXA by 20:45, 4-h window by 21:45), each with the verbatim passage it came from |
| 9 | Monitoring | **Record 45-minute check by voice** | GCS 14 → 11 triggers a deterioration alert |
| 10 | Re-run | **Re-run guideline tree**, then **Show what to do now** | The tree reaches a new leaf: lateralizing signs without imaging |
| 11 | Herniation protocol | Open the mannitol sources, adjust weight with −/+, tick a few steps, then **Send brief to neurosurgeon** | Doses scaled to weight (mannitol 15–60 g, ketamine 90–120 mg), criteria Kyro checks before each dose (mannitol is held if glucose wasn't checked), the 70-min pupil clock. Kyro still won't decide whether or where to operate |
| 12 | Handoff | Wait about 10 s | Queued offline, then the signal returns, the brief is delivered and the specialist replies |
| 12b | Specialist view | **Preview what the specialist sees** | Trend, two independent assessments, open questions |
| 13 | Summary | **Close case** | Audit trail of every step, synced and encrypted |
| - | How Kyro works | ⚙ on Home | The 3 layers, on-device models, signed bundle |

The Android back button and the ← arrow both go back. To restart, go Home and start a new assessment, which resets the case.

## Code map

- `App.tsx`: fonts and the screen registry
- `src/nav.tsx`: tiny stack navigator with slide transitions, and the encounter state
- `src/demoCase.ts`: **all scripted content** (transcript, fields, tree nodes, citations, readings, specialist reply). Edit text here.
- `src/guidelines.ts`: **the management plan**. Verbatim source passages (from the signed bundle `cloud/bundles/edh-core-v1.kyro` and the spine) and the per-patient steps, doses, gates and clocks built from them
- `src/logic.ts`: picks the guidance from the encounter (pupils and deterioration decide the leaf)
- `src/screens/*`: one file per screen
- `src/ui.tsx` and `src/theme.ts`: design system (Inter and IBM Plex Mono, Mission:Brain blue, navy)

Preview in a browser with `npx expo start --web` if you want to tweak copy quickly.
