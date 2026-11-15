import { test, expect } from "@playwright/test";

test("native Jev setup clears the key, asks only after consent, and can remove it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 440, height: 650 });
  await page.clock.install();
  await page.addInitScript(() => {
    // Mock only the documented Tauri IPC boundary. No real key or API request is used.
    const status = {
      enabled: false,
      hasKey: false,
      supported: true,
      limit: 20,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      retryAfterSeconds: 0,
    };
    Object.assign(window, {
      isTauri: true,
      __TAURI_INTERNALS__: {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { label: "main", windowLabel: "main" },
        },
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          switch (command) {
            case "jev_status":
              return { ...status };
            case "jev_save_key":
              status.hasKey = true;
              return { ...status };
            case "jev_configure":
              status.enabled = args.enabled === true;
              status.limit = Number(args.limit);
              return { ...status };
            case "jev_forget_key":
              status.hasKey = false;
              status.enabled = false;
              return { ...status };
            case "jev_decide":
              if (!status.enabled) throw "disabled";
              status.requests++;
              status.inputTokens += 120;
              status.outputTokens += 20;
              return { action: "happy", status: { ...status } };
            default:
              throw new Error("Unexpected native command");
          }
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Little settings" }).click();
  await expect(page.getByLabel("Enable Jev this session")).toBeDisabled();
  await page
    .getByLabel("TypeSafe API key", { exact: true })
    .fill("test-only-not-a-real-key");
  await page.getByRole("button", { name: "Save key", exact: true }).click();
  await expect(
    page.getByLabel("TypeSafe API key", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByLabel("Enable Jev this session")).not.toBeChecked();
  await expect(page.locator("#jev-usage")).toContainText("0 / 20");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "test-only-not-a-real-key",
  );
  await page.getByLabel("Enable Jev this session").check();
  await page.clock.runFor(7000);
  await expect(page.locator("#jev-usage")).toContainText("1 / 20");
  await expect(page.locator("#provider-label")).toHaveText("JEV ENABLED");
  await page.screenshot({
    path: "test-results/jev-settings-preview.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Remove saved key" }).click();
  await expect(page.getByLabel("Enable Jev this session")).toBeDisabled();
  await expect(page.locator("#provider-label")).toHaveText("OFFLINE & CONTENT");
  await page.clock.runFor(65000);
  await expect(page.locator("#jev-usage")).toContainText("1 / 20");
});

test("browser preview explains the native-only setup without accepting keys", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Little settings" }).click();
  await expect(
    page.getByRole("group", { name: "Optional Jev behavior" }),
  ).toBeVisible();
  await expect(page.locator("#jev-status")).toContainText(
    "Windows and macOS desktop app",
  );
  await expect(
    page.getByLabel("TypeSafe API key", { exact: true }),
  ).not.toBeVisible();
});
