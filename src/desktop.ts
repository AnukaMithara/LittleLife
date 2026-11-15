import { isTauri } from "@tauri-apps/api/core";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";

export const native = isTauri();
export async function compactWindow(compact: boolean): Promise<void> {
  if (!native) return;
  const win = getCurrentWindow();
  const monitor = await currentMonitor();
  await win.setSize(new LogicalSize(compact ? 260 : 440, compact ? 300 : 650));
  if (monitor) {
    const area = monitor.workArea;
    const size = await win.outerSize();
    const position = await win.outerPosition();
    await win.setPosition(
      new PhysicalPosition(
        Math.max(
          area.position.x,
          Math.min(position.x, area.position.x + area.size.width - size.width),
        ),
        Math.max(
          area.position.y,
          Math.min(
            position.y,
            area.position.y + area.size.height - size.height,
          ),
        ),
      ),
    );
  }
}
export async function dragWindow(): Promise<void> {
  if (native) await getCurrentWindow().startDragging();
}
export async function closeWindow(): Promise<void> {
  if (native) await getCurrentWindow().close();
}
