import { describe, expect, it } from "vitest";
import {
  FIRST_ASK,
  LONGEST_WAIT,
  notYet,
  patience,
  plea,
  PLEA_SHOWN,
  sendAside,
  stepWaiting,
} from "../src/waiting";

describe("waiting to be called back", () => {
  it("asks after a few minutes, once, and keeps the question up for a while", () => {
    let waiting = sendAside(0);
    expect(stepWaiting(waiting, FIRST_ASK - 1000, false).event).toBeUndefined();
    const asked = stepWaiting(waiting, FIRST_ASK, false);
    expect(asked.event).toBe("ask");
    waiting = asked.waiting;
    expect(stepWaiting(waiting, FIRST_ASK + 10_000, false)).toEqual({
      waiting,
    });
  });
  it("waits longer after every 'not yet', and asks more wistfully", () => {
    let waiting = sendAside(0);
    waiting = stepWaiting(waiting, FIRST_ASK, false).waiting;
    const first = plea(waiting);
    waiting = notYet(waiting, FIRST_ASK);
    expect(waiting).toEqual({ refusals: 1, askAt: FIRST_ASK + 2 * FIRST_ASK });
    expect(plea(waiting)).not.toBe(first);
    expect(patience(0)).toBe(FIRST_ASK);
    expect(patience(9)).toBe(LONGEST_WAIT);
    expect(plea({ askAt: 0, refusals: 99 })).toBeTruthy();
  });
  it("takes silence as 'not yet' and never interrupts a call or a film", () => {
    const asked = stepWaiting(sendAside(0), FIRST_ASK, false).waiting;
    const ignored = stepWaiting(asked, FIRST_ASK + PLEA_SHOWN, false);
    expect(ignored.event).toBe("ignored");
    expect(ignored.waiting.refusals).toBe(1);
    expect(ignored.waiting.asked).toBeUndefined();
    const busy = stepWaiting(sendAside(0), FIRST_ASK * 3, true);
    expect(busy.event).toBeUndefined();
    expect(stepWaiting(busy.waiting, FIRST_ASK * 3 + 1000, false).event).toBe(
      "ask",
    );
  });
});
