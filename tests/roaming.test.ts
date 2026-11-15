import { describe, expect, it, vi } from "vitest";
import { Roamer } from "../src/roaming";

const settle = () => new Promise((done) => setTimeout(done, 0));
describe("desktop motion requests", () => {
  it("asks the native side only when the wish changes", async () => {
    const roam = vi.fn().mockResolvedValue(undefined);
    const roamer = new Roamer(roam, vi.fn());
    roamer.setActive(false);
    await settle();
    expect(roam).not.toHaveBeenCalled();
    roamer.setActive(true);
    roamer.setActive(true);
    roamer.setActive(false);
    await settle();
    expect(roam.mock.calls.map((call) => call[0])).toEqual([true, false]);
  });
  it("sends requests one at a time and in order", async () => {
    const order: string[] = [];
    let release!: () => void;
    const roam = vi.fn((active: boolean) => {
      order.push(`start ${active}`);
      return active
        ? new Promise<void>((done) => {
            release = () => {
              order.push("end true");
              done();
            };
          })
        : Promise.resolve();
    });
    const roamer = new Roamer(roam, vi.fn());
    roamer.setActive(true);
    roamer.setActive(false);
    await settle();
    expect(order).toEqual(["start true"]);
    release();
    await settle();
    expect(order).toEqual(["start true", "end true", "start false"]);
  });
  it("reports a failed start once and can be asked again later", async () => {
    const roam = vi
      .fn()
      .mockRejectedValueOnce("monitor")
      .mockResolvedValue(undefined);
    const failed = vi.fn();
    const roamer = new Roamer(roam, failed);
    roamer.setActive(true);
    await settle();
    expect(failed).toHaveBeenCalledExactlyOnceWith("monitor");
    roamer.setActive(true);
    await settle();
    expect(roam).toHaveBeenCalledTimes(2);
  });
  it("stays quiet about a start that was already cancelled or a failed stop", async () => {
    const failed = vi.fn();
    const roamer = new Roamer(vi.fn().mockRejectedValue("window"), failed);
    roamer.setActive(true);
    roamer.setActive(false);
    await settle();
    expect(failed).not.toHaveBeenCalled();
  });
});
