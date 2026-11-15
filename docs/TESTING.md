# Desktop acceptance checklist

Automated browser tests verify care actions, rest/wake, pause, rename and persistence, compact mode, reduced motion, unavailable storage, offline interaction after loading, and mobile layout. Pure engine tests cover state restoration and decision priorities.

Native behavior needs actual Windows and macOS verification. Do not mark an item complete from a browser screenshot or a successful compilation.

- [ ] `npm run desktop` launches without errors.
- [ ] The area around the companion is transparent and there is no opaque frame.
- [ ] The companion stays above a normal application window.
- [ ] Drag the heading to another part of the screen.
- [ ] Enter compact mode, drag the ↔ handle, and expand again.
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

Known first-milestone limitations: the overlay rectangle receives pointer events, cursor observation is local to the window, walking stays inside the window, there is no system-wide idle detection or signed distribution. Whole-window click-through is explicit and reversible through tray recovery.

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
- [ ] Preview all eight poses in front, side and rear views; verify equipment stays inside the logical canvas.
- [ ] Pause an active preview and enable OS/app reduced motion; the character must stay still.
- [ ] Enter compact mode on monitors with different scaling and check pixel edges remain sharp.
- [ ] Use pet/play/rest during a pose preview; automatic behavior should resume without resetting bond or energy.

The pose preview in PIXEL-ENGINE.md is generated from engine output. No reference image is loaded by the runtime.

## Desktop preview acceptance

- [ ] Install the matching Windows or Mac artifact and verify its BUILD.json commit and SHA256SUMS.
- [ ] Hide, show, compact, expand, reset placement and quit using the real native tray/menu-bar icon.
- [ ] Enable click-through, click underlying applications, then recover using Interact / restore clicks.
- [ ] Quit and relaunch from click-through; it must start with normal mouse interaction.
- [ ] Move near each monitor edge, quit/relaunch, and repeat with mixed DPI, negative monitor coordinates, changed resolution and a removed monitor.
- [ ] Start a second copy and reopen from the macOS Dock; the existing companion must return.
- [ ] Lock/deny configuration-directory writes; the UI must report unsaved window settings while remaining usable.
- [ ] Hide an enabled Jev companion and confirm no new requests are sent while hidden.

Geometry and IPC tests cover the policy and state transitions. Compilation, packaging and browser mocks do not replace these real OS checks.
