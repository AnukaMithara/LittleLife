# LittleLife roadmap

## Milestone 1: one little life

Implemented: Moss artwork and six animations; pet/play/rest; local state; quiet, pause, and reduced motion; browser preview; Tauri shell; compact mode; CI and tests.

Before calling this a desktop release, run the Windows and macOS checklist in TESTING.md. Native packaging and real desktop behavior are separate acceptance steps.

## Milestone 2: a reliable desktop neighbor

- Real Windows and macOS overlay testing, including transparent hit testing.
- Tray/menu recovery and a global shortcut before offering hidden or click-through modes.
- Remember and safely restore window position across monitor changes.
- Respect full-screen applications and presentations.
- Measure CPU, memory, and power use, including during extended idle periods.
- Signed Windows installers and signed/notarized macOS builds.

## Milestone 3: optional Jev behavior

- Verify the current official SDK and model contract before implementation.
- Let users enable Jev explicitly and supply their own API key.
- Store secrets using the native OS credential store, never localStorage.
- Send only the pet's state and explicitly enabled observations. No screenshots, application names, keystrokes, or documents.
- Accept only supported actions; reject malformed or stale results.
- Enforce action durations, request deadlines, cooldowns, and a visible usage budget.
- Continue playing offline when disabled, disconnected, rate limited, or out of credit.
- Keep local memory and personality changes understandable and resettable.

## Milestone 4: bring your own little friend

- Versioned character-pack manifest with supported actions and attribution/license.
- Local sprite-sheet import with frame rectangles, timing, anchors, and preview.
- Strict asset limits and no executable scripts in character packs.
- Document a reference pack before building a pack editor or gallery.

No accounts or hosted service are required for the core companion.
