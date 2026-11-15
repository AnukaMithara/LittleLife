# LittleLife

An offline-first desktop pet for macOS and Windows: Tauri 2 (Rust) shell, TypeScript + Vite frontend, a code-defined Canvas pixel engine. No framework, no database, no image assets.

## Commands

```bash
npm ci
npm run dev                 # browser preview at http://127.0.0.1:1420
npm run desktop             # native app (needs Rust; ~/.cargo/bin must be on PATH)
npm test                    # vitest unit tests
npm run build               # tsc --noEmit + vite build
npx playwright test         # browser end-to-end tests
cargo test --lib --manifest-path src-tauri/Cargo.toml
```

- Playwright needs Chromium. Without a download, point it at an installed browser:
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test`
- The app is single-instance. If an installed LittleLife is running, a dev build exits at once. Run beside it with
  `npx tauri dev --config '{"identifier":"io.github.anukamithara.littlelife.dev"}'`.
- `cargo test`/`cargo check` need `dist/` to exist; run `npm run build` first on a fresh clone.

## Layout

| Path | Role |
| --- | --- |
| `src/engine.ts` | Pure pet state and the `decide` behavior function |
| `src/mood.ts` | Activity category → the company that suits it |
| `src/reminders.ts` | Care reminders and their escalation, pure |
| `src/main.ts` | DOM, timers, persistence; wires everything together |
| `src/desktop.ts`, `src/roaming.ts` | Bridge to native commands and events |
| `src/pixel/` | Rig, pose clips, characters, Canvas player |
| `src-tauri/src/desktop.rs` | Window, tray, the `presence` thread, macOS panel/overlay |
| `src-tauri/src/motion.rs` | Pure movement across displays |
| `src-tauri/src/sense.rs` | Front app, sound, idle time → `Activity` |
| `src-tauri/src/placement.rs` | Saved window placement, pure |
| `e2e/native-mock.ts` | Fake Tauri IPC used by Playwright |

## Rules that are easy to break

- **Behavior logic stays pure and tested.** New decisions go in `engine.ts`, `mood.ts`, `reminders.ts`, `motion.rs` or `sense.rs` with tests, not in `main.ts` or `desktop.rs`.
- **The six `ACTIONS` are also the Jev allowlist** (`src/engine.ts`, `src-tauri/src/jev.rs`). Add visual variety as a pose, not a new action.
- **New poses must not clip.** `tests/pixel.test.ts` renders every character × pose × facing and fails if anything touches the canvas edge. Aster's shield usually needs an `attachments` entry in `src/pixel/art.ts`.
- **Never hold the `Desktop` session lock across a window call** in Rust. Window getters wait for the main thread, which may be waiting for that lock.
- **Roaming units differ by platform.** macOS uses logical points, Windows physical pixels (`units`, `place`, `roam_areas` in `desktop.rs`). Keep `motion.rs` unit-agnostic.
- **Native protocol changes touch four places:** the Rust command/event, `src/desktop.ts`, `e2e/native-mock.ts`, and the `generate_handler!` list in `lib.rs`.
- **Privacy is a feature.** Only the activity *category* may leave `sense.rs`; never app names or window titles. Nothing about the person's activity goes into Jev requests. Document any new observation in README → "What the desktop app looks at".
- Windows code cannot be built on a Mac here. Keep platform code in small `cfg` modules and say what was not compiled.

## Conventions

- Prettier formatting for TypeScript. Rust in this repo is written compactly and is not run through rustfmt; match the surrounding style.
- Versions live in `package.json`, `package-lock.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`; bump them together.
- Work on a feature branch and open a pull request; `main` is merged through PRs.
- **Commits are authored by the repository owner's git identity only.** Do not add `Co-Authored-By` trailers or "Generated with" lines for AI tools to commits or pull requests.
- Native behavior is only "verified" when checked on a real desktop. Record what was and was not checked in `docs/TESTING.md`.
