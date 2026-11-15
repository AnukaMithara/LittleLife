# Desktop acceptance checklist

Automated browser tests verify care actions, rest/wake, pause, rename and persistence, compact mode, reduced motion, unavailable storage, offline interaction after loading, and mobile layout. Pure engine tests cover state restoration and decision priorities.

Native behavior needs actual Windows and macOS verification. Do not mark an item complete from a browser screenshot or a successful compilation.

- [ ] `npm run desktop` launches without errors.
- [ ] The area around the companion is transparent and there is no opaque frame.
- [ ] The companion stays above a normal application window.
- [ ] Drag the heading to another part of the screen.
- [ ] Enter compact mode, verify only the character is visible with wallpaper around it, drag the character, and double-click/right-click it to reopen controls.
- [ ] Resize near the screen edges; expansion remains within the monitor work area.
- [ ] Repeat on an external monitor with different display scaling.
- [ ] Pet, play, rest, wake, and cursor curiosity animate without visual artifacts.
- [ ] Pause stops needs and animation; resume restores interaction.
- [ ] OS reduced motion and the app setting disable movement animations.
- [ ] Rename and change settings, quit, and relaunch; preferences survive.
- [ ] Disconnect the network; interaction continues.
- [ ] Quit from both expanded and compact modes; no background process remains.
- [ ] Build an installer, install it, launch it, and uninstall it.
- [ ] Measure idle CPU/memory and record device/OS/version, rather than assuming low usage.

Known limitations: no signed distribution, no sound detection on Windows, and no overlay above exclusive full-screen games. Whole-window click-through is explicit and reversible through tray recovery.

## Optional Jev acceptance

- [ ] Save a test key and verify it appears only in the native OS credential store, not browser/app storage or logs.
- [ ] Enable Jev, observe a successful real provider decision and usage count, then disconnect the network and verify offline behavior continues.
- [ ] Confirm a rejected key disables Jev and the request cap/cooldown stop additional calls.
- [ ] Remove the key, relaunch, and verify the key is absent and Jev is off.
- [ ] Disable or pet/pause during a slow request; its late action must not replace the user's interaction.
- [ ] Lock or deny OS credential-store access; the UI must explain the failure and keep offline care usable.

Browser IPC mocks and Rust response fixtures use no real API credentials. A live provider round trip and native credential-store persistence are still manual acceptance checks.

## Pixel character acceptance

- [ ] Switch among all four characters, recolor them, close/relaunch, and verify saved appearance.
- [ ] Preview all twelve poses in front, side and rear views; verify equipment stays inside the logical canvas.
- [ ] Pause an active preview and enable OS/app reduced motion; the character must stay still.
- [ ] Enter compact mode on monitors with different scaling and check pixel edges remain sharp.
- [ ] Use pet/play/rest during a pose preview; automatic behavior should resume without resetting bond or energy.

The pose preview in PIXEL-ENGINE.md is generated from engine output. No reference image is loaded by the runtime.

## Desktop preview acceptance

- [ ] Install the matching Windows or Mac artifact and verify its BUILD.json commit and SHA256SUMS.
- [ ] On macOS, verify the copied app with `codesign --verify --deep --strict --verbose=2 /Applications/LittleLife.app`; distinguish unverified-developer approval from a failed signature or damaged-app warning.
- [ ] Hide, show, compact, expand, reset placement and quit using the real native tray/menu-bar icon.
- [ ] Enable click-through, click underlying applications, then recover using Interact / restore clicks.
- [ ] Quit and relaunch from click-through; it must start with normal mouse interaction.
- [ ] Move near each monitor edge, quit/relaunch, and repeat with mixed DPI, negative monitor coordinates, changed resolution and a removed monitor.
- [ ] Start a second copy and reopen from the macOS Dock; the existing companion must return.
- [ ] Lock/deny configuration-directory writes; the UI must report unsaved window settings while remaining usable.
- [ ] Hide an enabled Jev companion and confirm no new requests are sent while hidden.

Geometry and IPC tests cover the policy and state transitions. Compilation, packaging and browser mocks do not replace these real OS checks.

## Roaming acceptance

- [ ] Walk across the desktop, switch to Flying and Swimming, and verify distinct animation and paths.
- [ ] At a work-area edge the walker turns, or walks out and returns from the other side; it is never left out of sight when it stops.
- [ ] With two or more displays (side by side, stacked, mixed scaling, negative coordinates), each movement style eventually visits every display.
- [ ] Every arrival on a display starts with a pause half in view, in the curious pose, never a sudden appearance.
- [ ] Swipe between macOS Spaces in both directions; the companion comes in from the left after moving right and from the right after moving left. With two displays it arrives on the one under the pointer, and never across the edge the displays share.
- [ ] Asleep, paused, resting, in quiet mode or with reduced motion, it does not chase you between Spaces.
- [ ] Drag the character into the air and release it in walking mode; it falls to the floor and walks on. A long drag is never interrupted.
- [ ] Open another application full screen (macOS) or maximized (Windows); the companion is still there, and clicking it does not take focus.
- [ ] Click through the transparent space around the character into the application underneath; the character itself and a visible speech bubble still take clicks.
- [ ] Bring the pointer close from anywhere on the desktop; the character stops and looks curious.
- [ ] Pause, rest, quiet mode, reduced motion and Hide stop both visible motion and new native movement requests.
- [ ] Dragging stays under user control; expanding stops roaming; restarting preserves the selected style and roaming preference.
- [ ] Transparent surroundings remain transparent after compact/expand cycles, and the panel/speech/buttons never appear in companion mode.

Browser tests verify CSS transparency, controls, and mocked native movement requests. Rust tests verify movement across single, side-by-side, stacked and mixed-scale display layouts. These do not replace native macOS/Windows compositor and movement acceptance.

Checked by hand on one Mac (macOS 27, a single 1680 × 1050 display, 0.2.0 development build): the companion appears in another application's full-screen Space, walks along the bottom, wraps from the right edge to the left, follows Space changes from the correct side with a pause half in view, and the pointer and window coordinates used for click pass-through agree with the system's. Not yet checked on real hardware: more than one display, Windows, and clicking through by hand.

## Company and reminder acceptance

- [ ] Play a video full screen, then in a window while typing elsewhere, then play only music; the companion sits in a corner for the first, sits without dancing for the second and dances for the third.
- [ ] While it keeps to a corner it never crosses subtitles, a terminal prompt or the text being typed.
- [ ] Right-click the character; every menu item does what it says, and the labels follow its state.
- [ ] Step aside, wait four minutes, answer Not yet, wait eight more, then Come on out.
- [ ] At both screen edges and while it peeks in, the word cloud is fully readable or held back, never cut off.

- [ ] Bring an editor, a music player, a video player and a call to the front in turn; within a few seconds the behavior matches the table in TEST-BUILDS.md.
- [ ] Leave the computer for five minutes; the character sleeps, then greets you on return.
- [ ] Turn off **Notice what I'm doing**; behavior no longer changes with the front application.
- [ ] Set a five-minute water reminder. Answer with the character, with Done and with Later; ignore one for five minutes and confirm the annoyed and angry stages, then make up.
- [ ] Start a reminder, then step away for three minutes; break and eye reminders clear on return without anger.
- [ ] Reminders do not appear during a call or a video, and arrive afterwards.
- [ ] With reduced motion on, the angry bubble does not shake.
