import { test, expect, type Page } from "@playwright/test";
import { installNativeMock } from "./native-mock";

const MINUTE = 60_000;
const pose = (page: Page) => page.locator("#pixel-character");
const pet = (page: Page) =>
  page.getByRole("button", { name: "Pet Moss", exact: true });
async function signal(page: Page, event: string, payload: unknown) {
  await page.evaluate(
    ([event, payload]) =>
      (
        window as unknown as {
          __littlelifeSignal: (event: string, payload: unknown) => void;
        }
      ).__littlelifeSignal(event as string, payload),
    [event, payload],
  );
}
const hook = <T>(page: Page, name: string) =>
  page.evaluate(
    (name) => (window as unknown as Record<string, () => unknown>)[name](),
    name,
  ) as Promise<T>;
const steps = async (page: Page) =>
  (await hook<{ steps: number }>(page, "__littlelifeDesktopPosition")).steps;

async function companion(page: Page) {
  await page.clock.install();
  await page.setViewportSize({ width: 200, height: 236 });
  // Care reminders have their own tests; here they would talk over the companion.
  await page.addInitScript(() =>
    localStorage.setItem(
      "littlelife.care.v1",
      JSON.stringify({ version: 1, enabled: false }),
    ),
  );
  await installNativeMock(page, { compact: true, trayAvailable: true });
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/compact/);
}

test("a right-click offers the character's own menu instead of opening the controls", async ({
  page,
}) => {
  await companion(page);
  await pet(page).click({ button: "right" });
  await expect(page.locator("body")).toHaveClass(/compact/);
  expect(await hook(page, "__littlelifeMenus")).toEqual([
    { resting: false, staying: false },
  ]);
  await signal(page, "desktop-command", "nap");
  await expect(pose(page)).toHaveAttribute("data-pose", "sleep");
  await pet(page).click({ button: "right" });
  expect(await hook<unknown[]>(page, "__littlelifeMenus")).toHaveLength(2);
  expect((await hook<unknown[]>(page, "__littlelifeMenus"))[1]).toEqual({
    resting: true,
    staying: false,
  });
  await signal(page, "desktop-command", "nap");
  await expect(pose(page)).not.toHaveAttribute("data-pose", "sleep");
  await signal(page, "desktop-command", "play");
  await expect(pose(page)).toHaveAttribute("data-pose", "jump");
  await pet(page).dblclick();
  await expect(page.locator("body")).not.toHaveClass(/compact/);
});

test("sent aside it waits in the corner, then asks to come back like a pet would", async ({
  page,
}) => {
  // Always in the mood for a walk, so staying put is its choice and not chance.
  await page.addInitScript(() => {
    Math.random = () => 0.1;
  });
  await companion(page);
  const bubble = page.locator("#bubble");
  await signal(page, "desktop-command", "aside");
  expect(await hook(page, "__littlelifeErrands")).toEqual(["aside"]);
  await expect(bubble).toContainText("wait over here");
  // It stays put: no wandering while it waits.
  const before = await steps(page);
  await page.clock.runFor(3 * MINUTE);
  expect(await steps(page)).toBe(before);
  await expect(bubble).toBeHidden();

  await page.clock.runFor(MINUTE + 2000);
  await expect(bubble).toContainText("Can I come back out now?");
  await expect(pose(page)).toHaveAttribute("data-pose", "wave");
  await expect(page.getByRole("button", { name: "Done" })).toBeHidden();
  await page.getByRole("button", { name: "Not yet" }).click();
  await expect(bubble).toContainText("I'll be right here");

  // Told to wait, it holds out twice as long, and asks differently.
  await page.clock.runFor(7 * MINUTE);
  await expect(bubble).toBeHidden();
  await page.clock.runFor(MINUTE + 2000);
  await expect(bubble).toContainText("Is it okay to come back?");
  // Ignored, it sighs and goes on waiting.
  await page.clock.runFor(46_000);
  await expect(bubble).toContainText("keep waiting");

  await page.clock.runFor(16 * MINUTE + 2000);
  await expect(bubble).toContainText("can I come out?");
  const bond = Number(
    await page.locator("#bond-meter").getAttribute("aria-valuenow"),
  );
  await page.getByRole("button", { name: "Come on out" }).click();
  await expect(bubble).toContainText("Yay! Thank you!");
  await expect(pose(page)).toHaveAttribute("data-pose", "jump");
  await expect(page.locator("#bond-meter")).toHaveAttribute(
    "aria-valuenow",
    String(bond + 1),
  );
  // Free again, it is off exploring, and has nothing more to ask.
  await signal(page, "desktop-cursor", false);
  await page.clock.runFor(20_000);
  expect(await steps(page)).toBeGreaterThan(before);
  await page.clock.runFor(30 * MINUTE);
  await expect(bubble).toBeHidden();
});

test("called over, it comes to the pointer, and a pat answers its question too", async ({
  page,
}) => {
  await companion(page);
  await signal(page, "desktop-command", "aside");
  await signal(page, "desktop-command", "come");
  expect(await hook(page, "__littlelifeErrands")).toEqual(["aside", "come"]);
  await expect(page.locator("#bubble")).toContainText("Coming!");
  // Called back, it is no longer waiting to ask.
  await page.clock.runFor(10 * MINUTE);
  await expect(page.locator("#bubble")).toBeHidden();

  await signal(page, "desktop-command", "aside");
  await page.clock.runFor(4 * MINUTE + 2000);
  await expect(page.locator("#bubble")).toContainText("come back");
  await pet(page).click();
  await expect(page.locator("#bubble")).toContainText("Yay! Thank you!");
});

test("words wait until it has arrived, and never hang off the screen", async ({
  page,
}) => {
  await companion(page);
  // On its way in from off-screen: nothing is said yet.
  await signal(page, "desktop-motion", {
    direction: 1,
    falling: false,
    moving: true,
    peeking: true,
  });
  await expect(pose(page)).toHaveAttribute("data-pose", "curious");
  await signal(page, "desktop-followed", null);
  await expect(page.locator("#bubble")).toBeHidden();
  await signal(page, "desktop-motion", {
    direction: 1,
    falling: false,
    moving: false,
    peeking: false,
  });
  await expect(page.locator("#bubble")).toBeVisible();

  // Sixty pixels of the window hang off the left of the screen.
  await page.evaluate(() => {
    Object.defineProperty(window, "screenX", { get: () => -60 });
    Object.defineProperty(screen, "availLeft", { get: () => 0 });
    Object.defineProperty(screen, "availWidth", { get: () => 1440 });
  });
  await page.clock.runFor(400);
  const box = (await page.locator("#bubble").boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(60);
  expect(box.x + box.width).toBeLessThanOrEqual(200);
  // Almost entirely off the screen: the words are held back rather than cut in half.
  await page.evaluate(() =>
    Object.defineProperty(window, "screenX", { get: () => -150 }),
  );
  await page.clock.runFor(1200);
  await expect(page.locator("#bubble")).toBeHidden();
  await page.evaluate(() =>
    Object.defineProperty(window, "screenX", { get: () => 300 }),
  );
  await page.clock.runFor(1200);
  await expect(page.locator("#bubble")).toBeVisible();
});
