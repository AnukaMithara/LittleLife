import { test, expect } from "@playwright/test";

test("care, rest, preferences, rename, reload and compact mode", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.screenshot({ path: 'test-results/littlelife-desktop-preview.png', fullPage: true, animations: 'disabled' });
  await expect(
    page.getByRole("heading", { name: "Moss", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pet", exact: true }).click();
  await expect(page.locator("#stage")).toHaveAttribute("data-action", "happy");
  await page.getByRole("button", { name: "Rest", exact: false }).click();
  await expect(page.locator("#stage")).toHaveAttribute("data-action", "sleep");
  await page.getByRole("button", { name: "Wake up", exact: false }).click();
  await page.getByRole("button", { name: "Little settings" }).click();
  await page.getByLabel("A name for your friend").fill("<Fern>");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByLabel("Quiet company").check();
  await page.getByLabel("Reduce motion").check();
  await page.getByRole("button", { name: "Pause companion" }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: false }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Resume companion" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "<Fern>", exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/reduce-motion/);
  await page.getByRole("button", { name: "Little settings" }).click();
  await expect(page.getByLabel("Quiet company")).toBeChecked();
  await page
    .getByRole("button", { name: "Switch to compact companion" })
    .click();
  await expect(page.locator("body")).toHaveClass(/compact/);
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveClass(/compact/);
  expect(errors).toEqual([]);
});

test("works without network and respects system reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Play", exact: false }).click();
  await expect(page.locator("#stage")).toHaveAttribute("data-action", "jump");
  await expect(page.locator("body")).toHaveClass(/reduce-motion/);
});

test("mobile fits the viewport and unavailable storage stays usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("unavailable");
    };
  });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/littlelife-mobile-preview.png', fullPage: true, animations: 'disabled' });
  await page.getByRole("button", { name: "Little settings" }).click();
  await expect(page.locator("#storage-note")).toContainText(
    "will not be saved",
  );
  await page.getByRole("button", { name: "Play", exact: false }).click();
  await expect(page.locator("#stage")).toHaveAttribute("data-action", "jump");
});
