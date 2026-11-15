/**
 * A companion sent aside does not wait in silence forever. After a while it asks
 * to come back; told "not yet", it waits longer before asking again. Pure and offline.
 */
export interface Waiting {
  /** When it may next ask. */
  askAt: number;
  /** When the current question was put, while it is waiting for an answer. */
  asked?: number;
  /** How many times it has been told to wait or been ignored. */
  refusals: number;
}
export const FIRST_ASK = 4 * 60_000;
export const LONGEST_WAIT = 20 * 60_000;
/** How long a question stays up before the companion gives up on an answer. */
export const PLEA_SHOWN = 45_000;
export type WaitEvent = "ask" | "ignored";

/** Each refusal doubles the wait, up to twenty minutes. */
export function patience(refusals: number): number {
  return Math.min(LONGEST_WAIT, FIRST_ASK * 2 ** Math.max(0, refusals));
}
export function sendAside(now: number): Waiting {
  return { askAt: now + FIRST_ASK, refusals: 0 };
}
/** `busy`: in a call or watching something, when even asking would interrupt. */
export function stepWaiting(
  waiting: Waiting,
  now: number,
  busy: boolean,
): { waiting: Waiting; event?: WaitEvent } {
  if (waiting.asked !== undefined) {
    if (now - waiting.asked < PLEA_SHOWN) return { waiting };
    return { waiting: notYet(waiting, now), event: "ignored" };
  }
  if (busy || now < waiting.askAt) return { waiting };
  return { waiting: { ...waiting, asked: now }, event: "ask" };
}
/** Told to keep waiting. */
export function notYet(waiting: Waiting, now: number): Waiting {
  const refusals = waiting.refusals + 1;
  return { refusals, askAt: now + patience(refusals) };
}
const PLEAS = [
  "Can I come back out now?",
  "Is it okay to come back?",
  "I've been very good… can I come out?",
  "I miss you. May I come back?",
];
/** It asks a little more wistfully each time. */
export function plea(waiting: Waiting): string {
  return PLEAS[Math.min(PLEAS.length - 1, waiting.refusals)];
}
