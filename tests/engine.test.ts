import { describe, expect, it } from "vitest";
import { createPet, restorePet, tick, decide, interact } from "../src/engine";

describe("saved companion", () => {
  it("recovers from malformed, unsupported and nonfinite state", () => {
    for (const raw of [
      "{",
      "null",
      "[]",
      '{"version":99}',
      '{"version":1,"energy":"oops","name":"  "}',
    ]) {
      expect(restorePet(raw, 100).name).toBe("Moss");
      expect(Number.isFinite(restorePet(raw, 100).energy)).toBe(true);
    }
  });
  it("keeps identity and bond while capping rest recovery", () => {
    const pet = {
      ...createPet(0),
      name: "Fern",
      energy: 5,
      affection: 91,
      interactions: 12,
    };
    const restored = restorePet(JSON.stringify(pet), 99 * 3_600_000);
    expect(restored).toMatchObject({
      name: "Fern",
      energy: 45,
      affection: 91,
      interactions: 12,
    });
  });
  it("clamps tampered data and ignores future timestamps", () => {
    expect(
      restorePet(
        '{"version":1,"energy":-300,"affection":900,"interactions":-1,"lastSeen":999999}',
        0,
      ),
    ).toMatchObject({ energy: 0, affection: 100, interactions: 0 });
  });
});
describe("offline life", () => {
  const observation = { idleSeconds: 0, cursorNearby: false, paused: false };
  it("prioritizes pause, then rest, then cursor attention", () => {
    const pet = createPet();
    expect(
      decide({ ...pet, energy: 1 }, { ...observation, paused: true }),
    ).toBe("idle");
    expect(
      decide({ ...pet, energy: 1 }, { ...observation, cursorNearby: true }),
    ).toBe("sleep");
    expect(decide(pet, { ...observation, idleSeconds: 120 })).toBe("sleep");
    expect(decide(pet, { ...observation, cursorNearby: true })).toBe("curious");
  });
  it("does not wander in quiet mode or reduced motion", () => {
    expect(decide({ ...createPet(), quiet: true }, observation, 0)).toBe(
      "idle",
    );
    expect(
      decide({ ...createPet(), reducedMotion: true }, observation, 0),
    ).toBe("idle");
  });
  it("uses randomness only after essential needs", () => {
    expect(decide(createPet(), observation, 0)).toBe("walk");
    expect(decide(createPet(), observation, 0.35)).toBe("jump");
    expect(decide(createPet(), observation, 0.9)).toBe("idle");
  });
  it("restores energy during sleep and caps suspension gaps", () => {
    const pet = { ...createPet(), energy: 50 };
    expect(tick(pet, "sleep", 3600).energy).toBe(52.25);
    expect(tick(pet, "walk", -1).energy).toBe(50);
    expect(tick({ ...pet, energy: 100 }, "sleep", 5).energy).toBe(100);
  });
  it("records care without mutating previous state", () => {
    const pet = { ...createPet(), affection: 99, energy: 1 };
    expect(interact(pet, "play")).toMatchObject({
      energy: 0,
      affection: 100,
      interactions: 1,
    });
    expect(pet.interactions).toBe(0);
  });
});
