import "./style.css";
import { Roamer } from "./roaming";
import { character } from "./character";
import { CHARACTERS } from "./pixel/art";
import { APPEARANCE_KEY, restoreAppearance } from "./pixel/appearance";
import { FACINGS, POSES, type Facing, type Pose } from "./pixel/engine";
import { PixelPlayer } from "./pixel/player";
import {
  bondLabel,
  clamp,
  decide,
  interact,
  restorePet,
  STORAGE_KEY,
  tick,
  type Action,
} from "./engine";
import {
  closeWindow,
  compactWindow,
  connectDesktop,
  desktopAction,
  desktopError,
  desktopRoam,
  desktopAttention,
  desktopLively,
  connectSignals,
  desktopMovement,
  type Movement,
  dragWindow,
  native,
  type DesktopState,
} from "./desktop";
import { busy, greeting, grooving, UNKNOWN, vibe, type Sense } from "./mood";
import {
  answerCare,
  CARE_KEY,
  careLine,
  createCare,
  minutes,
  REMINDERS,
  restoreCare,
  stepCare,
} from "./reminders";
import {
  JevController,
  nativeJev,
  canAskJev,
  jevObservation,
  jevMessages,
} from "./jev";

const app = document.querySelector<HTMLDivElement>("#app")!;
document.body.classList.toggle("desktop", native);
document.documentElement.classList.toggle("native", native);
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
      <div class="stage" id="stage"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="speck s1">✦</span><span class="speck s2">·</span><span class="speck s3">✧</span><div class="speech" id="speech" role="status">Oh, hello there.</div><div class="bubble" id="bubble" hidden><p id="bubble-text" role="status"></p><div class="bubble-actions" id="bubble-actions"><button id="care-done" type="button">Done ✓</button><button id="care-later" type="button">Later</button></div></div>
        <div class="pet-position" id="pet-position"><button id="pet" class="pet-button" aria-label="Pet Moss">${character()}</button></div>
        <span class="stage-caption">a little wild. a little wonderful.</span>
      </div>
      <div class="profile"><div><div class="name-line"><h2 id="pet-name">Moss</h2><span class="species" id="character-title">LEAF SPIRIT</span></div><p><span class="status-dot"></span><span id="action-label">Settling in</span></p></div><button class="appearance-button" id="open-characters" type="button">Characters ↗</button></div>
      <div class="vitals"><div><div class="vital-label"><span>Energy</span><span id="energy-value"></span></div><div class="meter" role="meter" aria-label="Energy" aria-valuemin="0" aria-valuemax="100" id="energy-meter"><span id="energy-bar"></span></div></div><div><div class="vital-label"><span>Your bond</span><span id="bond-value"></span></div><div class="meter bond" role="meter" aria-label="Bond" aria-valuemin="0" aria-valuemax="100" id="bond-meter"><span id="bond-bar"></span></div></div></div>
      <div class="actions"><button id="pet-action"><span aria-hidden="true">♡</span> Pet</button><button id="play"><span aria-hidden="true">✧</span> Play</button><button id="rest"><span aria-hidden="true">☾</span> Rest</button></div>
      <div class="bottom-row"><span id="bond-label">Getting acquainted</span><button id="settings-toggle" aria-expanded="false" aria-controls="settings">Little settings <span>⚙</span></button></div>
      <section id="settings" class="settings" hidden aria-label="Companion settings"><form id="name-form"><label for="name">A name for your friend</label><div class="name-input"><input id="name" maxlength="24" required autocomplete="off"/><button type="submit">Save</button></div></form><label class="toggle"><span>Quiet company<small>Rest and observe, without wandering</small></span><input type="checkbox" id="quiet"/></label><label class="toggle"><span>Reduce motion<small>Keep animations gentle and still</small></span><input type="checkbox" id="motion"/></label><button class="pause-button" id="pause">Pause companion</button><p class="storage-note" id="storage-note">Your little life is saved on this device.</p><p class="settings-note">Never reads your screen, keystrokes or files. In the desktop app, your friend can notice the kind of app in front; that stays on this device and can be turned off below.</p><fieldset class="care-settings"><legend>Gentle reminders</legend><label class="toggle"><span>Remind me to look after myself<small>Ignore one for long enough and your friend gets cross</small></span><input type="checkbox" id="care-enabled"/></label><div class="care-grid"><label for="care-water">Drink water every</label><input id="care-water" type="number" min="0" max="240" step="5"/><span>min</span><label for="care-eyes">Rest my eyes every</label><input id="care-eyes" type="number" min="0" max="240" step="5"/><span>min</span><label for="care-break">Take a break every</label><input id="care-break" type="number" min="0" max="240" step="5"/><span>min</span></div><p class="settings-note" id="care-note">0 turns one off. Click your friend or Done when you have done it. In the desktop app, three minutes away counts as a break, and reminders wait during calls and videos.</p></fieldset><details class="pixel-workshop" id="pixel-workshop"><summary>Pixel character workshop</summary><p class="settings-note">One pixel rig, many little lives. Switch characters, recolor their clothes, and try different poses.</p><div class="workshop-row"><label for="character-select">Character</label><select id="character-select">${CHARACTERS.map((c) => `<option value="${c.id}">${c.name} · ${c.title.toLowerCase()}</option>`).join("")}</select></div><div class="pixel-colors"><label for="pixel-primary">Outfit<input type="color" id="pixel-primary"/></label><label for="pixel-accent">Accent<input type="color" id="pixel-accent"/></label><button id="pixel-reset" type="button">Reset colors</button></div><div class="workshop-row"><label for="pixel-facing">Direction</label><select id="pixel-facing"><option value="auto">Automatic</option>${FACINGS.map((f) => `<option value="${f}">${f}</option>`).join("")}</select></div><div class="workshop-row"><label for="pixel-pose">Pose preview</label><select id="pixel-pose"><option value="auto">Follow companion behavior</option>${POSES.map((p) => `<option value="${p}">${p}</option>`).join("")}</select></div><p class="settings-note" id="pixel-note">64 × 80 logical pixels. Colors and character stay on this device. Poses are a visual preview; care actions return to automatic behavior.</p><p class="settings-note" id="appearance-storage" role="status"></p></details><fieldset class="desktop-settings" id="desktop-settings" hidden><legend>Desktop companion</legend><p class="settings-note">Companion mode shows only your character. Double-click or right-click it, or use the tray, to open these controls. Drag the character to reposition it.</p><label class="toggle"><span>Roam around the desktop</span><input id="desktop-roaming" type="checkbox" checked/></label><label for="desktop-movement">Movement</label><select id="desktop-movement"><option value="walk">Walking</option><option value="fly">Flying</option><option value="swim">Swimming</option></select><label class="toggle"><span>Keep above other windows</span><input id="desktop-top" type="checkbox" checked/></label><label class="toggle"><span>Notice what I'm doing<small>Coding, music, a video or a call changes how your friend behaves. Only the kind of app in front, sound playing and time since your last input are checked.</small></span><input id="desktop-awareness" type="checkbox" checked/></label><button type="button" id="desktop-pin" class="pause-button">Compact and let clicks pass through</button><p class="settings-note">Click-through applies to the entire companion. To pet or move it again, choose <strong>Interact / restore clicks</strong> in the LittleLife tray or menu-bar icon.</p><div class="desktop-actions"><button type="button" id="desktop-hide">Hide to tray</button><button type="button" id="desktop-reset">Reset position</button></div><p id="desktop-status" class="settings-note" role="status"></p></fieldset><fieldset class="jev-settings"><legend>Optional Jev behavior</legend><p id="jev-description" class="settings-note">Desktop only. Your key stays in your OS credential store. When enabled, only energy, bond, time since interaction here, cursor proximity, and the last action are sent to TypeSafe. Provider charges may apply.</p><div id="jev-native" hidden><form id="jev-key-form"><label for="jev-key">TypeSafe API key</label><div class="name-input"><input id="jev-key" type="password" autocomplete="off" spellcheck="false" maxlength="512" placeholder="Paste your own key"/><button id="jev-save" type="submit">Save key</button></div></form><button class="pause-button" id="jev-forget" type="button">Remove saved key</button><label class="toggle"><span>Request cap per app session<small>Counts attempts, including failures. Maximum 120.</small></span><input id="jev-limit" type="number" min="1" max="120" value="20" aria-label="Jev session request cap"/></label><label class="toggle"><span>Enable Jev this session<small>Allow the pet state above to be sent to TypeSafe</small></span><input id="jev-enabled" type="checkbox"/></label><button id="jev-limit-save" class="pause-button" type="button">Apply request cap</button><p class="settings-note" id="jev-usage">0 / 20 requests this session</p></div><p id="jev-status" class="settings-note" role="status">Offline behavior is always available. Jev setup is available in the Windows and macOS desktop app.</p></fieldset></section>
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
let appearanceRaw: string | null = null;
try {
  appearanceRaw = localStorage.getItem(APPEARANCE_KEY);
} catch {
  /* Defaults remain usable. */
}
let appearance = restoreAppearance(appearanceRaw);
let previewPose: Pose | "auto" = "auto";
const pixelPlayer = new PixelPlayer($<HTMLCanvasElement>("pixel-character"));
function selectedCharacter() {
  return CHARACTERS.find((c) => c.id === appearance.character)!;
}
function saveAppearance() {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
    $("appearance-storage").textContent = "";
  } catch {
    $("appearance-storage").textContent =
      "Appearance storage is unavailable. Changes last for this visit.";
  }
}
function syncAppearanceControls() {
  const character = selectedCharacter();
  $<HTMLSelectElement>("character-select").value = character.id;
  $<HTMLInputElement>("pixel-primary").value =
    appearance.primary ?? character.palette.p;
  $<HTMLInputElement>("pixel-accent").value =
    appearance.accent ?? character.palette.a;
  $<HTMLSelectElement>("pixel-facing").value = appearance.facing;
  $<HTMLSelectElement>("pixel-pose").value = previewPose;
}
$("character-select").addEventListener("change", () => {
  const previous = selectedCharacter();
  appearance = {
    version: 1,
    character: $<HTMLSelectElement>("character-select").value,
    facing: appearance.facing,
  };
  if (state.name === previous.name) {
    state.name = selectedCharacter().name;
    if ($<HTMLInputElement>("name").value === previous.name)
      $<HTMLInputElement>("name").value = state.name;
  }
  syncAppearanceControls();
  saveAppearance();
  save();
  render();
});
for (const [id, key] of [
  ["pixel-primary", "primary"],
  ["pixel-accent", "accent"],
] as const) {
  $(id).addEventListener("input", () => {
    appearance[key] = $<HTMLInputElement>(id).value;
    saveAppearance();
    render();
  });
}
$("pixel-facing").addEventListener("change", () => {
  appearance.facing = $<HTMLSelectElement>("pixel-facing").value as
    Facing | "auto";
  saveAppearance();
  render();
});
$("pixel-pose").addEventListener("change", () => {
  previewPose = $<HTMLSelectElement>("pixel-pose").value as Pose | "auto";
  render();
});
$("pixel-reset").addEventListener("click", () => {
  delete appearance.primary;
  delete appearance.accent;
  syncAppearanceControls();
  saveAppearance();
  render();
});
$("open-characters").addEventListener("click", () => {
  $("settings").hidden = false;
  $("settings-toggle").setAttribute("aria-expanded", "true");
  $<HTMLInputElement>("name").value = state.name;
  $<HTMLDetailsElement>("pixel-workshop").open = true;
  $("character-select").focus();
});
syncAppearanceControls();
let jevSettingsBusy = false;
const jev = new JevController(nativeJev, renderJev);
function renderJev() {
  const status = jev.status;
  $("provider-label").textContent = status.enabled
    ? "JEV ENABLED"
    : "OFFLINE & CONTENT";
  $("jev-native").hidden = !native || !status.supported;
  $<HTMLInputElement>("jev-enabled").checked = status.enabled;
  $<HTMLInputElement>("jev-enabled").disabled =
    jevSettingsBusy || !status.hasKey;
  $<HTMLButtonElement>("jev-forget").disabled =
    jevSettingsBusy || !status.hasKey;
  for (const id of ["jev-save", "jev-limit-save"])
    $<HTMLButtonElement>(id).disabled = jevSettingsBusy;
  $("jev-usage").textContent =
    `${status.requests} / ${status.limit} requests this session · ${status.inputTokens + status.outputTokens} reported tokens · at most 1 request/minute`;
  $("jev-status").textContent = jev.message;
}
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
let desktopVisible = !native;
let desktopState: DesktopState | undefined;
let desktopBusy = false;
let sense: Sense = UNKNOWN;
let sensed = false;
let falling = false;
let gliding = false;
let peeking = false;
let lively = false;
let lastFollowLine = 0;
let careRaw: string | null = null;
try {
  careRaw = localStorage.getItem(CARE_KEY);
} catch {
  /* Defaults remain usable. */
}
let careSettings = restoreCare(careRaw);
let careState = createCare(careSettings, Date.now());
let bubbleText = "";
let bubbleUntil = 0;
let attention = false;
/** The desktop app is telling us what the person is doing. */
function aware() {
  return native && sensed && desktopState?.awareness === true;
}
/** A short line above the character, for moments worth a word. */
function say(text: string, milliseconds = 6000) {
  bubbleText = text;
  bubbleUntil = Date.now() + milliseconds;
  $("speech").textContent = text;
}
function applyDesktopState(next: DesktopState) {
  const shouldFocus =
    next.visible &&
    !next.clickThrough &&
    (compact !== next.compact || !desktopVisible);
  jev.invalidate();
  const previous = desktopState;
  desktopState = next;
  if (desktopVisible !== next.visible) lastTick = Date.now();
  desktopVisible = next.visible;
  const entering = !compact && next.compact;
  compact = next.compact;
  if (entering) cursorNearby = false;
  if (
    compact &&
    (entering || !previous?.roaming || previous.movement !== next.movement) &&
    next.roaming &&
    !paused &&
    !resting &&
    !state.quiet
  ) {
    action = "walk";
    lastDecision = Date.now();
  }
  document.body.classList.toggle("compact", compact);
  document.documentElement.classList.toggle("companion-mode", compact);
  roamBlocked = false;
  // Any native action may have moved the window, so roaming is asked for afresh.
  roamer.setActive(false);
  falling = false;
  gliding = false;
  peeking = false;
  if (!next.awareness) {
    sense = UNKNOWN;
    sensed = false;
  }
  $<HTMLInputElement>("desktop-awareness").checked = next.awareness;
  $("desktop-settings").hidden = !native;
  $<HTMLInputElement>("desktop-roaming").checked = next.roaming;
  $<HTMLSelectElement>("desktop-movement").value = next.movement;
  $<HTMLInputElement>("desktop-top").checked = next.alwaysOnTop;
  for (const id of ["desktop-pin", "desktop-hide"])
    $<HTMLButtonElement>(id).disabled = !next.trayAvailable || desktopBusy;
  $("desktop-status").textContent = !next.trayAvailable
    ? "The tray is unavailable. Hiding and click-through are disabled."
    : !next.storageAvailable
      ? "Window preferences cannot be saved. This session remains usable."
      : "Position, size mode and always-on-top are saved. Click-through is off at every launch.";
  if (compact) {
    $("settings").hidden = true;
    $("settings-toggle").setAttribute("aria-expanded", "false");
  }
  positionCharacter();
  pixelPlayer.fit();
  render();
  if (shouldFocus && !compact)
    requestAnimationFrame(() => $("compact").focus());
}
async function changeDesktop(
  action:
    | "hide"
    | "reset"
    | "click_through"
    | "always_on_top"
    | "roaming"
    | "awareness",
  value?: boolean,
) {
  if (desktopBusy) return;
  desktopBusy = true;
  for (const id of [
    "desktop-pin",
    "desktop-hide",
    "desktop-reset",
    "desktop-top",
  ])
    $<HTMLButtonElement>(id).disabled = true;
  try {
    applyDesktopState(await desktopAction(action, value));
  } catch (error) {
    notify(desktopError(error));
  } finally {
    desktopBusy = false;
    $("desktop-reset").removeAttribute("disabled");
    $("desktop-top").removeAttribute("disabled");
    if (desktopState) applyDesktopState(desktopState);
  }
}
$("desktop-top").addEventListener("change", () => {
  void changeDesktop(
    "always_on_top",
    $<HTMLInputElement>("desktop-top").checked,
  );
});
$("desktop-pin").addEventListener("click", () => {
  void changeDesktop("click_through", true);
});
$("desktop-hide").addEventListener("click", () => {
  void changeDesktop("hide");
});
$("desktop-reset").addEventListener("click", () => {
  void changeDesktop("reset");
});
$("desktop-roaming").addEventListener("change", () => {
  void changeDesktop("roaming", $<HTMLInputElement>("desktop-roaming").checked);
});
$("desktop-awareness").addEventListener("change", () => {
  void changeDesktop(
    "awareness",
    $<HTMLInputElement>("desktop-awareness").checked,
  );
});
$("desktop-movement").addEventListener("change", () => {
  void desktopMovement(
    $<HTMLSelectElement>("desktop-movement").value as Movement,
  )
    .then(applyDesktopState)
    .catch((error) => notify(desktopError(error)));
});
let cursorNearby = false;
let lastInteraction = Date.now();
let overrideUntil = 0;
let lastDecision = 0;
let lastTick = Date.now();
let lastSave = 0;
let x = 0;
let direction = 1;
let roamHoldUntil = 0;
let roamBlocked = false;
const roamer = new Roamer(desktopRoam, (error) => {
  roamBlocked = true;
  notify(desktopError(error));
});
function roamingAllowed() {
  return (
    native &&
    compact &&
    desktopVisible &&
    desktopState?.roaming === true &&
    action === "walk" &&
    previewPose === "auto" &&
    !paused &&
    !resting &&
    !state.quiet &&
    !state.reducedMotion &&
    !media.matches &&
    !document.hidden &&
    !cursorNearby &&
    !roamBlocked &&
    !careState.active &&
    Date.now() >= roamHoldUntil
  );
}
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
  const character = selectedCharacter();
  roamer.setActive(roamingAllowed());
  const reminder = paused ? undefined : careState.active;
  const travelling = native && compact && (action === "walk" || gliding);
  const style = desktopState?.movement ?? "walk";
  const pose: Pose =
    previewPose !== "auto"
      ? previewPose
      : travelling && falling
        ? "jump"
        : gliding && peeking
          ? "curious" // Half way onto a screen, having a look first.
          : gliding && action !== "walk"
            ? style // Still on the way back into view after being asked to stop.
            : reminder
              ? (["wave", "jump", "angry"] as const)[reminder.level]
              : travelling
                ? style
                : action === "idle" && aware() && vibe(sense) === "watch"
                  ? "sit"
                  : action === "idle" && aware() && grooving(sense)
                    ? "dance"
                    : action;
  const text = reminder
    ? careLine(reminder.kind, reminder.level)
    : compact && !paused && Date.now() < bubbleUntil
      ? bubbleText
      : "";
  $("bubble").hidden = !text;
  $("bubble").dataset.level = String(reminder?.level ?? "");
  $("bubble-text").textContent = text;
  $("bubble-actions").hidden = !reminder;
  $("care-later").hidden = reminder?.level === 2;
  const free =
    native &&
    compact &&
    desktopVisible &&
    desktopState?.roaming === true &&
    previewPose === "auto" &&
    action !== "sleep" &&
    !paused &&
    !resting &&
    !state.quiet &&
    !state.reducedMotion &&
    !media.matches;
  if (lively !== free) {
    lively = free;
    void desktopLively(lively).catch(() => undefined);
  }
  if (attention !== (compact && !!text)) {
    attention = compact && !!text;
    void desktopAttention(attention).catch(() => undefined);
  }
  const facing =
    appearance.facing === "auto"
      ? ["walk", "fly", "swim"].includes(pose)
        ? direction > 0
          ? "right"
          : "left"
        : "front"
      : appearance.facing;
  pixelPlayer.setState({
    character,
    pose,
    facing,
    primary: appearance.primary,
    accent: appearance.accent,
    paused: paused || !desktopVisible,
    still: state.reducedMotion || media.matches,
  });
  $("character-title").textContent = character.title;
  $("pixel-character").setAttribute(
    "data-preview",
    String(previewPose !== "auto"),
  );
  $("pet-name").textContent = state.name;
  $("pet").setAttribute("aria-label", `Pet ${state.name}`);
  $("action-label").textContent = paused
    ? "Taking a quiet pause"
    : reminder
      ? ["Looking out for you", "Still waiting…", "Properly cross"][
          reminder.level
        ]
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
  previewPose = "auto";
  $<HTMLSelectElement>("pixel-pose").value = "auto";
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
    setAction(kind === "play" ? "jump" : "happy");
    say(kind === "play" ? "Catch a little joy!" : "My favourite human.", 3500);
    render();
  }
  save();
}
/** The person did what was asked, or wants ten more minutes. */
function answerReminder(answer: "done" | "later") {
  const asked = careState.active;
  if (!asked || paused) return;
  careState = answerCare(careState, careSettings, Date.now(), answer);
  activity();
  resting = false;
  if (answer === "done") {
    state.affection = clamp(state.affection + 2);
    overrideUntil = Date.now() + 4000;
    action = "happy";
    say(
      asked.level === 2
        ? "Hmph… fine. Thank you."
        : "Thank you! That makes me happy.",
    );
  } else say("Okay, a little later. I'll be back.", 4000);
  save();
  render();
}
$("care-done").addEventListener("click", () => answerReminder("done"));
$("care-later").addEventListener("click", () => answerReminder("later"));
function saveCare() {
  try {
    localStorage.setItem(CARE_KEY, JSON.stringify(careSettings));
  } catch {
    /* The reminders still work for this visit. */
  }
}
function syncCareControls() {
  $<HTMLInputElement>("care-enabled").checked = careSettings.enabled;
  for (const kind of REMINDERS) {
    $<HTMLInputElement>(`care-${kind}`).value = String(careSettings[kind]);
    $<HTMLInputElement>(`care-${kind}`).disabled = !careSettings.enabled;
  }
}
for (const id of ["care-enabled", ...REMINDERS.map((kind) => `care-${kind}`)])
  $(id).addEventListener("change", () => {
    careSettings.enabled = $<HTMLInputElement>("care-enabled").checked;
    for (const kind of REMINDERS)
      careSettings[kind] = minutes(
        Number($<HTMLInputElement>(`care-${kind}`).value),
        careSettings[kind],
      );
    // New timings start counting from now.
    careState = createCare(careSettings, Date.now());
    syncCareControls();
    saveCare();
    render();
  });
syncCareControls();
function reportError(error: unknown) {
  console.error(error);
  notify("That window action did not work. Please try again.");
}
function walkLimit() {
  return Math.max(
    0,
    Math.floor(($("stage").clientWidth - $("pet-position").clientWidth) / 2),
  );
}
function positionCharacter() {
  const limit = native && compact ? 0 : walkLimit();
  x = Math.max(-limit, Math.min(limit, x));
  $("pet-position").style.transform = `translateX(${x}px)`;
}
window.addEventListener("resize", () => {
  positionCharacter();
  pixelPlayer.fit();
});
async function setCompact(value: boolean) {
  const next = await compactWindow(value);
  if (next) {
    applyDesktopState(next);
    return;
  }
  compact = value;
  document.body.classList.toggle("compact", compact);
  document.documentElement.classList.toggle("companion-mode", compact);
  positionCharacter();
  $("compact").setAttribute(
    "aria-label",
    compact ? "Expand companion" : "Switch to compact companion",
  );
  if (compact) {
    $("settings").hidden = true;
    $("settings-toggle").setAttribute("aria-expanded", "false");
  }
  requestAnimationFrame(() => {
    pixelPlayer.fit();
    if (!compact) $("compact").focus();
  });
}
let dragStart: { x: number; y: number } | undefined;
let wasDragged = false;
$("pet").addEventListener("pointerdown", (event) => {
  if (!native || !compact || event.button !== 0) return;
  roamHoldUntil = Date.now() + 10000;
  roamer.setActive(false);
  dragStart = { x: event.clientX, y: event.clientY };
  wasDragged = false;
});
$("pet").addEventListener("pointermove", (event) => {
  if (
    !dragStart ||
    Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) < 5
  )
    return;
  dragStart = undefined;
  wasDragged = true;
  void dragWindow().catch(reportError).finally(released);
});
/** After being put down, a walking friend drops to the floor and carries on. */
function released() {
  roamHoldUntil = Date.now() + 1500;
  clearTimeout(dropTimer);
  dropTimer = setTimeout(() => {
    if (
      !native ||
      !compact ||
      !desktopState?.roaming ||
      paused ||
      resting ||
      state.quiet ||
      careState.active ||
      Date.now() < overrideUntil
    )
      return;
    action = "walk";
    lastDecision = Date.now();
    render();
  }, 1600);
}
let dropTimer: ReturnType<typeof setTimeout>;
window.addEventListener("pointerup", () => {
  if (dragStart || wasDragged) released();
  dragStart = undefined;
});
$("pet").addEventListener("click", () => {
  if (!wasDragged) {
    if (careState.active) answerReminder("done");
    else care("pet");
  }
  wasDragged = false;
});
for (const event of ["dblclick", "contextmenu"] as const)
  $("pet").addEventListener(event, (event) => {
    if (!compact) return;
    event.preventDefault();
    setCompact(false).catch(reportError);
  });
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
// The expanded heading and compact character can start native dragging.
document.querySelector(".card-label")!.addEventListener("pointerdown", () => {
  dragWindow().catch(reportError);
});
media.addEventListener("change", () => {
  jev.invalidate();
  render();
});
window.addEventListener("pagehide", () => {
  roamer.setActive(false);
  save();
});
/** Look up when the pointer comes close, anywhere on the desktop. */
function noticeCursor(near: boolean) {
  if (!compact) return;
  cursorNearby = near;
  if (
    near &&
    state.energy >= 24 &&
    !paused &&
    !resting &&
    !careState.active &&
    Date.now() > overrideUntil
  )
    setAction("curious", "Oh! Is that for me?");
  else render();
}
function noticeActivity(next: Sense) {
  if (desktopState?.awareness === false) return;
  const before = sensed ? vibe(sense) : undefined;
  sense = next;
  sensed = true;
  const now = vibe(next);
  if (before !== undefined && before !== now && !paused) {
    const line = greeting(now, before);
    if (line && !careState.active) say(line);
    if (before === "away" && !resting) {
      activity();
      overrideUntil = Date.now() + 4000;
      action = "happy";
    } else lastDecision = 0;
  }
  render();
}
document.addEventListener("visibilitychange", () => {
  jev.invalidate();
  save();
  roamer.setActive(false);
  lastTick = Date.now();
  if (!document.hidden) activity();
});
setInterval(() => {
  if (document.hidden || !desktopVisible) return;
  const now = Date.now();
  if (!paused) {
    state = tick(state, action, (now - lastTick) / 1000, now);
    const stepped = stepCare(careState, careSettings, now, {
      awaySeconds: aware() ? sense.idleSeconds : 0,
      busy: aware() && busy(sense),
    });
    careState = stepped.care;
    if (stepped.event === "angry") {
      // Being ignored hurts a little.
      state.affection = clamp(state.affection - 3);
      save();
    } else if (stepped.event === "rested") {
      overrideUntil = now + 4000;
      action = "happy";
      say("Good break! Welcome back.");
    } else if (stepped.event === "ask") jev.invalidate();
    if (
      !careState.active &&
      now > overrideUntil &&
      now - lastDecision >= 6000
    ) {
      const next = resting
        ? "sleep"
        : decide(
            { ...state, reducedMotion: state.reducedMotion || media.matches },
            {
              // The desktop app knows about input anywhere; the preview only about itself.
              idleSeconds: aware()
                ? sense.idleSeconds
                : (now - lastInteraction) / 1000,
              cursorNearby,
              paused,
              sleeping: action === "sleep",
              vibe: aware() ? vibe(sense) : undefined,
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
            desktopVisible &&
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
      const limit = walkLimit();
      x = Math.max(-limit, Math.min(limit, x + direction * 9));
      if (Math.abs(x) >= limit) direction *= -1;
    }
    positionCharacter();
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

if (native) {
  void connectDesktop(applyDesktopState)
    .then((stop) => window.addEventListener("pagehide", stop, { once: true }))
    .catch((error) => notify(desktopError(error)));
  void connectSignals({
    motion(motion) {
      direction = motion.direction < 0 ? -1 : 1;
      falling = motion.falling;
      gliding = motion.moving === true;
      peeking = motion.peeking === true;
      render();
    },
    cursor: noticeCursor,
    followed() {
      // A word now and then, not at every change of screen.
      if (careState.active || Date.now() - lastFollowLine < 90_000) return;
      lastFollowLine = Date.now();
      const lines = [
        "Wait for me!",
        "Where are we going?",
        "Right behind you.",
      ];
      say(lines[Math.floor(Math.random() * lines.length)], 4500);
      render();
    },
    activity: noticeActivity,
  })
    .then((stop) => window.addEventListener("pagehide", stop, { once: true }))
    .catch(() => undefined);
}
