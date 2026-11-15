# Desktop test builds

The **Check LittleLife** workflow builds downloadable preview artifacts for every pull request and update to main. You do not need Node or Rust to run these packaged builds.

1. Open [GitHub Actions](https://github.com/AnukaMithara/LittleLife/actions/workflows/ci.yml).
2. Choose a successful run for the branch/commit you intend to test.
3. Download the matching artifact from **Artifacts** at the bottom of the run. GitHub may require sign-in.

| Artifact | Intended device | Contents |
| --- | --- | --- |
| `LittleLife-test-windows-x64` | Windows with an Intel/AMD 64-bit CPU | Setup EXE, portable EXE, build metadata and checksums |
| `LittleLife-test-macos-arm64` | Mac with Apple Silicon | DMG, build metadata and checksums |
| `LittleLife-test-macos-x64` | Intel Mac | DMG, build metadata and checksums |

Artifacts expire after 14 days. A workflow run is not a published GitHub release. `BUILD.json` records the checked-out source commit; `SHA256SUMS` records file hashes for integrity, not a signing identity.

These are **test builds without an authenticated publisher identity or notarization**. macOS 0.1.1 and later use an ad-hoc app signature to seal the bundle; this is not Apple Developer ID signing. CI mounts each finished DMG read-only and verifies its checksum, the embedded app signature, bundle identity and CPU architecture before uploading it. Windows previews remain unsigned. Developer ID signing, notarization and automatic updates are not configured. No private signing certificate, account, API key, or provider credential is bundled.

For a trusted Mac preview that reports an **unidentified developer** or **Apple cannot check** prompt, follow [Apple's per-app Privacy & Security → Open Anyway process](https://support.apple.com/en-us/102445). Ad-hoc signing does not remove that approval step. A **damaged** warning is different: discard the old download and use a fresh 0.1.1-or-newer artifact. Do not treat a failed signature check as normal developer verification.

After copying to Applications, this read-only check should succeed:

```bash
codesign --verify --deep --strict --verbose=2 /Applications/LittleLife.app
```

If it fails, keep the error output for diagnosis and download a fresh artifact matching your Mac's CPU. Do not disable Gatekeeper globally. The old 0.1.0 previews lacked configured bundle signing and did not verify embedded signatures in CI. A successful signature check verifies integrity; it does not prove notarization or guarantee Gatekeeper approval.

On Windows, prefer the setup EXE. It can install WebView2 when needed; that step may require a network connection. The portable EXE needs WebView2 already installed. On macOS, copy the matching DMG's LittleLife app to Applications. Jev remains optional and off at launch.

## Desktop controls

Use the LittleLife tray icon on Windows or menu-bar icon on macOS:

- **Open LittleLife** opens the full corner and restores mouse interaction.
- **Compact companion** shows only the character, without a panel, speech bubble or button bar. New installations start in this mode.
- **Walk / Fly / Swim around the desktop** selects a movement style and enters companion mode. **Pause / resume roaming** controls desktop movement.
- **Interact / restore clicks** disables click-through and brings the current view forward.
- **Hide companion** keeps the app in the tray. Hidden companions stop their frontend simulation and do not start Jev requests.
- **Reset position to primary display** rescues a companion after a monitor is removed.
- **Quit LittleLife** exits the process.

Double-click the character or press Escape to open the full controls; drag the character to reposition it. **Right-click the character** for its own menu:

- **Come here** brings it over to the pointer, from another display if need be.
- **Step aside** sends it to the nearer bottom corner to wait. After four minutes it asks whether it may come back. **Not yet** (or no answer) makes it wait twice as long before asking again, up to twenty minutes; **Come on out**, or simply petting it, sets it free. The menu item becomes **Come back out**.
- **Take a nap / Wake up**, **Play**, and **Stay where you are / Roam freely**.
- **Open little corner…** opens the full controls. The expanded in-app × button means **Quit**, so they exit rather than merely hiding. OS close requests hide to the tray when one is available. Opening a second instance restores the existing one instead of creating another companion. On macOS, reopening from the Dock also restores interaction.

Under **Little settings → Desktop companion**, you can select Walking/Flying/Swimming, enable or disable roaming, change always-on-top, hide, reset placement, or choose **Compact and let clicks pass through**. Ordinarily only the character itself (and a speech bubble while one shows) takes clicks; the transparent space around it lets them through. This explicit click-through goes further and covers the **entire compact window**, including the character. Return through the tray's Interact command to pet or drag again. If the tray cannot be created, hiding and click-through are disabled. Click-through is never saved or enabled on startup.

## Desktop roaming

In native companion mode, a background thread moves the 200 × 236 logical-pixel transparent window about thirty times a second while the behavior engine is exploring, and sleeps otherwise. Walking follows the bottom of the work area, flying heads for random spots, and swimming drifts along a gentle wave.

- **Between displays.** A walker crosses straight onto a display beside the current one. At an edge with nothing beside it, it sometimes walks out of sight and comes back from the other side, or on another display. Flying and swimming simply set off for a spot on another display now and then.
- **Arriving.** It never simply pops into view. Coming onto a display it stops half way in, looks around for a second or two, then comes in. Walking onto the display beside it, it pauses astride the shared edge the same way.
- **Following you.** When you move to another macOS Space, it steps out of sight and comes in after you from the side you came from, on the display your pointer is on. A sleeping, paused, resting or quiet companion stays where it is, as it does with reduced motion.
- **Being carried.** Drag the character anywhere. Let go in walking mode and it drops to the floor and carries on.
- **Stopping.** Asked to stop while half out of view or in the air, it finishes coming back first, so it is never left parked off-screen.
- **Full screen.** On macOS the window is a non-activating panel on every Space, so it appears beside full-screen applications and clicking it does not take focus from your work. The app therefore has no Dock icon. On Windows it stays above maximized windows; exclusive full-screen games draw over everything and are not covered.
- **Clicks.** About eight times a second the pointer position is compared with the character's box. Outside it, the window ignores the mouse entirely.

Movement stops for pause, rest, quiet mode, reduced motion, hidden windows, pose previews, an active reminder and a nearby pointer. Expanded controls and browser previews do not move a native window. There is no screen inspection and no simulated keyboard or mouse input.

## Fitting company and reminders

Every four seconds the desktop app reduces the front application, playing sound (macOS) and idle time to one category; see **What the desktop app looks at** in the README for exactly what is read and how to turn it off.

| You are… | Your friend… |
| --- | --- |
| coding, writing or designing | goes to the nearer bottom corner and sits quietly |
| …with music on | dances there |
| …with a video on in another window | sits, without dancing |
| playing music, or browsing with music on | roams and dances, livelier |
| watching a video | sits in the corner and watches; reminders wait |
| in a call | stays in the corner, still and silent; reminders wait |
| away for five minutes | falls asleep, and greets you when you return |

A video is told from music by the display: playback that keeps the screen awake, fills the screen, or is left untouched for twenty seconds is being watched. Keep-awake utilities are ignored. If you move the companion while it is keeping to its corner, it stays where you put it.

Words appear in a cloud above its head only once it has arrived, and the cloud shifts and narrows to stay on the screen when the character stands at an edge.

Reminders are set under **Little settings → Gentle reminders**: water every 45 minutes, eyes every 20 and a break every 50 by default, each adjustable from 5 to 240 minutes or 0 for off. Click the character or **Done** once you have done it; **Later** asks again in ten minutes. After two ignored minutes the request turns annoyed, after five it turns angry: the character stomps, **Later** disappears and the bond drops a little. Three minutes away from keyboard and pointer counts as the break and the eye rest. Time spent away, in a call or watching something never counts as ignoring.

Sound detection is not implemented on Windows, where music is recognized only when a music player is the front application.

## Position persistence

`desktop-v1.json` in the OS application configuration directory stores the selected view mode, roaming enablement/movement style, the activity-awareness choice, always-on-top preference, monitor identity/origin, and normalized position within its work area. Moves are debounced before saving; quit flushes the newest state. The file contains no credentials and is separate from the pet's browser/WebView local storage.

Saved anchors adapt to resolution and display-scale changes. Missing monitors fall back to the primary display. Window dimensions are limited to the available work area, and placement is repaired on startup, mode changes, display-scale events and tray recovery. Monitor disconnection while idle may still require **Open LittleLife** or **Reset position** from the tray. There is no screen capture.

If window preferences cannot be written, the app stays usable and the settings panel reports that the session cannot be saved. Actual native tray interaction, mixed-DPI placement, installation/uninstallation and extended idle power use still need the checks in [TESTING.md](TESTING.md).

## Local packaging

After installing the prerequisites:

```bash
npm ci
npm run tauri build
```

Build on the target OS. CI uses an NSIS Windows installer and separate Apple Silicon/Intel DMG jobs. The packager fails if no installer is produced; artifacts are uploaded only after the native tests succeed.
