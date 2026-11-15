# LittleLife roadmap

## Milestone 1: one little life

Implemented: Moss artwork and six animations; pet/play/rest; local state; quiet, pause, and reduced motion; browser preview; Tauri shell; compact mode; CI and tests.

Before calling this a desktop release, run the Windows and macOS checklist in TESTING.md. Native packaging and real desktop behavior are separate acceptance steps.

## Milestone 2: optional Jev behavior

Implemented: native OS key storage; explicit per-session enablement; a finite action allowlist; minimal pet observations; native cooldown, request cap and one-in-flight enforcement; timeouts, error backoff and offline fallback; stale-response rejection; usage display and key removal.

Protocol/decoder tests and mocked IPC tests do not prove a live TypeSafe account works. A user-supplied key and hands-on Windows/macOS credential-store checks remain release acceptance items. See JEV.md.

## Milestone 3: a reliable desktop neighbor

- Real Windows and macOS overlay testing, including transparent hit testing.
- Tray/menu recovery and a global shortcut before offering hidden or click-through modes.
- Remember and safely restore window position across monitor changes.
- Respect full-screen applications and presentations.
- Measure CPU, memory, and power use, including during extended idle periods.
- Signed Windows installers and signed/notarized macOS builds.
- Additional local personality traits, understandable memory, and reset controls.

## Milestone 4: bring your own little friend

- Versioned character-pack manifest with supported actions and attribution/license.
- Local sprite-sheet import with frame rectangles, timing, anchors, and preview.
- Strict asset limits and no executable scripts in character packs.
- Document a reference pack before building a pack editor or gallery.

No accounts or hosted service are required for the core companion.
