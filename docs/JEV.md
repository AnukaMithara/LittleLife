# Optional Jev integration

The verified provider contract is the official [System One API](https://docs.typesafe.ai/api/system-one.md) and [Choice primitive](https://docs.typesafe.ai/primitives/choice.md), reviewed on 15 November 2026. The backend sends one `next_action` Choice question to `POST https://api.typesafe.ai/v1/systemone`, using bearer authentication and `jev-latest`. This alias may change over time.

The request is built in Rust, with an explicit observation struct that rejects additional fields. The response must identify a Choice, select one of the six supported actions, and have finite confidence within 0–1. Confidence below 0.35 falls back to local behavior. That threshold is an application choice, not a provider recommendation or a safety guarantee.

Keys are managed through [keyring 3.6.3](https://docs.rs/keyring/3.6.3/keyring/), explicitly enabling the Windows and Apple native stores. Other platforms reject setup rather than using the crate's mock store. The UI can save/delete a key and query whether it exists; no command returns the key. OS error details and HTTP response bodies are never sent to the UI or logs.

Native enforcement is independent of the webview: off by default; one in flight; at least 60 seconds between attempts; session cap default 20, user adjustable from 1–120; ten-second request timeout; TLS verification; fixed host; no redirects or automatic retries; 64 KiB response limit. Transient errors use increasing delays, and HTTP 429 waits at least five minutes. HTTP 401/403 and 400/422 disable Jev until the user enables it again. Keys stay saved across launches; enablement and usage counters do not.

The TypeScript coordinator applies results only while their interaction generation remains current and local care constraints allow them. The native generation also invalidates responses after configuration or credential changes. In-flight requests cannot be unsent when disabled. Their usage still counts, but their decisions are discarded.

## Validation boundary

- Pure TypeScript tests cover observation minimization, care priorities, one-in-flight behavior, cooldown/cap, late response rejection, backoff reconciliation, credential removal, and hidden error details.
- Browser tests mock the Tauri IPC boundary to exercise save/enable/use/remove, key input clearing, and absence from localStorage. The real browser preview never accepts a key.
- Rust tests cover request construction, observation validation, response parsing, native cooldown and session cap. CI compiles and tests on Windows and macOS.
- No real key is supplied by the repository, CI, or test fixtures. Live provider requests and actual OS credential-store persistence must be verified manually before a release.

This feature selects actions. It does not generate dialogue, control other applications, read screens, or introduce a hosted account system.
