/** Pure offline behavior. A future decision provider can select from ACTIONS. */
export const ACTIONS = [
  "idle",
  "walk",
  "sleep",
  "jump",
  "curious",
  "happy",
] as const;
export type Action = (typeof ACTIONS)[number];
export interface PetState {
  version: 1;
  name: string;
  energy: number;
  affection: number;
  interactions: number;
  lastSeen: number;
  quiet: boolean;
  reducedMotion: boolean;
}
export interface Observation {
  idleSeconds: number;
  cursorNearby: boolean;
  paused: boolean;
}
export const STORAGE_KEY = "littlelife.moss.v1";
export const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));
export function createPet(now = Date.now()): PetState {
  return {
    version: 1,
    name: "Moss",
    energy: 78,
    affection: 35,
    interactions: 0,
    lastSeen: now,
    quiet: false,
    reducedMotion: false,
  };
}
export function restorePet(raw: string | null, now = Date.now()): PetState {
  const fallback = createPet(now);
  if (!raw) return fallback;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return fallback;
    const s = data as Record<string, unknown>;
    if (s.version !== 1) return fallback;
    const number = (key: string, defaultValue: number) =>
      typeof s[key] === "number" && Number.isFinite(s[key])
        ? (s[key] as number)
        : defaultValue;
    const elapsedHours = clamp(
      (now - number("lastSeen", now)) / 3_600_000,
      0,
      8,
    );
    return {
      ...fallback,
      name:
        typeof s.name === "string" && s.name.trim()
          ? s.name.trim().slice(0, 24)
          : fallback.name,
      energy: clamp(number("energy", 78) + elapsedHours * 5),
      affection: clamp(number("affection", 35)),
      interactions: Math.floor(
        clamp(number("interactions", 0), 0, Number.MAX_SAFE_INTEGER),
      ),
      quiet: s.quiet === true,
      reducedMotion: s.reducedMotion === true,
    };
  } catch {
    return fallback;
  }
}
export function tick(
  state: PetState,
  action: Action,
  seconds: number,
  now = Date.now(),
): PetState {
  // A suspended webview must not simulate hours of hunger in one tick.
  const dt = clamp(seconds, 0, 5);
  const energy =
    state.energy +
    (action === "sleep"
      ? 0.45
      : action === "walk" || action === "jump"
        ? -0.1
        : -0.015) *
      dt;
  return { ...state, energy: clamp(energy), lastSeen: now };
}
export function interact(
  state: PetState,
  kind: "pet" | "play" | "rest",
): PetState {
  return {
    ...state,
    interactions: Math.min(Number.MAX_SAFE_INTEGER, state.interactions + 1),
    affection: clamp(state.affection + (kind === "pet" ? 3 : 1)),
    energy: clamp(state.energy - (kind === "play" ? 3 : 0)),
  };
}
export function decide(
  state: PetState,
  observation: Observation,
  random = Math.random(),
): Action {
  if (observation.paused) return "idle";
  if (state.energy < 24 || observation.idleSeconds >= 120) return "sleep";
  if (observation.cursorNearby) return "curious";
  if (state.quiet || state.reducedMotion) return "idle";
  if (random < 0.3) return "walk";
  if (random < 0.38 && state.energy > 55) return "jump";
  return "idle";
}
export function bondLabel(state: PetState): string {
  return state.affection >= 80
    ? "Inseparable"
    : state.affection >= 55
      ? "Good friends"
      : state.affection >= 25
        ? "Getting acquainted"
        : "A new beginning";
}
