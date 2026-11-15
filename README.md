# LittleLife

**A little company for your everyday.**

An offline-first desktop companion for Windows and macOS. Meet **Moss**, an original little leaf spirit that blinks, wanders, naps, and gets very happy to see you. Its appearance is now drawn by a reusable pixel character engine.

This is a desktop preview, not a signed installer release. A personal open-source project by Anuka Mithara, licensed under MIT.

## What works

- Four original pixel characters with shared idle, walk, sleep, jump, curious, and happy animations.
- A character workshop with palette controls, four directions, and sitting/waving pose previews.
- Pet, play, rest, and wake interactions.
- Cursor reactions inside the companion window.
- Energy, bond, a custom name, and preferences saved locally.
- Quiet mode, pause, and reduced motion, including the operating system preference.
- A transparent, frameless, always-on-top Tauri window with a compact companion mode.
- A browser preview using the same character and behavior engine.
- Tray/menu-bar recovery, saved position/view mode, always-on-top, and explicit compact click-through.
- Downloadable unsigned Windows and Apple Silicon/Intel Mac test builds in GitHub Actions.
- No account, analytics, or API key required for offline operation.
- Optional Jev decisions in the Windows/macOS app, using your own key in the OS credential store.

Moss rests after two minutes without interaction **inside LittleLife**. This is not system-wide idle detection. Walking happens within the companion window. The app does not read your screen, track other applications, follow windows, or inspect global mouse/keyboard activity. Normal mode receives pointer events across its window. Optional compact click-through passes all clicks through the entire window, including the character, until restored from the tray. Pixel-level hit testing is not implemented.

## Download a desktop preview

See [test builds and desktop controls](docs/TEST-BUILDS.md) for Windows setup/portable downloads, Apple Silicon/Intel DMGs, tray recovery, and the remaining unsigned-build limitations.

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

Drag the **YOUR LITTLE CORNER** heading to move the window. In compact mode, drag the ↔ handle. Use × or **Quit LittleLife** in the tray to exit. **Hide to tray** leaves the companion available through its tray/menu-bar icon.

To build an installer on your own machine:

```bash
npm run tauri build
```

Build output appears in `src-tauri/target/release/bundle/`. Build on each target OS. macOS transparency uses Tauri's macOS private API support, so this configuration is intended for direct distribution rather than Mac App Store submission. CI produces downloadable test installers. Signing, notarization, auto-updates, and published GitHub releases are not configured yet.

## Checks

```bash
npm test
npm run build
npx playwright install chromium
npx playwright test
```

If you already have Chromium installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path instead of downloading a browser. CI runs the behavior tests, production build, browser interaction tests, and Windows/macOS native compilation and Rust tests. Native compilation does not prove overlay behavior on a real desktop; see [the manual checklist](docs/TESTING.md).

## Small by design

The frontend uses TypeScript, Vite, and a small Canvas pixel engine. Characters are assembled from code-defined colored layers and reusable pose clips. Tauri provides the desktop shell. There is no React, PixiJS, database, imported sprite sheet, or animation framework.

| File | Responsibility |
| --- | --- |
| `src/engine.ts` | Pure decisions, state validation, needs, and interactions |
| `src/character.ts` | Logical Canvas mount |
| `src/pixel/` | Character definitions, pixel composition, pose clips, palettes and playback |
| `src/style.css` | Character animations and interface |
| `src/main.ts` | Input, UI, timing, and local persistence |
| `src/desktop.ts` | Native commands, state events and tray synchronization |
| `src-tauri/` | Desktop configuration and Rust entry point |

The decision loop runs every six seconds, with a one-second needs tick. Pixel animations run independently in the Canvas player. Hidden webviews suspend simulation work. State is written every 15 seconds, on explicit interactions, and on page exit when available. Browser preview and desktop app have separate local storage. Clearing app/browser data resets your companion. If storage is blocked, the app stays usable and tells you the visit cannot be saved.

## Pixel characters

Click **Characters ↗** to choose a look and preview its poses. The default Moss, silver-haired Ember, armored Aster and crowned Surya use the same engine and action set. No character image files are loaded. Your pet's bond and energy stay intact when changing appearance.

See [the pixel engine guide](docs/PIXEL-ENGINE.md) for authoring new characters and the generated pose preview.

## Jev and character packs

Jev is optional and **off at every app launch**. The browser preview remains offline; API setup is available only in the Windows/macOS desktop app.

1. Open **Little settings → Optional Jev behavior**.
2. Paste your own TypeSafe API key and click **Save key**. The input is cleared; the key is stored in Windows Credential Manager or macOS Keychain, never localStorage.
3. Choose a session request cap (default 20, maximum 120), then enable **Jev this session**. This explicitly permits the listed pet observations to be sent to TypeSafe.
4. Use **Remove saved key** to disable Jev and delete its credential.

Requests run in Rust against the fixed official TypeSafe endpoint. Only energy, bond, seconds since interaction inside LittleLife, a cursor-nearby boolean, and the last supported action leave the app. Names, screen contents, other applications, and documents are excluded. Calls happen at most once per minute, with one in flight, a ten-second network deadline, and no automatic retries. Failures back off; authentication failures disable the provider. Local behavior keeps running throughout.

The visible cap counts **attempts per app session**, including failed calls; toggling Jev or changing the key does not reset it. Restarting the app resets the cap and counters and requires enabling Jev again. This is a request cap, not a monetary spending guarantee. Token usage is reported when the provider returns a readable usage response. Provider charges may apply. Disabling Jev stops new requests; an already transmitted request may finish and be billed, but its action is discarded.

The app rejects unknown/uncertain choices and ignores delayed results after direct interaction, pause, rest, settings changes, or hiding. Quiet mode, reduced motion, low energy, and inactivity retain priority. See [the integration notes](docs/JEV.md) for the verified protocol and test coverage.

See [the roadmap](docs/ROADMAP.md) for Jev, community character packs, and native overlay improvements.

## Contributing

Keep offline behavior delightful before adding services. New decision logic belongs in the pure engine with tests; animation code should not call a model. Do not add remote assets, telemetry, global screen capture, or permissions without explaining the user-facing need. Submit changes as a pull request. Artwork and code in this repository are original project assets under the MIT license.
