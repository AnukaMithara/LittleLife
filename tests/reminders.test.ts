import { describe, expect, it } from "vitest";
import {
  ANGRY_AFTER,
  ANNOYED_AFTER,
  answerCare,
  careLine,
  createCare,
  DEFAULT_CARE,
  restoreCare,
  SNOOZE,
  stepCare,
  type Care,
  type CareEvent,
} from "../src/reminders";

const MINUTE = 60_000;
const present = { awaySeconds: 0, busy: false };
/** Step once a second, as the app does, collecting what happened. */
function run(
  care: Care,
  from: number,
  to: number,
  context = present,
  settings = DEFAULT_CARE,
) {
  const events: CareEvent[] = [];
  for (let now = from; now <= to; now += 1000) {
    const stepped = stepCare(care, settings, now, context);
    care = stepped.care;
    if (stepped.event) events.push(stepped.event);
  }
  return { care, events };
}

describe("care reminders", () => {
  it("asks for the earliest due thing, one at a time", () => {
    const { care, events } = run(createCare(DEFAULT_CARE, 0), 0, 20 * MINUTE);
    expect(events).toEqual(["ask"]);
    expect(care.active).toMatchObject({ kind: "eyes", level: 0 });
    // Water comes due while the eyes reminder is still up, and waits its turn.
    const later = run(care, 20 * MINUTE, 46 * MINUTE);
    expect(later.care.active?.kind).toBe("eyes");
    const answered = answerCare(later.care, DEFAULT_CARE, 46 * MINUTE, "done");
    expect(
      stepCare(answered, DEFAULT_CARE, 46 * MINUTE + 1000, present).care.active
        ?.kind,
    ).toBe("water");
  });
  it("grows annoyed, then angry, when ignored", () => {
    const asked = run(createCare(DEFAULT_CARE, 0), 0, 20 * MINUTE).care;
    const { care, events } = run(
      asked,
      20 * MINUTE,
      20 * MINUTE + ANGRY_AFTER + 2000,
    );
    expect(events).toEqual(["annoyed", "angry"]);
    expect(care.active?.level).toBe(2);
    expect(careLine("eyes", 2)).not.toBe(careLine("eyes", 0));
    const annoyed = run(
      asked,
      20 * MINUTE,
      20 * MINUTE + ANNOYED_AFTER + 2000,
    ).care;
    expect(annoyed.active?.level).toBe(1);
  });
  it("comes back after the interval when done, and after ten minutes when put off", () => {
    const asked = run(createCare(DEFAULT_CARE, 0), 0, 20 * MINUTE).care;
    const now = 20 * MINUTE;
    const done = answerCare(asked, DEFAULT_CARE, now, "done");
    expect(done.active).toBeUndefined();
    expect(done.due.eyes).toBe(now + 20 * MINUTE);
    expect(answerCare(asked, DEFAULT_CARE, now, "later").due.eyes).toBe(
      now + SNOOZE,
    );
    expect(answerCare(done, DEFAULT_CARE, now, "done")).toBe(done);
  });
  it("counts time away as the break and never gets angry at an empty chair", () => {
    const asked = run(createCare(DEFAULT_CARE, 0), 0, 20 * MINUTE).care;
    const away = run(asked, 20 * MINUTE, 22 * MINUTE, {
      awaySeconds: 90,
      busy: false,
    });
    expect(away.care.active).toMatchObject({
      kind: "eyes",
      level: 0,
      ignored: 0,
    });
    const rested = stepCare(away.care, DEFAULT_CARE, 23 * MINUTE, {
      awaySeconds: 200,
      busy: false,
    });
    expect(rested.event).toBe("rested");
    expect(rested.care.active).toBeUndefined();
    expect(rested.care.due.break).toBe(23 * MINUTE + 50 * MINUTE);
    // Water is not something a walk takes care of.
    const thirsty = {
      ...asked,
      active: { kind: "water" as const, ignored: 0, level: 0 as const },
    };
    expect(
      stepCare(thirsty, DEFAULT_CARE, 23 * MINUTE, {
        awaySeconds: 200,
        busy: false,
      }).care.active?.kind,
    ).toBe("water");
  });
  it("waits through calls and videos, and does not leap ahead after a suspended app", () => {
    const busy = run(createCare(DEFAULT_CARE, 0), 0, 60 * MINUTE, {
      awaySeconds: 0,
      busy: true,
    });
    expect(busy.events).toEqual([]);
    expect(
      stepCare(busy.care, DEFAULT_CARE, 60 * MINUTE + 1000, present).event,
    ).toBe("ask");
    const asked = run(createCare(DEFAULT_CARE, 0), 0, 20 * MINUTE).care;
    const woke = stepCare(
      asked,
      DEFAULT_CARE,
      20 * MINUTE + 8 * 3_600_000,
      present,
    );
    expect(woke.care.active?.level).toBe(0);
  });
  it("respects switched-off reminders and repairs saved settings", () => {
    const off = { ...DEFAULT_CARE, enabled: false };
    expect(
      run(createCare(off, 0), 0, 90 * MINUTE, present, off).events,
    ).toEqual([]);
    const noEyes = { ...DEFAULT_CARE, eyes: 0 };
    expect(
      run(createCare(noEyes, 0), 0, 44 * MINUTE, present, noEyes).events,
    ).toEqual([]);
    const asked = run(createCare(DEFAULT_CARE, 0), 0, 20 * MINUTE).care;
    expect(
      stepCare(asked, off, 21 * MINUTE, present).care.active,
    ).toBeUndefined();
    for (const raw of [null, "{", "[]", '{"version":2}'])
      expect(restoreCare(raw)).toEqual(DEFAULT_CARE);
    expect(
      restoreCare(
        '{"version":1,"enabled":false,"water":1,"eyes":0,"break":9999}',
      ),
    ).toEqual({
      version: 1,
      enabled: false,
      water: 5,
      eyes: 0,
      break: 240,
    });
    expect(restoreCare('{"version":1,"water":"soon"}').water).toBe(45);
  });
});
