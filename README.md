# LittleLife

**A little company for your everyday.**

An offline-first desktop companion for Windows and macOS. Meet **Moss**, an original little leaf spirit that blinks, wanders, naps, and gets very happy to see you. Its appearance is now drawn by a reusable pixel character engine.

This is a desktop preview, not a signed installer release. A personal open-source project by Anuka Mithara, licensed under MIT.

## What works

- Five original pixel characters with shared animations, including Wukong, who rides a golden cloud whenever he flies.
- **Bring your own character.** A character is one data-only JSON pack: add packs, share any character as a pack, and edit it. See [character packs](docs/CHARACTER-PACKS.md).
- A character workshop with palette controls, four directions, and sitting/waving pose previews.
- Pet, play, rest, and wake interactions.
- Cursor reactions inside the companion window.
- Energy, bond, a custom name, and preferences saved locally.
- Quiet mode, pause, and reduced motion, including the operating system preference.
- A transparent, frameless, always-on-top Tauri window with a compact companion mode.
- A browser preview using the same character and behavior engine.
- A character-only transparent companion that walks, flies or swims across every display: it leaves one screen and peeks in at the edge of another before coming in, follows you when you switch Spaces, drops to the floor when you let go of it, and looks up when your pointer comes close.
- It stays with you on every macOS Space, including beside full-screen applications, and over maximized windows on Windows.
- It keeps out of your way: beside code or writing, a video or a call it goes to the nearer bottom corner and sits there instead of wandering across your work. It dances when music plays behind your work, but not when the sound is a video in another window. It sleeps while you are away and is glad when you return.
- **Ask it things.** Right-click the character: Come here, Step aside, Take a nap, Play, Stay where you are. Sent aside, it waits in its corner and after a few minutes asks whether it may come back.
- Gentle reminders to drink water, rest your eyes and take a break. Ignore one and your friend gets annoyed, then properly cross, until you look after yourself.
- Clicks pass through the empty space around the character, so it never blocks the application underneath.
- Tray/menu-bar recovery, saved position/view mode, always-on-top, and explicit compact click-through.
- Downloadable Windows and Apple Silicon/Intel Mac test builds in GitHub Actions. Mac previews have ad-hoc bundle signatures; publisher signing/notarization remain pending.
- No account, analytics, or API key required for offline operation.
- Optional Jev decisions in the Windows/macOS app, using your own key in the OS credential store.

In the browser preview, Moss rests after two minutes without interaction inside the page, and reminders run on a plain timer. In the native app, character-only mode moves a small transparent window around all your displays. Expanded controls and browser previews keep movement inside the page. Movement pauses for quiet mode, reduced motion, rest and pause.

### What the desktop app looks at

To behave like company rather than a screensaver, the desktop app checks three things, a few times a minute, on your device only:

- which **kind** of application is in front (editor, music player, video player, call, browser and so on), from its name. On Windows the front window's title is also matched against a short list of video sites;
- whether **sound is playing**, whether something is **keeping the display awake** (a playing video does, music does not), and whether the front application **fills the screen** (macOS only);
- how long since the **keyboard or pointer was last used**, and where the pointer is, so the character can notice you and let clicks through.
- on macOS, **when you switch Spaces** and in which direction, so it can come after you.

Only the resulting category ("coding", "video", "away"…) reaches the interface. Application names and titles are compared against a built-in list and dropped; nothing is stored, logged or sent anywhere, and none of it is included in optional Jev requests. LittleLife never reads your screen, keystrokes, files or browser history. Turn it off with **Little settings → Desktop companion → Notice what I'm doing**; the companion then behaves the same whatever you do.

On macOS the app runs without a Dock icon so it can stay beside full-screen applications. Reach it through its menu-bar icon or by double-clicking the character.

## Download a desktop preview

See [test builds and desktop controls](docs/TEST-BUILDS.md) for Windows setup/portable downloads, Apple Silicon/Intel DMGs, tray recovery, and the remaining unsigned-build limitations.

## Try the browser preview

Install Node.js 22 LTS or newer, then:

```bash
npm ci
npm run dev
```

Open `http://localhost:1420`. Click Moss to pet them, or use the three action buttons. Open **Little settings** to rename Moss, pause, or change preferences. The arrow in the top-right switches to compact mode; double-click/right-click the character or press Escape to return.

On Windows PowerShell, use `npm.cmd` instead of `npm` if local script execution policy prevents npm.ps1 from running.

## Run the desktop app

Install the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS, including Rust stable. Windows needs the Microsoft C++ build tools and WebView2. macOS needs Xcode command line tools.

```bash
npm ci
npm run desktop
```

Drag the **YOUR LITTLE CORNER** heading to move the window. In compact mode, drag the character itself. Double-click/right-click it or use **Open LittleLife** in the tray to open controls. Choose Walking, Flying or Swimming in **Little settings → Desktop companion**. Use × or **Quit LittleLife** in the tray to exit. **Hide to tray** leaves the companion available through its tray/menu-bar icon.

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
| `src/mood.ts` | What the person seems to be doing, and the company that suits it |
| `src/reminders.ts` | Care reminders, patience and escalation |
| `src/waiting.ts` | A companion sent aside, and when it asks to come back |
| `src/character.ts` | Logical Canvas mount |
| `src/pixel/` | Character definitions, pixel composition, pose clips, palettes and playback |
| `src/style.css` | Character animations and interface |
| `src/main.ts` | Input, UI, timing, and local persistence |
| `src/desktop.ts` | Native commands, state events and tray synchronization |
| `src-tauri/src/motion.rs` | Walking, flying and swimming across displays |
| `src-tauri/src/spaces.rs` | Notices macOS Space changes and their direction |
| `src-tauri/src/sense.rs` | Front application, sound and idle time, reduced to a category |
| `src-tauri/src/desktop.rs` | Window, tray, movement thread, click pass-through and full-screen overlay |

The decision loop runs every six seconds, with a one-second needs tick. Pixel animations run independently in the Canvas player. Hidden webviews suspend simulation work. State is written every 15 seconds, on explicit interactions, and on page exit when available. Browser preview and desktop app have separate local storage. Clearing app/browser data resets your companion. If storage is blocked, the app stays usable and tells you the visit cannot be saved.

## Pixel characters

Click **Characters ↗** to choose a look and preview its poses. The default Moss, silver-haired Ember, armored Aster, crowned Surya and cloud-riding Wukong use the same engine and action set. Wukong has his own flying and cruising animations and prefers to fly. **Add a character…** in the same panel brings in a [character pack](docs/CHARACTER-PACKS.md). No character image files are loaded. Your pet's bond and energy stay intact when changing appearance.

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
