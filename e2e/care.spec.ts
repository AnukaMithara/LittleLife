import { test, expect, type Page } from "@playwright/test";
import { installNativeMock } from "./native-mock";

const MINUTE = 60_000;
const pose = (page: Page) => page.locator("#pixel-character");
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

test("reminds, loses patience when ignored, and forgives when cared for", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const bubble = page.locator("#bubble");
  await expect(bubble).toBeHidden();
  await page.clock.runFor(20 * MINUTE + 2000);
  await expect(bubble).toContainText("look far away");
  await expect(pose(page)).toHaveAttribute("data-pose", "wave");
  await expect(page.getByRole("button", { name: "Later" })).toBeVisible();
  await page.clock.runFor(2 * MINUTE + 2000);
  await expect(bubble).toHaveAttribute("data-level", "1");
  const bond = Number(
    await page.locator("#bond-meter").getAttribute("aria-valuenow"),
  );
  await page.clock.runFor(3 * MINUTE + 2000);
  await expect(bubble).toHaveAttribute("data-level", "2");
  await expect(pose(page)).toHaveAttribute("data-pose", "angry");
  await expect(page.locator("#action-label")).toHaveText("Properly cross");
  await expect(page.getByRole("button", { name: "Later" })).toBeHidden();
  await expect(page.locator("#bond-meter")).toHaveAttribute(
    "aria-valuenow",
    String(bond - 3),
  );
  await page.getByRole("button", { name: "Pet Moss", exact: true }).click();
  await expect(bubble).toBeHidden();
  await expect(pose(page)).toHaveAttribute("data-pose", "happy");
  await expect(page.locator("#speech")).toContainText("fine. Thank you.");
  await expect(page.locator("#bond-meter")).toHaveAttribute(
    "aria-valuenow",
    String(bond - 1),
  );
});

test("can be put off for ten minutes, retimed and switched off", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.clock.runFor(20 * MINUTE + 2000);
  await page.getByRole("button", { name: "Later" }).click();
  await expect(page.locator("#bubble")).toBeHidden();
  await page.clock.runFor(9 * MINUTE);
  await expect(page.locator("#bubble")).toBeHidden();
  await page.clock.runFor(MINUTE + 2000);
  await expect(page.locator("#bubble")).toContainText("look far away");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Little settings" }).click();
  await page.getByLabel("Drink water every").fill("5");
  await page.getByLabel("Drink water every").blur();
  await page.clock.runFor(5 * MINUTE + 2000);
  await expect(page.locator("#bubble")).toContainText("sip of water");
  await page.getByLabel("Remind me to look after myself").uncheck();
  await expect(page.locator("#bubble")).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "Little settings" }).click();
  await expect(
    page.getByLabel("Remind me to look after myself"),
  ).not.toBeChecked();
  await expect(page.getByLabel("Drink water every")).toHaveValue("5");
  await page.clock.runFor(30 * MINUTE);
  await expect(page.locator("#bubble")).toBeHidden();
});

test("the desktop companion changes its company with what you are doing", async ({
  page,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 200, height: 236 });
  // No random wandering, so each mood shows its resting behavior.
  await page.addInitScript(() => {
    Math.random = () => 0.9;
  });
  await installNativeMock(page, { compact: true, trayAvailable: true });
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/compact/);
  const sense = (activity: string, audio = false, idleSeconds = 0) =>
    signal(page, "desktop-activity", { activity, audio, idleSeconds });
  const attention = () =>
    page.evaluate(() =>
      (
        window as unknown as { __littlelifeAttention: () => boolean }
      ).__littlelifeAttention(),
    );
  await sense("coding");
  await page.clock.runFor(7000);
  await expect(pose(page)).toHaveAttribute("data-pose", "idle");
  expect(await attention()).toBe(false);

  await sense("video", true);
  await expect(page.locator("#bubble")).toContainText("watch with you");
  expect(await attention()).toBe(true);
  await page.clock.runFor(7000);
  await expect(pose(page)).toHaveAttribute("data-pose", "sit");
  await expect(page.locator("#bubble")).toBeHidden();
  expect(await attention()).toBe(false);

  await sense("coding", true);
  await page.clock.runFor(7000);
  await expect(pose(page)).toHaveAttribute("data-pose", "dance");

  await sense("away", false, 330);
  await page.clock.runFor(7000);
  await expect(pose(page)).toHaveAttribute("data-pose", "sleep");
  await sense("coding");
  await expect(page.locator("#bubble")).toContainText("You're back");
  await expect(pose(page)).toHaveAttribute("data-pose", "happy");

  // A call or a film is not interrupted; the reminder arrives afterwards.
  await sense("meeting", true);
  await page.clock.runFor(25 * MINUTE);
  await expect(page.locator("#bubble")).toBeHidden();
  await sense("browsing");
  await page.clock.runFor(2000);
  await expect(page.locator("#bubble")).toContainText("look far away");
  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  expect(await attention()).toBe(true);
  await page.screenshot({
    path: "test-results/companion-reminder.png",
    omitBackground: true,
  });

  // The pointer coming close, anywhere on the desktop, earns a curious look.
  await page.getByRole("button", { name: "Done" }).click();
  await page.clock.runFor(5000);
  await signal(page, "desktop-cursor", true);
  await expect(pose(page)).toHaveAttribute("data-pose", "curious");
});

test("turning off awareness ignores what other applications are doing", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    Math.random = () => 0.9;
  });
  await installNativeMock(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Little settings" }).click();
  await page.getByLabel("Notice what I'm doing").uncheck();
  await expect(page.getByLabel("Notice what I'm doing")).not.toBeChecked();
  await signal(page, "desktop-activity", {
    activity: "video",
    audio: true,
    idleSeconds: 0,
  });
  await page.clock.runFor(7000);
  await expect(pose(page)).toHaveAttribute("data-pose", "idle");
});
