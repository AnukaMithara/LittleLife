import { test, expect } from "@playwright/test";
import { installNativeMock } from "./native-mock";

test("restores compact mode, synchronizes tray recovery and exposes desktop controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 440, height: 650 });
  await installNativeMock(page, { trayAvailable: true, compact: true });
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/compact/);
  await page.getByRole("button", { name: "Pet Moss", exact: true }).dblclick();
  await expect(page.locator("body")).not.toHaveClass(/compact/);
  await page.getByRole("button", { name: "Little settings" }).click();
  await page.getByLabel("Keep above other windows").uncheck();
  await expect(page.getByLabel("Keep above other windows")).not.toBeChecked();
  await page
    .getByRole("button", { name: "Compact and let clicks pass through" })
    .click();
  await expect(page.locator("body")).toHaveClass(/compact/);
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            __littlelifeDesktopState: () => { clickThrough: boolean };
          }
        ).__littlelifeDesktopState().clickThrough,
    ),
  ).toBe(true);
  await page.evaluate(() =>
    (
      window as unknown as {
        __littlelifeTestTray: (action: string) => Promise<unknown>;
      }
    ).__littlelifeTestTray("interact"),
  );
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            __littlelifeDesktopState: () => { clickThrough: boolean };
          }
        ).__littlelifeDesktopState().clickThrough,
    ),
  ).toBe(false);
  await page.evaluate(() =>
    (
      window as unknown as {
        __littlelifeTestTray: (action: string) => Promise<unknown>;
      }
    ).__littlelifeTestTray("expand"),
  );
  await page.getByRole("button", { name: "Little settings" }).click();
  await page.getByRole("button", { name: "Hide to tray" }).click();
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            __littlelifeDesktopState: () => { visible: boolean };
          }
        ).__littlelifeDesktopState().visible,
    ),
  ).toBe(false);
  await page.evaluate(() =>
    (
      window as unknown as {
        __littlelifeTestTray: (action: string) => Promise<unknown>;
      }
    ).__littlelifeTestTray("expand"),
  );
  await expect(page.locator("body")).not.toHaveClass(/compact/);
  await expect(page.getByLabel("Keep above other windows")).not.toBeChecked();
  await page
    .locator("#desktop-settings")
    .screenshot({ path: "test-results/desktop-controls.png" });
  expect(errors).toEqual([]);
});

test("does not allow hiding or click-through when the tray is unavailable", async ({
  page,
}) => {
  await installNativeMock(page, { trayAvailable: false, compact: false });
  await page.goto("/");
  await page.getByRole("button", { name: "Little settings" }).click();
  await expect(
    page.getByRole("button", { name: "Compact and let clicks pass through" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Hide to tray" }),
  ).toBeDisabled();
  await expect(page.locator("#desktop-status")).toContainText(
    "tray is unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Quit LittleLife", exact: true }).first(),
  ).toBeEnabled();
});
