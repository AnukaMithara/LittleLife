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

Known first-milestone limitations: the overlay rectangle receives pointer events, cursor observation is local to the window, walking stays inside the window, window position is not persisted, and there is no tray recovery, system-wide idle detection, Jev provider, or signed distribution.
