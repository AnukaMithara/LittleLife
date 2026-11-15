import { test, expect, type Page } from "@playwright/test";
import { installNativeMock } from "./native-mock";

async function steps(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        __littlelifeDesktopPosition: () => {
          steps: number;
          x: number;
          y: number;
        };
      }
    ).__littlelifeDesktopPosition(),
  );
}
async function tray(page: Page, action: string) {
  await page.evaluate(
    (action) =>
      (
        window as unknown as {
          __littlelifeTestTray: (action: string) => Promise<unknown>;
        }
      ).__littlelifeTestTray(action),
    action,
  );
}

test("compact mode contains only the transparent character and moves its native window", async ({
  page,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 160, height: 180 });
  await installNativeMock(page, { compact: true, trayAvailable: true });
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/compact/);
  expect(
    await page.evaluate(() =>
      [document.documentElement, document.body].map(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ),
  ).toEqual(["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"]);
  await expect(page.locator(".compact-controls")).not.toBeVisible();
  await expect(page.locator(".speech")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pet Moss", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(1200);
  expect((await steps(page)).x).toBeGreaterThan(100);
  expect((await steps(page)).y).toBe(100);
  await page.screenshot({
    path: "test-results/transparent-companion.png",
    omitBackground: true,
  });
  await page.getByRole("button", { name: "Pet Moss", exact: true }).dblclick();
  await expect(page.locator("body")).not.toHaveClass(/compact/);
});

test("flying and swimming use distinct poses and roaming can be stopped", async ({
  page,
}) => {
  await page.clock.install();
  await installNativeMock(page);
  await page.goto("/");
  for (const movement of ["fly", "swim"]) {
    await page.setViewportSize({ width: 440, height: 650 });
    await tray(page, "expand");
    await page.getByRole("button", { name: "Little settings" }).click();
    await page.getByLabel("Movement", { exact: true }).selectOption(movement);
    await tray(page, "compact");
    await page.setViewportSize({ width: 160, height: 180 });
    await expect(page.locator("#pixel-character")).toHaveAttribute(
      "data-pose",
      movement,
    );
    const before = await steps(page);
    await page.clock.runFor(4200);
    expect((await steps(page)).steps).toBeGreaterThan(before.steps);
    expect((await steps(page)).y).toBeGreaterThan(before.y);
  }
  await page.setViewportSize({ width: 440, height: 650 });
  await tray(page, "expand");
  await page.getByRole("button", { name: "Little settings" }).click();
  await page.getByLabel("Roam around the desktop").uncheck();
  await tray(page, "compact");
  const before = await steps(page);
  await page.clock.runFor(7000);
  expect((await steps(page)).steps).toBe(before.steps);
});

for (const stop of ["quiet", "motion", "pause", "rest"] as const) {
  test(`${stop} prevents native roaming`, async ({ page }) => {
    await page.clock.install();
    await installNativeMock(page);
    await page.goto("/");
    if (stop === "rest") {
      await page.getByRole("button", { name: "Rest", exact: false }).click();
    } else {
      await page.getByRole("button", { name: "Little settings" }).click();
      if (stop === "pause")
        await page.getByRole("button", { name: "Pause companion" }).click();
      else await page.locator(`#${stop}`).check();
    }
    await tray(page, "compact");
    await page.clock.runFor(12000);
    expect((await steps(page)).steps).toBe(0);
  });
}
