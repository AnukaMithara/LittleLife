import { describe, expect, it, vi } from "vitest";
import { createPet } from "../src/engine";
import {
  canAskJev,
  jevObservation,
  JevController,
  OFFLINE_STATUS,
  type JevBridge,
  type JevDecision,
} from "../src/jev";

function setup() {
  let now = 0;
  let status = {
    ...OFFLINE_STATUS,
    supported: true,
    hasKey: true,
    enabled: true,
  };
  const bridge: JevBridge = {
    status: vi.fn(async () => ({ ...status })),
    configure: vi.fn(
      async (enabled, limit) => (status = { ...status, enabled, limit }),
    ),
    saveKey: vi.fn(
      async () => (status = { ...status, enabled: false, hasKey: true }),
    ),
    forgetKey: vi.fn(
      async () => (status = { ...status, enabled: false, hasKey: false }),
    ),
    decide: vi.fn(async () => {
      status.requests++;
      return { action: "happy" as const, status: { ...status } };
    }),
  };
  const controller = new JevController(bridge, vi.fn(), () => now);
  const observation = jevObservation(
    createPet(),
    { idleSeconds: 0, cursorNearby: false, paused: false },
    "idle",
  );
  return {
    bridge,
    controller,
    observation,
    advance: () => {
      now += 60_001;
    },
    status,
  };
}
describe("optional Jev decisions", () => {
  it("does not send anything until explicitly enabled", async () => {
    const s = setup();
    await s.controller.consider(s.observation, () => true, vi.fn());
    expect(s.bridge.decide).not.toHaveBeenCalled();
  });
  it("restricts observations to the allowlist and respects local priorities", () => {
    const pet = { ...createPet(), name: "private name" };
    const obs = { idleSeconds: 0, cursorNearby: true, paused: false };
    expect(Object.keys(jevObservation(pet, obs, "idle")).sort()).toEqual([
      "affection",
      "cursorNearby",
      "energy",
      "idleSeconds",
      "lastAction",
    ]);
    expect(canAskJev(pet, obs, false)).toBe(true);
    expect(canAskJev(pet, obs, true)).toBe(false);
    expect(canAskJev({ ...pet, energy: 1 }, obs, false)).toBe(false);
    expect(canAskJev({ ...pet, quiet: true }, obs, false)).toBe(false);
    expect(canAskJev({ ...pet, reducedMotion: true }, obs, false)).toBe(false);
    expect(canAskJev(pet, { ...obs, paused: true }, false)).toBe(false);
    expect(canAskJev(pet, { ...obs, idleSeconds: 120 }, false)).toBe(false);
  });
  it("enforces the cooldown and session cap locally as well as natively", async () => {
    const s = setup();
    await s.controller.refresh();
    const apply = vi.fn();
    await s.controller.consider(s.observation, () => true, apply);
    await s.controller.consider(s.observation, () => true, apply);
    expect(s.bridge.decide).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("happy");
    s.advance();
    s.controller.status.limit = 1;
    await s.controller.consider(s.observation, () => true, apply);
    expect(s.bridge.decide).toHaveBeenCalledTimes(1);
  });
  it("prevents overlapping calls and discards a result after direct interaction", async () => {
    const s = setup();
    await s.controller.refresh();
    let resolve!: (d: JevDecision) => void;
    s.bridge.decide = vi.fn(
      () =>
        new Promise<JevDecision>((r) => {
          resolve = r;
        }),
    );
    const apply = vi.fn();
    const pending = s.controller.consider(s.observation, () => true, apply);
    s.advance();
    await s.controller.consider(s.observation, () => true, apply);
    expect(s.bridge.decide).toHaveBeenCalledTimes(1);
    s.controller.invalidate();
    resolve({ action: "jump", status: { ...s.status } });
    await pending;
    expect(apply).not.toHaveBeenCalled();
  });
  it("rechecks current constraints before applying a delayed decision", async () => {
    const s = setup();
    await s.controller.refresh();
    const apply = vi.fn();
    await s.controller.consider(s.observation, () => false, apply);
    expect(apply).not.toHaveBeenCalled();
  });
  it("falls back on failure and honors native backoff without exposing raw errors", async () => {
    const s = setup();
    await s.controller.refresh();
    s.bridge.decide = vi.fn(async () => {
      throw "server body with private key";
    });
    s.bridge.status = vi.fn(async () => ({
      ...s.status,
      retryAfterSeconds: 300,
    }));
    const apply = vi.fn();
    await s.controller.consider(s.observation, () => true, apply);
    expect(s.controller.message).not.toContain("private key");
    expect(apply).not.toHaveBeenCalled();
    s.advance();
    await s.controller.consider(s.observation, () => true, apply);
    expect(s.bridge.decide).toHaveBeenCalledTimes(1);
  });
  it("removes saved credentials and disables the provider", async () => {
    const s = setup();
    await s.controller.refresh();
    await s.controller.forgetKey();
    expect(s.controller.status).toMatchObject({
      enabled: false,
      hasKey: false,
    });
    await s.controller.consider(s.observation, () => true, vi.fn());
    expect(s.bridge.decide).not.toHaveBeenCalled();
  });
});
