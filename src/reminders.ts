/** Gentle care reminders that grow impatient when ignored. Pure and offline. */
import { clamp } from "./engine";

export const REMINDERS = ["water", "eyes", "break"] as const;
export type ReminderKind = (typeof REMINDERS)[number];
/** Minutes between reminders; 0 turns one off. */
export interface CareSettings extends Record<ReminderKind, number> {
  version: 1;
  enabled: boolean;
}
export const CARE_KEY = "littlelife.care.v1";
export const DEFAULT_CARE: CareSettings = {
  version: 1,
  enabled: true,
  water: 45,
  eyes: 20,
  break: 50,
};
export function restoreCare(raw: string | null): CareSettings {
  if (!raw) return { ...DEFAULT_CARE };
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return { ...DEFAULT_CARE };
    const s = data as Record<string, unknown>;
    if (s.version !== 1) return { ...DEFAULT_CARE };
    const result = { ...DEFAULT_CARE, enabled: s.enabled !== false };
    for (const kind of REMINDERS) result[kind] = minutes(s[kind], result[kind]);
    return result;
  } catch {
    return { ...DEFAULT_CARE };
  }
}
/** Whole minutes from 5 to 240, or 0 for off. */
export function minutes(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value <= 0 ? 0 : Math.round(clamp(value, 5, 240));
}

/** 0 asks nicely, 1 is annoyed, 2 is angry. */
export type Patience = 0 | 1 | 2;
export interface Care {
  due: Record<ReminderKind, number>;
  /** When this was last stepped, so a suspended app cannot jump straight to angry. */
  at: number;
  active?: { kind: ReminderKind; ignored: number; level: Patience };
}
export type CareEvent = "ask" | "annoyed" | "angry" | "rested";
export const ANNOYED_AFTER = 2 * 60_000;
export const ANGRY_AFTER = 5 * 60_000;
export const SNOOZE = 10 * 60_000;
/** Away from keyboard and pointer this long counts as a break. */
export const REST_SECONDS = 180;

export function createCare(settings: CareSettings, now: number): Care {
  const due = {} as Record<ReminderKind, number>;
  for (const kind of REMINDERS) due[kind] = now + settings[kind] * 60_000;
  return { due, at: now };
}
export interface CareContext {
  /** Seconds without any input on this device; 0 when unknown. */
  awaySeconds: number;
  /** In a call or watching something: wait instead of interrupting. */
  busy: boolean;
}
export function stepCare(
  care: Care,
  settings: CareSettings,
  now: number,
  context: CareContext,
): { care: Care; event?: CareEvent } {
  const passed = clamp(now - care.at, 0, 5000);
  const next: Care = { ...care, due: { ...care.due }, at: now };
  if (!settings.enabled) return { care: { ...next, active: undefined } };
  let event: CareEvent | undefined;
  if (context.awaySeconds >= REST_SECONDS) {
    // Stepping away is the break, and rests the eyes too.
    for (const kind of ["break", "eyes"] as const)
      next.due[kind] = now + settings[kind] * 60_000;
    if (next.active && next.active.kind !== "water") {
      next.active = undefined;
      event = "rested";
    }
  }
  if (next.active) {
    if (!settings[next.active.kind])
      return { care: { ...next, active: undefined } };
    // Nobody is there to ignore it while the person is away or occupied.
    if (context.awaySeconds >= 60 || context.busy) return { care: next, event };
    const ignored = next.active.ignored + passed;
    const level: Patience =
      ignored >= ANGRY_AFTER ? 2 : ignored >= ANNOYED_AFTER ? 1 : 0;
    if (level > next.active.level) event = level === 2 ? "angry" : "annoyed";
    next.active = { ...next.active, ignored, level };
    return { care: next, event };
  }
  if (context.busy || context.awaySeconds >= 60) return { care: next, event };
  const ready = REMINDERS.filter(
    (kind) => settings[kind] > 0 && next.due[kind] <= now,
  ).sort((a, b) => next.due[a] - next.due[b])[0];
  if (ready) {
    next.active = { kind: ready, ignored: 0, level: 0 };
    event = "ask";
  }
  return { care: next, event };
}
/** The person did it, or asked for ten more minutes. */
export function answerCare(
  care: Care,
  settings: CareSettings,
  now: number,
  answer: "done" | "later",
): Care {
  if (!care.active) return care;
  const kind = care.active.kind;
  return {
    ...care,
    active: undefined,
    due: {
      ...care.due,
      [kind]: now + (answer === "done" ? settings[kind] * 60_000 : SNOOZE),
    },
  };
}
const LINES: Record<ReminderKind, [string, string, string]> = {
  water: [
    "Time for a sip of water!",
    "Hey… your water is still waiting.",
    "I am NOT moving until you drink some water!",
  ],
  eyes: [
    "Rest your eyes: look far away for 20 seconds.",
    "Your eyes need a rest. Please look away.",
    "Look away from the screen. Right now!",
  ],
  break: [
    "You've been at it a while. Stretch with me?",
    "Please take that break. I'm asking nicely.",
    "Break. Now. I mean it!",
  ],
};
export function careLine(kind: ReminderKind, level: Patience): string {
  return LINES[kind][level];
}
