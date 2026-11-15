# LittleLife roadmap

## Milestone 1: one little life

Implemented: Moss artwork and six animations; pet/play/rest; local state; quiet, pause, and reduced motion; browser preview; Tauri shell; compact mode; CI and tests.

Before calling this a desktop release, run the Windows and macOS checklist in TESTING.md. Native packaging and real desktop behavior are separate acceptance steps.

## Milestone 2: optional Jev behavior

Implemented: native OS key storage; explicit per-session enablement; a finite action allowlist; minimal pet observations; native cooldown, request cap and one-in-flight enforcement; timeouts, error backoff and offline fallback; stale-response rejection; usage display and key removal.

Protocol/decoder tests and mocked IPC tests do not prove a live TypeSafe account works. A user-supplied key and hands-on Windows/macOS credential-store checks remain release acceptance items. See JEV.md.

## Milestone 3: a reliable desktop neighbor

- Real Windows and macOS overlay testing, including transparent hit testing.
- Implemented: tray/menu recovery, explicit whole-window click-through, hide/show and single-instance restoration. A global shortcut remains optional follow-up.
- Implemented: debounced placement/view/always-on-top persistence, scale-aware layout, removed-monitor fallback and tray reset.
- Respect full-screen applications and presentations.
- Measure CPU, memory, and power use, including during extended idle periods.
- Implemented: unsigned Windows setup/portable artifacts and Apple Silicon/Intel DMGs with ad-hoc bundle signatures and embedded-signature verification. Signed/notarized public distribution remains a release step.
- Additional local personality traits, understandable memory, and reset controls.

## Pixel engine: implemented

Code-defined pixel parts and a shared rig now drive four original characters, four facings, eight pose clips, expression variants, outfit/accent palettes, integer Canvas scaling, and saved appearance. The workshop previews poses without changing the behavioral engine. See PIXEL-ENGINE.md.

## Bring your own little friend: future imports

- Versioned character-pack manifest with supported actions and attribution/license.
- Validated import/export of code-independent pixel-grid character data, with asset bounds and licenses.
- Strict asset limits and no executable scripts in character packs.
- Build a freehand pixel/part editor only after the pack contract is established.

No accounts or hosted service are required for the core companion.
