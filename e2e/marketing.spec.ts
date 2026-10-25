import { expect, test, type Page } from "@playwright/test";

test.use({ permissions: ["clipboard-write", "clipboard-read"] });

/** 与 game.spec.ts 相同的贪心打法：用固定种子尽快打完一局，回到结算页。 */
async function playToEnding(page: Page, seed = "s3") {
  await page.goto(`/?seed=${seed}`);
  await page.getByTestId("start-run").click();
  await expect(page.getByTestId("day-label")).toBeVisible();

  for (let i = 0; i < 14; i += 1) {
    const dialog = page.getByRole("dialog");
    const openRecipes = page.getByTestId("open-recipes");
    if (await openRecipes.isVisible().catch(() => false)) {
      await openRecipes.click();
      await expect(dialog.getByTestId("craft-tool")).toBeVisible();
    }
    const craftable = page.locator('[data-testid^="craft-"]:not([disabled]):visible');
    if ((await craftable.count()) > 0) await craftable.first().click();
    if (await dialog.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }

    const cards = page.getByTestId("candidate-row").locator('[data-testid^="activity-"]');
    if ((await cards.count()) === 0) break;
    await cards.first().click();
    const cancel = page.getByTestId("cancel-replace");
    if (await cancel.isVisible().catch(() => false)) {
      await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
    }
  }

  const dialog = page.getByRole("dialog");
  const openRecipes = page.getByTestId("open-recipes");
  if (await openRecipes.isVisible().catch(() => false)) {
    await openRecipes.click();
    await expect(dialog.getByTestId("craft-tool")).toBeVisible();
  }
  const lastCraft = page.locator('[data-testid^="craft-"]:not([disabled]):visible');
  if ((await lastCraft.count()) > 0) await lastCraft.first().click();
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
  }

  await page.getByTestId("finish-run").click();
  await expect(
    page.getByRole("heading", { level: 1, name: "夏天来过的小证据" }),
  ).toBeVisible();
}

test.describe("同一副牌挑战", () => {
  test("结算页能复制挑战链接，朋友打开拿到同一副牌", async ({ page }) => {
    await page.goto("/?seed=s3");
    await page.getByTestId("start-run").click();
    const cards = page.getByTestId("candidate-row").locator('[data-testid^="activity-"]');
    const firstDeal = await cards.allTextContents();
    expect(firstDeal).toHaveLength(3);

    for (let i = 0; i < 14; i += 1) {
      const craftable = page.locator('[data-testid^="craft-"]:not([disabled]):visible');
      if ((await craftable.count()) > 0) await craftable.first().click();
      const row = page.getByTestId("candidate-row").locator('[data-testid^="activity-"]');
      if ((await row.count()) === 0) break;
      await row.first().click();
      const cancel = page.getByTestId("cancel-replace");
      if (await cancel.isVisible().catch(() => false)) {
        await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
      }
    }
    await page.getByTestId("finish-run").click();
    await expect(
      page.getByRole("heading", { level: 1, name: "夏天来过的小证据" }),
    ).toBeVisible();

    await expect(page.getByTestId("challenge-section")).toBeVisible();
    await expect(page.getByTestId("challenge-code")).toHaveText("s3");

    await page.getByTestId("challenge-copy").click();
    await expect(page.getByTestId("challenge-copy")).toContainText("已复制");
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("seed=s3");

    // 模拟朋友：清掉本地存档后打开链接，第一轮候选与原局完全一致
    await page.evaluate(() => localStorage.clear());
    await page.goto(copied);
    await page.getByTestId("start-run").click();
    await expect(page.getByTestId("test-mode")).toContainText("测试模式");
    const friendDeal = await cards.allTextContents();
    expect(friendDeal).toEqual(firstDeal);
  });
});

test.describe("展品图鉴", () => {
  test("结算页显示收集进度与下局预告", async ({ page }) => {
    await playToEnding(page, "s3");
    await expect(page.getByTestId("collection-count")).toHaveText(/展品图鉴 \d\/5/);
    const lit = await page.locator('[data-testid^="collection-"][data-made="true"]').count();
    const count = await page.getByTestId("collection-count").textContent();
    expect(String(count)).toBe(`展品图鉴 ${lit}/5`);
    if (lit < 5) {
      await expect(page.getByTestId("collection-tease")).toContainText("下个暑假");
    }
  });
});

test.describe("音效开关", () => {
  test("右上角常驻，切换后偏好持久化", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("sound-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => localStorage.getItem("summer.sound.v1"))).toBe("off");

    await page.reload();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-pressed", "false");

    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => localStorage.getItem("summer.sound.v1"))).toBe("on");
  });
});

test.describe("PWA 与移动端", () => {
  test("manifest、图标、Service Worker 都能访问", async ({ page }) => {
    await page.goto("/");
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveCount(1);

    for (const path of [
      "/manifest.webmanifest",
      "/sw.js",
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/icon-maskable-512.png",
      "/icons/apple-touch-icon.png",
    ]) {
      const status = await page.evaluate(
        (url) => fetch(url).then((res) => res.status),
        path,
      );
      expect(status, path).toBe(200);
    }

    const manifestBody = await page.evaluate(() =>
      fetch("/manifest.webmanifest").then((res) => res.json() as Promise<Record<string, unknown>>),
    );
    expect(manifestBody.name).toBe("大鹅的奇怪暑假");
    expect(manifestBody.display).toBe("standalone");
  });

  test("viewport 声明 viewport-fit，触屏不双击缩放", async ({ page }) => {
    await page.goto("/");
    const content = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(content).toContain("viewport-fit=cover");
  });
});
