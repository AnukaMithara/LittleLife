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
- **Compact companion** shows the smaller character window.
- **Interact / restore clicks** disables click-through and brings the current view forward.
- **Hide companion** keeps the app in the tray. Hidden companions stop their frontend simulation and do not start Jev requests.
- **Reset position to primary display** rescues a companion after a monitor is removed.
- **Quit LittleLife** exits the process.

The in-app × buttons still mean **Quit**, so they exit rather than merely hiding. OS close requests hide to the tray when one is available. Opening a second instance restores the existing one instead of creating another companion. On macOS, reopening from the Dock also restores interaction.

Under **Little settings → Desktop companion**, you can change always-on-top, hide, reset placement, or choose **Compact and let clicks pass through**. Click-through covers the **entire compact window**, including the character; this phase does not perform pixel-level hit testing. Return through the tray's Interact command to pet or drag again. If the tray cannot be created, hiding and click-through are disabled. Click-through is never saved or enabled on startup.

## Position persistence

`desktop-v1.json` in the OS application configuration directory stores the selected view mode, always-on-top preference, monitor identity/origin, and normalized position within its work area. Moves are debounced before saving; quit flushes the newest state. The file contains no credentials and is separate from the pet's browser/WebView local storage.

Saved anchors adapt to resolution and display-scale changes. Missing monitors fall back to the primary display. Window dimensions are limited to the available work area, and placement is repaired on startup, mode changes, display-scale events and tray recovery. Monitor disconnection while idle may still require **Open LittleLife** or **Reset position** from the tray. There is no global cursor polling or screen capture.

If window preferences cannot be written, the app stays usable and the settings panel reports that the session cannot be saved. Actual native tray interaction, mixed-DPI placement, installation/uninstallation and extended idle power use still need the checks in [TESTING.md](TESTING.md).

## Local packaging

After installing the prerequisites:

```bash
npm ci
npm run tauri build
```

Build on the target OS. CI uses an NSIS Windows installer and separate Apple Silicon/Intel DMG jobs. The packager fails if no installer is produced; artifacts are uploaded only after the native tests succeed.
