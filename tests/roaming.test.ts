import { afterEach, describe, expect, it, vi } from "vitest";
import { Roamer } from "../src/roaming";

afterEach(() => vi.useRealTimers());
describe("desktop motion scheduling", () => {
  it("does no work while inactive and stops pending timers immediately", async () => {
    vi.useFakeTimers();
    const step = vi.fn().mockResolvedValue(1);
    const roamer = new Roamer(step, vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(1000);
    expect(step).not.toHaveBeenCalled();
    roamer.setActive(true);
    await vi.advanceTimersByTimeAsync(250);
    expect(step).toHaveBeenCalledTimes(2);
    roamer.setActive(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(step).toHaveBeenCalledTimes(2);
  });
  it("never overlaps native moves and ignores a reply after pause or hide", async () => {
    vi.useFakeTimers();
    let resolve!: (direction: number) => void;
    const step = vi.fn(
      () =>
        new Promise<number>((done) => {
          resolve = done;
        }),
    );
    const turned = vi.fn();
    const roamer = new Roamer(step, turned, vi.fn());
    roamer.setActive(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(step).toHaveBeenCalledTimes(1);
    roamer.setActive(false);
    resolve(-1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(turned).not.toHaveBeenCalled();
    expect(step).toHaveBeenCalledTimes(1);
  });
  it("stops on native failure instead of repeatedly issuing failing moves", async () => {
    vi.useFakeTimers();
    const step = vi.fn().mockRejectedValue("monitor"),
      failed = vi.fn();
    new Roamer(step, vi.fn(), failed).setActive(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(step).toHaveBeenCalledTimes(1);
    expect(failed).toHaveBeenCalledWith("monitor");
  });
});
