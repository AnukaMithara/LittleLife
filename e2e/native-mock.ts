import type { Page } from "@playwright/test";

export async function installNativeMock(
  page: Page,
  options = { trayAvailable: true, compact: false },
) {
  await page.addInitScript((options) => {
    const position = { x: 100, y: 100, steps: 0 };
    const desktop = {
      roaming: true,
      movement: "walk",
      compact: options.compact,
      clickThrough: false,
      visible: false,
      alwaysOnTop: true,
      trayAvailable: options.trayAvailable,
      storageAvailable: true,
      awareness: true,
    };
    let roaming = false;
    let attention = false;
    // Stands in for the native movement thread.
    setInterval(() => {
      if (!roaming || !desktop.compact || !desktop.visible || !desktop.roaming)
        return;
      position.x += 4;
      position.steps++;
      if (desktop.movement !== "walk") position.y += 2;
    }, 125);
    const jev = {
      enabled: false,
      hasKey: false,
      supported: true,
      limit: 20,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      retryAfterSeconds: 0,
    };
    let nextId = 1;
    const callbacks = new Map<number, (event: unknown) => void>();
    const listeners = new Map<number, { event: string; handler: number }>();
    function send(event: string, payload: unknown) {
      for (const [id, item] of listeners)
        if (item.event === event)
          callbacks.get(item.handler)?.({ event, id, payload });
    }
    function emit() {
      // Like the native side, every window action stops roaming until asked again.
      roaming = false;
      send("desktop-state", { ...desktop });
    }
    async function invoke(command: string, args: Record<string, unknown> = {}) {
      switch (command) {
        case "plugin:event|listen": {
          const id = nextId++;
          listeners.set(id, {
            event: String(args.event),
            handler: Number(args.handler),
          });
          return id;
        }
        case "plugin:event|unlisten":
          listeners.delete(Number(args.eventId));
          return;
        case "desktop_roam":
          roaming = args.active === true;
          return;
        case "desktop_lively":
          return;
        case "desktop_attention":
          attention = args.active === true;
          return;
        case "desktop_movement":
          desktop.movement = String(args.movement);
          emit();
          return { ...desktop };
        case "desktop_status":
          return { ...desktop };
        case "desktop_action":
          if (
            (args.action === "hide" || args.action === "click_through") &&
            !desktop.trayAvailable
          )
            throw "tray_unavailable";
          switch (args.action) {
            case "ready":
            case "interact":
              desktop.visible = true;
              desktop.clickThrough = false;
              break;
            case "expand":
              desktop.compact = false;
              desktop.visible = true;
              desktop.clickThrough = false;
              break;
            case "compact":
              desktop.compact = true;
              desktop.visible = true;
              desktop.clickThrough = false;
              break;
            case "hide":
              desktop.visible = false;
              desktop.clickThrough = false;
              break;
            case "roaming":
              desktop.roaming = args.value === true;
              break;
            case "awareness":
              desktop.awareness = args.value === true;
              break;
            case "always_on_top":
              desktop.alwaysOnTop = args.value === true;
              break;
            case "click_through":
              desktop.compact = true;
              desktop.visible = true;
              desktop.clickThrough = args.value === true;
              break;
            case "reset":
              desktop.visible = true;
              desktop.clickThrough = false;
              break;
            case "quit":
              desktop.visible = false;
              break;
            default:
              throw "invalid_action";
          }
          emit();
          return { ...desktop };
        case "jev_status":
          return { ...jev };
        case "jev_save_key":
          jev.hasKey = true;
          return { ...jev };
        case "jev_configure":
          jev.enabled = args.enabled === true;
          jev.limit = Number(args.limit);
          return { ...jev };
        case "jev_forget_key":
          jev.hasKey = false;
          jev.enabled = false;
          return { ...jev };
        case "jev_decide":
          if (!desktop.visible) throw "hidden";
          if (!jev.enabled) throw "disabled";
          jev.requests++;
          jev.inputTokens += 120;
          jev.outputTokens += 20;
          return { action: "happy", status: { ...jev } };
        default:
          throw new Error("Unexpected native command");
      }
    }
    Object.assign(window, {
      isTauri: true,
      __littlelifeTestTray: (action: string) =>
        invoke("desktop_action", { action }),
      __littlelifeDesktopState: () => ({ ...desktop }),
      __littlelifeDesktopPosition: () => ({ ...position }),
      __littlelifeAttention: () => attention,
      __littlelifeSignal: send,
      __TAURI_EVENT_PLUGIN_INTERNALS__: {
        unregisterListener: (_event: string, id: number) =>
          listeners.delete(id),
      },
      __TAURI_INTERNALS__: {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { label: "main", windowLabel: "main" },
        },
        invoke,
        transformCallback: (callback: (event: unknown) => void) => {
          const id = nextId++;
          callbacks.set(id, callback);
          return id;
        },
        unregisterCallback: (id: number) => callbacks.delete(id),
      },
    });
  }, options);
}
