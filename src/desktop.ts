import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { restoreSense, type Sense } from "./mood";

export const native = isTauri();
export type Movement = "walk" | "fly" | "swim";
export interface DesktopState {
  roaming: boolean;
  movement: Movement;
  compact: boolean;
  clickThrough: boolean;
  visible: boolean;
  alwaysOnTop: boolean;
  trayAvailable: boolean;
  storageAvailable: boolean;
  awareness: boolean;
}
export type DesktopAction =
  | "ready"
  | "expand"
  | "compact"
  | "hide"
  | "interact"
  | "click_through"
  | "always_on_top"
  | "roaming"
  | "awareness"
  | "reset"
  | "quit";
export async function desktopAction(
  action: DesktopAction,
  value?: boolean,
): Promise<DesktopState> {
  return invoke("desktop_action", { action, value });
}
export async function connectDesktop(
  changed: (state: DesktopState) => void,
): Promise<() => void> {
  let stop: (() => void) | undefined;
  try {
    stop = await listen<DesktopState>("desktop-state", (event) =>
      changed(event.payload),
    );
    changed(await invoke<DesktopState>("desktop_status"));
  } catch (error) {
    stop?.();
    throw error;
  } finally {
    // Even a listener failure must not strand the startup window invisibly.
    changed(await desktopAction("ready"));
  }
  return () => stop?.();
}
export async function compactWindow(
  compact: boolean,
): Promise<DesktopState | undefined> {
  if (native) return desktopAction(compact ? "compact" : "expand");
}
export async function dragWindow(): Promise<void> {
  if (native) await getCurrentWindow().startDragging();
}
export async function closeWindow(): Promise<void> {
  if (native) await desktopAction("quit");
}
export function desktopError(error: unknown): string {
  if (error === "tray_unavailable")
    return "The tray is unavailable. Click-through and hiding are disabled so you can always reach your friend.";
  if (error === "monitor")
    return "Display information is unavailable. Try Reset position from the tray.";
  return "That desktop action did not work. Use Open LittleLife or Interact in the tray menu to recover.";
}

export function desktopRoam(active: boolean): Promise<void> {
  return invoke("desktop_roam", { active });
}
/** While a speech bubble shows, the whole companion window accepts clicks. */
export function desktopAttention(active: boolean): Promise<void> {
  return native ? invoke("desktop_attention", { active }) : Promise.resolve();
}
export interface DesktopMotion {
  direction: number;
  falling: boolean;
  /** Still on its way, even if the behavior has already moved on. */
  moving: boolean;
}
export interface DesktopSignals {
  motion(motion: DesktopMotion): void;
  cursor(near: boolean): void;
  activity(sense: Sense): void;
}
/** Native observations: where the character is heading, the pointer, and the person's activity. */
export async function connectSignals(
  signals: DesktopSignals,
): Promise<() => void> {
  const stops = await Promise.all([
    listen<DesktopMotion>("desktop-motion", (e) => signals.motion(e.payload)),
    listen<boolean>("desktop-cursor", (e) =>
      signals.cursor(e.payload === true),
    ),
    listen<unknown>("desktop-activity", (e) =>
      signals.activity(restoreSense(e.payload)),
    ),
  ]);
  return () => stops.forEach((stop) => stop());
}
export function desktopMovement(movement: Movement): Promise<DesktopState> {
  return invoke("desktop_movement", { movement });
}
