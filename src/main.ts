import "./style.css";
import { character } from "./character";
import {
  bondLabel,
  decide,
  interact,
  restorePet,
  STORAGE_KEY,
  tick,
  type Action,
} from "./engine";
import { closeWindow, compactWindow, dragWindow, native } from "./desktop";
import {
  JevController,
  nativeJev,
  canAskJev,
  jevObservation,
  jevMessages,
} from "./jev";

const app = document.querySelector<HTMLDivElement>("#app")!;
document.body.classList.toggle("desktop", native);
app.innerHTML = `
  <header class="site-header"><a class="wordmark" href="./"><span class="brand-icon">✳</span> littlelife<span class="version">EARLY DAYS / 0.1</span></a><span class="header-note">Small presence. Softer days.</span></header>
  <main class="layout">
    <section class="intro"><div class="eyebrow"><span class="dot"></span> A LITTLE COMPANY FOR YOUR EVERYDAY</div>
      <h1>Life is better<br>with a little<br><em>someone.</em></h1>
      <p>A tiny creature. A quiet companion.<br>No tasks to finish. Just a little life beside yours.</p>
      <div class="intro-footer"><span class="sprout">❋</span><div>Meet your first little friend.<br><strong>Made to keep you company, offline.</strong></div></div>
      <div class="edition">NO ACCOUNTS &nbsp; / &nbsp; OFFLINE BY DEFAULT &nbsp; / &nbsp; JUST MOSS</div>
    </section>
    <section class="companion" aria-label="Your companion">
      <div class="card-top"><span class="card-label"><span class="dot"></span> YOUR LITTLE CORNER</span><div class="window-tools"><button id="compact" class="icon-button" aria-label="Switch to compact companion" title="Compact companion">↙</button><button id="quit" class="icon-button" aria-label="Quit LittleLife" title="Quit">×</button></div></div>
      <div class="stage" id="stage"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="speck s1">✦</span><span class="speck s2">·</span><span class="speck s3">✧</span><div class="speech" id="speech" role="status">Oh, hello there.</div>
        <div class="pet-position" id="pet-position"><button id="pet" class="pet-button" aria-label="Pet Moss">${character()}</button></div>
        <span class="stage-caption">a little wild. a little wonderful.</span>
      </div>
      <div class="profile"><div><div class="name-line"><h2 id="pet-name">Moss</h2><span class="species">LEAF SPIRIT</span></div><p><span class="status-dot"></span><span id="action-label">Settling in</span></p></div><span class="profile-mark">❋</span></div>
      <div class="vitals"><div><div class="vital-label"><span>Energy</span><span id="energy-value"></span></div><div class="meter" role="meter" aria-label="Energy" aria-valuemin="0" aria-valuemax="100" id="energy-meter"><span id="energy-bar"></span></div></div><div><div class="vital-label"><span>Your bond</span><span id="bond-value"></span></div><div class="meter bond" role="meter" aria-label="Bond" aria-valuemin="0" aria-valuemax="100" id="bond-meter"><span id="bond-bar"></span></div></div></div>
      <div class="actions"><button id="pet-action"><span aria-hidden="true">♡</span> Pet</button><button id="play"><span aria-hidden="true">✧</span> Play</button><button id="rest"><span aria-hidden="true">☾</span> Rest</button></div>
      <div class="bottom-row"><span id="bond-label">Getting acquainted</span><button id="settings-toggle" aria-expanded="false" aria-controls="settings">Little settings <span>⚙</span></button></div>
      <section id="settings" class="settings" hidden aria-label="Companion settings"><form id="name-form"><label for="name">A name for your friend</label><div class="name-input"><input id="name" maxlength="24" required autocomplete="off"/><button type="submit">Save</button></div></form><label class="toggle"><span>Quiet company<small>Rest and observe, without wandering</small></span><input type="checkbox" id="quiet"/></label><label class="toggle"><span>Reduce motion<small>Keep animations gentle and still</small></span><input type="checkbox" id="motion"/></label><button class="pause-button" id="pause">Pause companion</button><p class="storage-note" id="storage-note">Your little life is saved on this device.</p><p class="settings-note">Reacts to your cursor inside this window. No screen reading or background activity tracking.</p><fieldset class="jev-settings"><legend>Optional Jev behavior</legend><p id="jev-description" class="settings-note">Desktop only. Your key stays in your OS credential store. When enabled, only energy, bond, time since interaction here, cursor proximity, and the last action are sent to TypeSafe. Provider charges may apply.</p><div id="jev-native" hidden><form id="jev-key-form"><label for="jev-key">TypeSafe API key</label><div class="name-input"><input id="jev-key" type="password" autocomplete="off" spellcheck="false" maxlength="512" placeholder="Paste your own key"/><button id="jev-save" type="submit">Save key</button></div></form><button class="pause-button" id="jev-forget" type="button">Remove saved key</button><label class="toggle"><span>Request cap per app session<small>Counts attempts, including failures. Maximum 120.</small></span><input id="jev-limit" type="number" min="1" max="120" value="20" aria-label="Jev session request cap"/></label><label class="toggle"><span>Enable Jev this session<small>Allow the pet state above to be sent to TypeSafe</small></span><input id="jev-enabled" type="checkbox"/></label><button id="jev-limit-save" class="pause-button" type="button">Apply request cap</button><p class="settings-note" id="jev-usage">0 / 20 requests this session</p></div><p id="jev-status" class="settings-note" role="status">Offline behavior is always available. Jev setup is available in the Windows and macOS desktop app.</p></fieldset></section>
      <div class="compact-controls"><button id="expand">↗ <span>Open little corner</span></button><button id="move" aria-label="Drag companion" title="Drag companion">↔</button><button id="compact-quit" aria-label="Quit LittleLife">×</button></div>
    </section>
    <footer class="page-footer"><span>Grows on you. Never grows up.</span><span><span id="provider-label">OFFLINE & CONTENT</span> <i class="dot"></i></span></footer>
  </main><div class="toast" id="toast" role="status" hidden></div>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let raw: string | null = null;
let storageAvailable = true;
try {
  raw = localStorage.getItem(STORAGE_KEY);
} catch {
  storageAvailable = false;
}
let state = restorePet(raw);
const jev = new JevController(nativeJev, renderJev);
function renderJev() {
  const status = jev.status;
  $("provider-label").textContent = status.enabled
    ? "JEV ENABLED"
    : "OFFLINE & CONTENT";
  $("jev-native").hidden = !native || !status.supported;
  $<HTMLInputElement>("jev-enabled").checked = status.enabled;
  $<HTMLInputElement>("jev-enabled").disabled = !status.hasKey;
  $<HTMLButtonElement>("jev-forget").disabled = !status.hasKey;
  $("jev-usage").textContent =
    `${status.requests} / ${status.limit} requests this session · ${status.inputTokens + status.outputTokens} reported tokens · at most 1 request/minute`;
  $("jev-status").textContent = jev.message;
}
let jevSettingsBusy = false;
async function updateJev(operation: () => Promise<void>) {
  if (jevSettingsBusy) return;
  jevSettingsBusy = true;
  for (const id of ["jev-save", "jev-forget", "jev-enabled", "jev-limit-save"])
    $<HTMLButtonElement>(id).disabled = true;
  try {
    await operation();
  } catch (error) {
    jev.message =
      jevMessages[typeof error === "string" ? error : "offline"] ??
      "Jev setup failed. Your friend continues offline.";
  } finally {
    jevSettingsBusy = false;
    $("jev-save").removeAttribute("disabled");
    $("jev-limit-save").removeAttribute("disabled");
    renderJev();
  }
}
$("jev-key-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $<HTMLInputElement>("jev-key");
  const key = input.value;
  input.value = "";
  void updateJev(() => jev.saveKey(key));
});
$("jev-forget").addEventListener("click", () => {
  void updateJev(() => jev.forgetKey());
});
function configureJev(enabled: boolean) {
  const limit = Number($<HTMLInputElement>("jev-limit").value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 120) {
    notify("Choose a request cap between 1 and 120.");
    renderJev();
    return;
  }
  void updateJev(() => jev.configure(enabled, limit));
}
$("jev-enabled").addEventListener("change", () =>
  configureJev($<HTMLInputElement>("jev-enabled").checked),
);
$("jev-limit-save").addEventListener("click", () =>
  configureJev(jev.status.enabled),
);
if (native)
  void jev.refresh().catch(() => {
    jev.message =
      "The OS credential store is unavailable. Your friend continues offline.";
    renderJev();
  });
const media = matchMedia("(prefers-reduced-motion: reduce)");
let action: Action = "idle";
let paused = false;
let resting = false;
let compact = false;
let cursorNearby = false;
let lastInteraction = Date.now();
let overrideUntil = 0;
let lastDecision = 0;
let lastTick = Date.now();
let lastSave = 0;
let x = 0;
let direction = 1;
let toastTimer: ReturnType<typeof setTimeout>;
const labels: Record<Action, string> = {
  idle: "Happy to be here",
  walk: "A little exploring",
  sleep: "Dreaming of the forest",
  jump: "A little burst of joy",
  curious: "What are you up to?",
  happy: "That felt lovely",
};

function notify(message: string) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $("toast").hidden = true;
  }, 3500);
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  $("storage-note").textContent = storageAvailable
    ? "Your little life is saved on this device."
    : "Storage is unavailable. This visit will not be saved.";
}
function render() {
  $("pet-name").textContent = state.name;
  $("pet").setAttribute("aria-label", `Pet ${state.name}`);
  $("action-label").textContent = paused
    ? "Taking a quiet pause"
    : labels[action];
  $("energy-value").textContent = `${Math.round(state.energy)}%`;
  $("bond-value").textContent = `${Math.round(state.affection)}%`;
  $("energy-bar").style.width = `${state.energy}%`;
  $("bond-bar").style.width = `${state.affection}%`;
  $("energy-meter").setAttribute(
    "aria-valuenow",
    String(Math.round(state.energy)),
  );
  $("bond-meter").setAttribute(
    "aria-valuenow",
    String(Math.round(state.affection)),
  );
  $("bond-label").textContent = bondLabel(state);
  $("stage").dataset.action = action;
  $("stage").classList.toggle("paused", paused);
  document.body.classList.toggle(
    "reduce-motion",
    state.reducedMotion || media.matches,
  );
  $("rest").textContent = resting ? "☀ Wake up" : "☾ Rest";
  $("rest").setAttribute("aria-pressed", String(resting));
  $("pause").textContent = paused ? "Resume companion" : "Pause companion";
  $("pause").setAttribute("aria-pressed", String(paused));
  for (const id of ["pet-action", "play", "rest", "pet"])
    $<HTMLButtonElement>(id).disabled = paused;
}
function setAction(next: Action, speech?: string) {
  action = next;
  if (speech) $("speech").textContent = speech;
  render();
}
function activity() {
  lastInteraction = Date.now();
}
function care(kind: "pet" | "play" | "rest") {
  if (paused) return;
  jev.invalidate();
  activity();
  if (kind === "rest") {
    resting = !resting;
    overrideUntil = 0;
    setAction(
      resting ? "sleep" : "idle",
      resting ? "A tiny nap sounds nice." : "Hello again, world.",
    );
  } else {
    resting = false;
    // Prevent rapid clicks from farming energy or affection.
    if (Date.now() >= overrideUntil) state = interact(state, kind);
    overrideUntil = Date.now() + 4000;
    setAction(
      kind === "play" ? "jump" : "happy",
      kind === "play" ? "Catch a little joy!" : "My favourite human.",
    );
  }
  save();
}
function reportError(error: unknown) {
  console.error(error);
  notify("That window action did not work. Please try again.");
}
async function setCompact(value: boolean) {
  await compactWindow(value);
  compact = value;
  document.body.classList.toggle("compact", compact);
  $("compact").setAttribute(
    "aria-label",
    compact ? "Expand companion" : "Switch to compact companion",
  );
  if (compact) {
    $("settings").hidden = true;
    $("settings-toggle").setAttribute("aria-expanded", "false");
  }
  requestAnimationFrame(() => (compact ? $("expand") : $("compact")).focus());
}
$("pet").addEventListener("click", () => care("pet"));
$("pet-action").addEventListener("click", () => care("pet"));
$("play").addEventListener("click", () => care("play"));
$("rest").addEventListener("click", () => care("rest"));
$("compact").addEventListener("click", () => {
  setCompact(true).catch(reportError);
});
$("expand").addEventListener("click", () => {
  setCompact(false).catch(reportError);
});
for (const id of ["quit", "compact-quit"])
  $(id).addEventListener("click", () => {
    save();
    closeWindow().catch(reportError);
  });
if (!native) {
  $("quit").hidden = true;
  $("compact-quit").hidden = true;
  $("move").hidden = true;
}
$("move").addEventListener("pointerdown", () => {
  dragWindow().catch(reportError);
});
$("settings-toggle").addEventListener("click", () => {
  const open = $("settings").hidden;
  $("settings").hidden = !open;
  $("settings-toggle").setAttribute("aria-expanded", String(open));
  if (open) {
    $<HTMLInputElement>("name").value = state.name;
    $("name").focus();
  }
});
$("name-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $<HTMLInputElement>("name").value.trim().slice(0, 24);
  if (!name) {
    notify("Give your friend a little name first.");
    return;
  }
  state.name = name;
  save();
  render();
  notify(`Hello, ${name}.`);
});
$<HTMLInputElement>("quiet").checked = state.quiet;
$<HTMLInputElement>("motion").checked = state.reducedMotion;
for (const [id, key] of [
  ["quiet", "quiet"],
  ["motion", "reducedMotion"],
] as const) {
  $(id).addEventListener("change", () => {
    jev.invalidate();
    state[key] = $<HTMLInputElement>(id).checked;
    setAction("idle");
    save();
  });
}
$("pause").addEventListener("click", () => {
  jev.invalidate();
  paused = !paused;
  resting = false;
  overrideUntil = 0;
  activity();
  setAction(
    "idle",
    paused ? "Take your time. I’ll be here." : "Ready when you are.",
  );
});
document.addEventListener("pointerdown", activity);
document.addEventListener("keydown", (event) => {
  activity();
  if (event.key === "Escape" && compact) setCompact(false).catch(reportError);
});
$("stage").addEventListener("pointermove", (event) => {
  activity();
  const bounds = $("pet").getBoundingClientRect();
  cursorNearby =
    Math.hypot(
      event.clientX - (bounds.x + bounds.width / 2),
      event.clientY - (bounds.y + bounds.height / 2),
    ) < 135;
  if (
    cursorNearby &&
    state.energy >= 24 &&
    !paused &&
    !resting &&
    Date.now() > overrideUntil
  )
    setAction("curious", "Oh! Is that for me?");
});
$("stage").addEventListener("pointerleave", () => {
  cursorNearby = false;
});
// Only the handle starts native dragging, leaving the pet itself easy to click.
document.querySelector(".card-label")!.addEventListener("pointerdown", () => {
  dragWindow().catch(reportError);
});
media.addEventListener("change", () => {
  jev.invalidate();
  render();
});
window.addEventListener("pagehide", save);
document.addEventListener("visibilitychange", () => {
  jev.invalidate();
  save();
  lastTick = Date.now();
  if (!document.hidden) activity();
});
setInterval(() => {
  if (document.hidden) return;
  const now = Date.now();
  if (!paused) {
    state = tick(state, action, (now - lastTick) / 1000, now);
    if (now > overrideUntil && now - lastDecision >= 6000) {
      const next = resting
        ? "sleep"
        : decide(
            { ...state, reducedMotion: state.reducedMotion || media.matches },
            {
              idleSeconds: (now - lastInteraction) / 1000,
              cursorNearby,
              paused,
            },
            Math.random(),
          );
      setAction(
        next,
        next === "sleep"
          ? "Just resting my leaves."
          : next === "walk"
            ? "A small adventure."
            : next === "curious"
              ? "You seem interesting."
              : "Nice to do a little nothing.",
      );
      lastDecision = now;
      const pet = {
        ...state,
        reducedMotion: state.reducedMotion || media.matches,
      };
      const observation = {
        idleSeconds: (now - lastInteraction) / 1000,
        cursorNearby,
        paused,
      };
      if (native && canAskJev(pet, observation, resting)) {
        void jev.consider(
          jevObservation(pet, observation, action),
          () =>
            !document.hidden &&
            Date.now() > overrideUntil &&
            canAskJev(
              { ...state, reducedMotion: state.reducedMotion || media.matches },
              {
                idleSeconds: (Date.now() - lastInteraction) / 1000,
                cursorNearby,
                paused,
              },
              resting,
            ),
          (next) => setAction(next, "A little idea came to me."),
        );
      }
    }
    if (action === "walk" && !state.reducedMotion && !media.matches) {
      const limit = Math.max(0, ($("stage").clientWidth - 210) / 2);
      x = Math.max(-limit, Math.min(limit, x + direction * 9));
      if (Math.abs(x) >= limit) direction *= -1;
    }
    $("pet-position").style.transform = `translateX(${x}px)`;
  }
  lastTick = now;
  if (now - lastSave >= 15000) {
    save();
    lastSave = now;
  }
  render();
}, 1000);
save();
render();
