import { test, expect, type Page } from "@playwright/test";
import { installNativeMock } from "./native-mock";

async function openWorkshop(page: Page) {
  await page.getByRole("button", { name: "Characters" }).click();
}
async function exported(page: Page): Promise<Record<string, unknown>> {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Share this one" }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
const file = (pack: unknown) => ({
  name: "friend.littlelife.json",
  mimeType: "application/json",
  buffer: Buffer.from(typeof pack === "string" ? pack : JSON.stringify(pack)),
});

test("a shared character can be edited, added, kept across reloads and removed", async ({
  page,
}) => {
  await page.goto("/");
  await openWorkshop(page);
  const select = page.getByLabel("Character", { exact: true });
  await select.selectOption("wukong");
  await expect(page.locator("#pet-name")).toHaveText("Wukong");
  await page.getByRole("button", { name: "Pet", exact: true }).click();
  await expect(page.locator("#speech")).toHaveText("Hm. Again.");
  await expect(page.getByRole("button", { name: "Remove" })).toBeHidden();

  const pack = await exported(page);
  expect(pack).toMatchObject({ format: "littlelife.character", id: "wukong" });
  await page.locator("#pack-file").setInputFiles(
    file({
      ...pack,
      id: "storm-rider",
      name: "<b>Storm</b>",
      title: "SKY GUEST",
      lines: { pet: "Hello from a pack." },
    }),
  );
  await expect(page.locator("#pack-status")).toContainText("has joined");
  await expect(select).toHaveValue("storm-rider");
  // A name is shown as written, never interpreted as markup.
  await expect(page.locator("#pet-name")).toHaveText("<b>Storm</b>");
  await expect(page.locator("#pet-name b")).toHaveCount(0);
  await expect(page.locator("#character-title")).toHaveText("SKY GUEST");
  await page.getByRole("button", { name: "Pet", exact: true }).click();
  await expect(page.locator("#speech")).toHaveText("Hello from a pack.");
  await expect(page.locator("#pixel-character")).toHaveAttribute(
    "data-character",
    "storm-rider",
  );

  await page.reload();
  await expect(page.locator("#pixel-character")).toHaveAttribute(
    "data-character",
    "storm-rider",
  );
  await openWorkshop(page);
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.locator("#pack-status")).toContainText("was removed");
  await expect(select).toHaveValue("moss");
  await expect(select.locator("option")).toHaveCount(5);
  await page.reload();
  await expect(page.locator("#pixel-character")).toHaveAttribute(
    "data-character",
    "moss",
  );
});

test("a broken or hostile pack is refused with a reason and changes nothing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await openWorkshop(page);
  const pack = await exported(page);
  for (const [bad, reason] of [
    ["not json at all", "not valid JSON"],
    [{ ...pack, id: "moss" }, "different id"],
    [{ ...pack, id: "x1", format: "virus" }, "not a LittleLife character pack"],
    [{ ...pack, id: "x2", palette: { o: "javascript:alert(1)" } }, "#a1b2c3"],
  ] as const) {
    await page.locator("#pack-file").setInputFiles(file(bad));
    await expect(page.locator("#pack-status")).toContainText(reason);
  }
  await expect(
    page.getByLabel("Character", { exact: true }).locator("option"),
  ).toHaveCount(5);
  expect(errors).toEqual([]);
});

test("choosing a flier in the desktop app switches to flying", async ({
  page,
}) => {
  await installNativeMock(page);
  await page.goto("/");
  await openWorkshop(page);
  await page.getByLabel("Character", { exact: true }).selectOption("wukong");
  await expect(page.getByLabel("Movement", { exact: true })).toHaveValue("fly");
  await page.getByRole("button", { name: "Share this one" }).click();
  await expect(page.locator("#pack-status")).toContainText(/clipboard/);
});
