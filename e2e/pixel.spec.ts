import { test, expect } from "@playwright/test";

test("changes character, colors, directions and poses, and restores appearance", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const canvas = page.locator("#pixel-character");
  await expect(canvas).toHaveAttribute("data-character", "moss");
  await page.getByRole("button", { name: "Characters ↗" }).click();
  await page.getByLabel("Character", { exact: true }).selectOption("ember");
  await expect(
    page.getByRole("heading", { name: "Ember", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Direction", { exact: true }).selectOption("back");
  await page.getByLabel("Pose preview", { exact: true }).selectOption("wave");
  await expect(canvas).toHaveAttribute("data-facing", "back");
  await expect(canvas).toHaveAttribute("data-pose", "wave");
  await page.getByLabel("Direction", { exact: true }).selectOption("front");
  await page.getByLabel("Reduce motion").check();
  const before = await canvas.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page.getByLabel("Outfit", { exact: true }).evaluate((input) => {
    (input as HTMLInputElement).value = "#3963a2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).not.toBe(before);
  await page.getByLabel("Direction", { exact: true }).selectOption("left");
  await page.reload();
  await expect(canvas).toHaveAttribute("data-character", "ember");
  await expect(canvas).toHaveAttribute("data-facing", "left");
  await expect(canvas).toHaveAttribute("data-preview", "false");
  await page.getByRole("button", { name: "Characters ↗" }).click();
  await expect(page.getByLabel("Outfit", { exact: true })).toHaveValue(
    "#3963a2",
  );
  await page.getByLabel("Pose preview", { exact: true }).selectOption("sit");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-pose", "jump");
  await expect(canvas).toHaveAttribute("data-preview", "false");
  expect(errors).toEqual([]);
});

test("stops pixel animation for pause/reduced motion and uses integer compact scaling", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const canvas = page.locator("#pixel-character");
  await page.getByRole("button", { name: "Characters ↗" }).click();
  await page.getByLabel("Character", { exact: true }).selectOption("aster");
  await page.getByLabel("Pose preview", { exact: true }).selectOption("walk");
  await page.getByLabel("Reduce motion").check();
  const still = await canvas.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page.clock.runFor(2500);
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).toBe(still);
  await page.getByLabel("Reduce motion").uncheck();
  await page.getByRole("button", { name: "Pause companion" }).click();
  const paused = await canvas.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page.clock.runFor(2500);
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).toBe(paused);
  await page
    .getByRole("button", { name: "Switch to compact companion" })
    .click();
  await expect(canvas).toHaveAttribute("data-scale", "2");
  const box = await canvas.boundingBox();
  expect(box?.width).toBe(128);
  expect(box?.height).toBe(160);
});

test("captures every original character", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Characters ↗" }).click();
  for (const character of ["moss", "ember", "aster", "surya"]) {
    await page.getByLabel("Character", { exact: true }).selectOption(character);
    await page.getByLabel("Pose preview", { exact: true }).selectOption("idle");
    await page.locator("#pixel-character").scrollIntoViewIfNeeded();
    await page
      .locator("#pixel-character")
      .screenshot({ path: `test-results/pixel-${character}.png` });
  }
  await page.screenshot({
    path: "test-results/pixel-workshop-preview.png",
    fullPage: true,
  });
});
