import { invoke } from "@tauri-apps/api/core";
import {
  ACTIONS,
  type Action,
  type PetState,
  type Observation,
} from "./engine";

export interface JevStatus {
  enabled: boolean;
  hasKey: boolean;
  supported: boolean;
  limit: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  retryAfterSeconds: number;
}
export interface JevObservation {
  energy: number;
  affection: number;
  idleSeconds: number;
  cursorNearby: boolean;
  lastAction: Action;
}
export interface JevDecision {
  action: Action;
  status: JevStatus;
}
export interface JevBridge {
  status(): Promise<JevStatus>;
  configure(enabled: boolean, limit: number): Promise<JevStatus>;
  saveKey(key: string): Promise<JevStatus>;
  forgetKey(): Promise<JevStatus>;
  decide(observation: JevObservation): Promise<JevDecision>;
}
export const nativeJev: JevBridge = {
  status: () => invoke("jev_status"),
  configure: (enabled, limit) => invoke("jev_configure", { enabled, limit }),
  saveKey: (key) => invoke("jev_save_key", { key }),
  forgetKey: () => invoke("jev_forget_key"),
  decide: (observation) => invoke("jev_decide", { observation }),
};
export const OFFLINE_STATUS: JevStatus = {
  enabled: false,
  hasKey: false,
  supported: false,
  limit: 20,
  requests: 0,
  inputTokens: 0,
  outputTokens: 0,
  retryAfterSeconds: 0,
};
export const jevMessages: Record<string, string> = {
  hidden: "Jev rests while the companion is hidden.",
  offline: "Jev is unreachable. Your friend continues offline.",
  authentication: "The API key was rejected. Jev has been turned off.",
  rate_limited:
    "TypeSafe asked us to slow down. Continuing offline for at least five minutes.",
  request_rejected: "TypeSafe rejected this request. Jev has been turned off.",
  storage:
    "The OS credential store is unavailable. No key was saved in the app.",
  invalid_key: "Enter a valid API key without spaces.",
  no_key: "Save your API key before enabling Jev.",
  unsupported:
    "Secure Jev setup is available in the Windows and macOS desktop app.",
  invalid_response: "Jev returned an unsupported response. Continuing offline.",
  uncertain: "Jev was unsure. Your friend is deciding locally.",
  budget: "The session request cap has been reached. Continuing offline.",
};
export function canAskJev(
  pet: PetState,
  observation: Observation,
  resting: boolean,
): boolean {
  return (
    !observation.paused &&
    !resting &&
    !pet.quiet &&
    !pet.reducedMotion &&
    pet.energy >= 24 &&
    observation.idleSeconds < 120
  );
}
export function jevObservation(
  pet: PetState,
  observation: Observation,
  action: Action,
): JevObservation {
  // Explicit allowlist: names, settings, documents and other apps never enter the request.
  return {
    energy: pet.energy,
    affection: pet.affection,
    idleSeconds: Math.max(
      0,
      Math.min(119, Math.floor(observation.idleSeconds)),
    ),
    cursorNearby: observation.cursorNearby,
    lastAction: action,
  };
}

/** The offline loop never awaits this coordinator. Native code also enforces every limit. */
export class JevController {
  status: JevStatus = { ...OFFLINE_STATUS };
  message = "Offline behavior is always available.";
  private generation = 0;
  private pending = false;
  private nextRequest = 0;
  constructor(
    private bridge: JevBridge,
    private changed: () => void = () => {},
    private now = Date.now,
  ) {}
  invalidate() {
    this.generation++;
  }
  async refresh() {
    const generation = this.generation;
    const status = await this.bridge.status();
    if (generation !== this.generation) return;
    this.status = status;
    this.nextRequest = Math.max(
      this.nextRequest,
      this.now() + this.status.retryAfterSeconds * 1000,
    );
    this.changed();
  }
  async configure(enabled: boolean, limit: number) {
    this.invalidate();
    const hasKey = this.status.hasKey;
    this.status = await this.bridge.configure(enabled, limit);
    if (!enabled) this.status.hasKey = hasKey;
    this.message = enabled
      ? "Jev enabled. Your friend will ask occasionally."
      : "Jev is off. Deciding locally.";
    this.changed();
  }
  async saveKey(key: string) {
    this.invalidate();
    this.status = await this.bridge.saveKey(key);
    this.message =
      "Key saved in your OS credential store. Enable Jev when ready.";
    this.changed();
  }
  async forgetKey() {
    this.invalidate();
    this.status.enabled = false;
    this.changed();
    this.status = await this.bridge.forgetKey();
    this.message = "Key removed. Your friend continues offline.";
    this.changed();
  }
  async consider(
    observation: JevObservation,
    stillAllowed: () => boolean,
    apply: (action: Action) => void,
  ) {
    if (!this.status.enabled || this.pending || this.now() < this.nextRequest)
      return;
    if (this.status.requests >= this.status.limit) {
      this.message = jevMessages.budget;
      this.changed();
      return;
    }
    const generation = this.generation;
    this.pending = true;
    this.nextRequest = this.now() + 60_000;
    this.message = "Asking Jev. Local life carries on.";
    this.changed();
    try {
      const result = await this.bridge.decide(observation);
      // Usage is authoritative even when a click makes the chosen action stale.
      if (generation === this.generation) this.status = result.status;
      if (
        generation !== this.generation ||
        !this.status.enabled ||
        !stillAllowed()
      )
        return;
      if (!ACTIONS.includes(result.action)) {
        this.message = jevMessages.invalid_response;
        return;
      }
      apply(result.action);
      this.message = "A little idea from Jev.";
    } catch (error) {
      if (generation !== this.generation) return;
      const code = typeof error === "string" ? error : "offline";
      this.message =
        jevMessages[code] ?? "Deciding locally while Jev is unavailable.";
      // Do not display native/provider error bodies, which may contain secrets.
    } finally {
      this.pending = false;
      // Always reconcile usage and native backoff, including failed or stale requests.
      try {
        await this.refresh();
      } catch {
        /* Offline behavior is unaffected. */
      }
      this.changed();
    }
  }
}
