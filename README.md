# LittleLife

**A little company for your everyday.**

An offline-first desktop companion for Windows and macOS. Meet **Moss**, an original little leaf spirit that blinks, wanders, naps, and gets very happy to see you.

This is the first working milestone, not a signed installer release. A personal open-source project by Anuka Mithara, licensed under MIT.

## What works

- Six animated states: idle, walk, sleep, jump, curious, and happy.
- Pet, play, rest, and wake interactions.
- Cursor reactions inside the companion window.
- Energy, bond, a custom name, and preferences saved locally.
- Quiet mode, pause, and reduced motion, including the operating system preference.
- A transparent, frameless, always-on-top Tauri window with a compact companion mode.
- A browser preview using the same character and behavior engine.
- No account, analytics, API key, or runtime network request.

Moss rests after two minutes without interaction **inside LittleLife**. This is not system-wide idle detection. Walking happens within the companion window. The app does not read your screen, track other applications, follow windows, or inspect global mouse/keyboard activity. The transparent rectangle still receives clicks; pixel-level click-through is not implemented.

## Try the browser preview

Install Node.js 22 LTS or newer, then:

```bash
npm ci
npm run dev
```

Open `http://localhost:1420`. Click Moss to pet them, or use the three action buttons. Open **Little settings** to rename Moss, pause, or change preferences. The arrow in the top-right switches to compact mode; use **Open little corner** or Escape to return.

On Windows PowerShell, use `npm.cmd` instead of `npm` if local script execution policy prevents npm.ps1 from running.

## Run the desktop app

Install the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS, including Rust stable. Windows needs the Microsoft C++ build tools and WebView2. macOS needs Xcode command line tools.

```bash
npm ci
npm run desktop
```

Drag the **YOUR LITTLE CORNER** heading to move the window. In compact mode, drag the ↔ handle. Use × to quit. There is no tray process left behind.

To build an installer on your own machine:

```bash
npm run tauri build
```

Build output appears in `src-tauri/target/release/bundle/`. Build on each target OS. macOS transparency uses Tauri's macOS private API support, so this configuration is intended for direct distribution rather than Mac App Store submission. Signing, notarization, auto-updates, and published binaries are not configured yet.

## Checks

```bash
npm test
npm run build
npx playwright install chromium
npx playwright test
```

If you already have Chromium installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path instead of downloading a browser. CI runs the behavior tests, production build, browser interaction tests, and Windows/macOS native compilation. Native compilation does not prove overlay behavior on a real desktop; see [the manual checklist](docs/TESTING.md).

## Small by design

The frontend uses TypeScript, Vite, original SVG artwork, and CSS animations. Tauri provides the desktop shell. There is no React, PixiJS, database, or animation framework to install for this first character.

| File | Responsibility |
| --- | --- |
| `src/engine.ts` | Pure decisions, state validation, needs, and interactions |
| `src/character.ts` | Original Moss artwork |
| `src/style.css` | Character animations and interface |
| `src/main.ts` | Input, UI, timing, and local persistence |
| `src/desktop.ts` | Small native window bridge |
| `src-tauri/` | Desktop configuration and Rust entry point |

The decision loop runs every six seconds, with a one-second needs tick. Animations run independently in CSS. Hidden webviews suspend simulation work. State is written every 15 seconds, on explicit interactions, and on page exit when available. Browser preview and desktop app have separate local storage. Clearing app/browser data resets your companion. If storage is blocked, the app stays usable and tells you the visit cannot be saved.

## Jev and character packs

Jev is **not integrated in this milestone**. The offline engine already selects from a finite action set, providing a small boundary for a future optional provider. The next milestone should add user-supplied credentials in the OS keychain, explicit opt-in, minimal observations, timeouts, rate limits, and automatic offline fallback. Never ship a shared API key in the frontend. No API cost is incurred by this version.

See [the roadmap](docs/ROADMAP.md) for Jev, community character packs, and native overlay improvements.

## Contributing

Keep offline behavior delightful before adding services. New decision logic belongs in the pure engine with tests; animation code should not call a model. Do not add remote assets, telemetry, global screen capture, or permissions without explaining the user-facing need. Submit changes as a pull request. Artwork and code in this repository are original project assets under the MIT license.
