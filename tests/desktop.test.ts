import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
  drag: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: mocks.invoke,
}));
vi.mock("@tauri-apps/api/event", () => ({ listen: mocks.listen }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ startDragging: mocks.drag }),
}));
import {
  compactWindow,
  connectDesktop,
  closeWindow,
  desktopError,
  type DesktopState,
} from "../src/desktop";

const initial: DesktopState = {
  roaming: true,
  movement: "walk",
  compact: true,
  clickThrough: false,
  visible: false,
  alwaysOnTop: true,
  trayAvailable: true,
  storageAvailable: true,
  awareness: true,
};
beforeEach(() => {
  mocks.invoke.mockReset();
  mocks.listen.mockReset();
  mocks.drag.mockReset();
});
describe("native desktop bridge", () => {
  it("applies saved state before revealing the window and forwards tray events", async () => {
    const changed = vi.fn(),
      stop = vi.fn();
    let listener!: (event: { payload: DesktopState }) => void;
    mocks.listen.mockImplementation(async (_event, handler) => {
      listener = handler;
      return stop;
    });
    mocks.invoke.mockImplementation(async (command) =>
      command === "desktop_status" ? initial : { ...initial, visible: true },
    );
    const disconnect = await connectDesktop(changed);
    expect(changed.mock.calls.map((c) => c[0].visible)).toEqual([false, true]);
    expect(mocks.invoke.mock.calls.map((c) => c[0])).toEqual([
      "desktop_status",
      "desktop_action",
    ]);
    listener({ payload: { ...initial, compact: false, visible: true } });
    expect(changed).toHaveBeenLastCalledWith({
      ...initial,
      compact: false,
      visible: true,
    });
    disconnect();
    expect(stop).toHaveBeenCalled();
  });
  it("reveals a recoverable window even when event subscription fails", async () => {
    mocks.listen.mockRejectedValue(new Error("unavailable"));
    mocks.invoke.mockResolvedValue({ ...initial, visible: true });
    const changed = vi.fn();
    await expect(connectDesktop(changed)).rejects.toThrow("unavailable");
    expect(mocks.invoke).toHaveBeenCalledWith("desktop_action", {
      action: "ready",
      value: undefined,
    });
    expect(changed).toHaveBeenCalledWith({ ...initial, visible: true });
  });
  it("uses native compact/expand and explicit quit instead of hiding on quit", async () => {
    mocks.invoke.mockResolvedValue(initial);
    await compactWindow(true);
    await compactWindow(false);
    await closeWindow();
    expect(mocks.invoke.mock.calls.map((c) => c[1].action)).toEqual([
      "compact",
      "expand",
      "quit",
    ]);
  });
  it("gives recovery instructions without reflecting arbitrary native error details", () => {
    expect(desktopError("tray_unavailable")).toContain("disabled");
    expect(desktopError("private internal details")).not.toContain(
      "private internal details",
    );
    expect(desktopError("monitor")).toContain("Reset position");
  });
});
