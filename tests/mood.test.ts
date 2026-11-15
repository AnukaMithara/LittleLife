import { describe, expect, it } from "vitest";
import { createPet, decide } from "../src/engine";
import {
  busy,
  greeting,
  grooving,
  restoreSense,
  settles,
  UNKNOWN,
  vibe,
  type Sense,
} from "../src/mood";

const sense = (
  activity: Sense["activity"],
  audio = false,
  media: Sense["media"] = audio ? "music" : "none",
): Sense => ({ activity, audio, media, idleSeconds: 0 });
describe("fitting company", () => {
  it("reads the room from the activity and whether sound is playing", () => {
    expect(vibe(sense("coding"))).toBe("focus");
    expect(vibe(sense("video", true))).toBe("watch");
    expect(vibe(sense("meeting", true))).toBe("meeting");
    expect(vibe(sense("browsing", true))).toBe("music");
    expect(vibe(sense("browsing"))).toBe("free");
    expect(vibe(sense("away", true))).toBe("away");
    expect(grooving(sense("coding", true)) && grooving(sense("music"))).toBe(
      true,
    );
    expect(grooving(sense("coding")) || grooving(sense("meeting", true))).toBe(
      false,
    );
    expect(busy(sense("video")) && busy(sense("meeting"))).toBe(true);
    expect(busy(sense("coding"))).toBe(false);
    // A video on in the background is not music to dance to, and work still comes first.
    expect(vibe(sense("coding", true, "video"))).toBe("focus");
    expect(grooving(sense("coding", true, "video"))).toBe(false);
    expect(vibe(sense("browsing", true, "video"))).toBe("free");
    // Occupied people get a companion that keeps to a corner.
    for (const activity of ["coding", "writing", "video", "meeting"] as const)
      expect(settles(sense(activity)), activity).toBe(true);
    for (const activity of ["browsing", "music", "away", "other"] as const)
      expect(settles(sense(activity)), activity).toBe(false);
  });
  it("greets a returning person and stays quiet when nothing changed worth a word", () => {
    expect(greeting("focus", "away")).toContain("back");
    expect(greeting("watch", "free")).toContain("watch");
    expect(greeting("free", "focus")).toBeUndefined();
    expect(greeting("away", "focus")).toBeUndefined();
  });
  it("accepts only well-formed native observations", () => {
    expect(
      restoreSense({
        activity: "coding",
        audio: true,
        media: "video",
        idleSeconds: 30,
      }),
    ).toEqual({
      activity: "coding",
      audio: true,
      media: "video",
      idleSeconds: 30,
    });
    expect(restoreSense({ activity: "coding", media: "podcast" }).media).toBe(
      "none",
    );
    for (const raw of [
      null,
      "coding",
      { activity: "run_shell", audio: "yes", idleSeconds: NaN },
    ])
      expect(restoreSense(raw)).toEqual(UNKNOWN);
  });
  it("changes behavior with the person's activity", () => {
    const pet = createPet(0);
    const watch = (v: ReturnType<typeof vibe>, random: number, extra = {}) =>
      decide(
        pet,
        {
          idleSeconds: 0,
          cursorNearby: false,
          paused: false,
          vibe: v,
          ...extra,
        },
        random,
      );
    expect(watch("away", 0.1)).toBe("sleep");
    expect(watch("watch", 0.1)).toBe("idle");
    expect(watch("meeting", 0.1)).toBe("idle");
    expect(watch("focus", 0.2)).toBe("idle");
    expect(watch("focus", 0.05)).toBe("walk");
    expect(watch("music", 0.4)).toBe("jump");
    expect(watch("free", 0.2)).toBe("walk");
    // A call does not stop curiosity about a nearby pointer, and paused always wins.
    expect(watch("meeting", 0.1, { cursorNearby: true })).toBe("curious");
    expect(watch("music", 0.1, { paused: true })).toBe("idle");
  });
  it("finishes a tired nap instead of waking every few seconds", () => {
    const tired = { ...createPet(0), energy: 40 };
    const at = (sleeping: boolean, energy = 40) =>
      decide(
        { ...tired, energy },
        { idleSeconds: 0, cursorNearby: false, paused: false, sleeping },
        0.9,
      );
    expect(at(true)).toBe("sleep");
    expect(at(false)).toBe("idle");
    expect(at(true, 61)).toBe("idle");
  });
});
