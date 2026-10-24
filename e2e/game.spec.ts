import { expect, test, type Page } from "@playwright/test";

const ACTIVITY_LABELS: Record<string, string> = {
  research: "研究",
  tinker: "捣鼓",
  flap: "扑腾",
  stroll: "溜达",
  record: "记录",
  share: "分享",
};

/** 点掉开始页，进入第 1 天上午。 */
async function enterGame(page: Page) {
  await page.goto("/");
  const start = page.getByTestId("start-run");
  const resume = page.getByTestId("continue-run");
  if (await start.isVisible().catch(() => false)) {
    await start.click();
  } else if (await resume.isVisible().catch(() => false)) {
    await resume.click();
  }
  await expect(page.getByTestId("day-label")).toBeVisible();
}

function candidates(page: Page) {
  return page.getByTestId("candidate-row").locator('[data-testid^="activity-"]');
}

/** 手机上配方在弹层里，先打开。 */
async function ensureRecipesVisible(page: Page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) return;
  const trigger = page.getByTestId("open-recipes");
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
    await expect(dialog.getByTestId("craft-tool")).toBeVisible();
  }
}

/** 关掉手机上的配方弹层，避免遮挡选牌。 */
async function closeRecipes(page: Page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
}

/** 当前可见且可合成的配方按钮（手机在关闭的弹层里不可见）。 */
function craftButtons(page: Page) {
  return page.locator('[data-testid^="craft-"]:not([disabled]):visible');
}

/** 选一张候选牌；若触发满手替换，则点一张旧牌完成替换。 */
async function pickOne(page: Page) {
  await candidates(page).first().click();
  const cancel = page.getByTestId("cancel-replace");
  if (await cancel.isVisible().catch(() => false)) {
    await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
  }
}

test.describe("完整一局", () => {
  test("从开始到重开能完整玩一局", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await enterGame(page);
    await expect(page.getByTestId("resident-hint")).toContainText("每次选一张");
    await expect(page.getByTestId("remaining")).toContainText("还剩 14 次");

    for (let i = 0; i < 14; i += 1) {
      if ((await craftButtons(page).count()) > 0) {
        await craftButtons(page).first().click();
      }
      await pickOne(page);
    }

    const finish = page.getByTestId("finish-run");
    await expect(finish).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("remaining")).toHaveText("可以开张");
    await finish.click();

    await expect(page.getByRole("heading", { name: "夏天来过的小证据" })).toBeVisible();
    await expect(page.getByTestId("ending-letter")).toBeVisible();
    await expect(page.getByTestId("ending-letter")).toContainText("阿满");

    await page.getByTestId("restart-run").click();
    await expect(page.getByTestId("remaining")).toContainText("还剩 14 次");
    await expect(page.getByTestId("day-label")).toHaveText("第 1 天 · 上午");

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("零展品也能开张", async ({ page }) => {
    await enterGame(page);
    for (let i = 0; i < 14; i += 1) {
      await pickOne(page);
    }
    await page.getByTestId("finish-run").click();
    await expect(page.getByText("今天先晒晒桌子").first()).toBeVisible();
    await expect(page.getByTestId("speech")).toContainText("好东西");
  });

  test("刷新后恢复当前候选", async ({ page }) => {
    await enterGame(page);
    await pickOne(page);
    const label = await candidates(page).first().textContent();
    await page.reload();
    await expect(page.getByTestId("day-label")).toBeVisible();
    await expect(candidates(page).first()).toHaveText(label ?? "");
    await expect(page.getByTestId("remaining")).toContainText("还剩 13 次");
  });

  test("满手替换与取消正确", async ({ page }) => {
    await enterGame(page);
    for (let i = 0; i < 6; i += 1) {
      await candidates(page).first().click();
      const cancel = page.getByTestId("cancel-replace");
      if (await cancel.isVisible().catch(() => false)) {
        await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
      }
    }
    // 第 7 次选牌必然进入替换阶段
    await candidates(page).first().click();
    await expect(page.getByTestId("replace-panel")).toBeVisible();
    await page.getByTestId("cancel-replace").click();
    await expect(page.getByTestId("replace-panel")).toBeHidden();
    // 取消后可以再选同一张，候选不变
    const before = await candidates(page).first().textContent();
    await candidates(page).first().click();
    await expect(page.getByTestId("replace-panel")).toBeVisible();
    await expect(candidates(page).first()).toHaveText(before ?? "");
  });

  test("合成后不刷新当前候选", async ({ page }) => {
    await enterGame(page);
    // 一路选到有可合成的配方
    let guard = 0;
    while (guard < 8) {
      await ensureRecipesVisible(page);
      if ((await craftButtons(page).count()) > 0) break;
      await closeRecipes(page);
      await pickOne(page);
      guard += 1;
    }
    await ensureRecipesVisible(page);
    const craftable = craftButtons(page);
    test.skip((await craftable.count()) === 0, "前 8 次选牌内没有可合成配方");
    const before = await candidates(page).allTextContents();
    await craftable.first().click();
    await expect(candidates(page)).toHaveCount(3);
    expect(await candidates(page).allTextContents()).toEqual(before);
    await expect(page.getByTestId("speech")).toBeVisible();
  });

  test("集齐三类展签后开张（开发测试种子）", async ({ page }) => {
    await page.goto("/?seed=seed-6");
    await page.getByTestId("start-run").click();
    await expect(page.getByTestId("test-mode")).toContainText("测试模式");

    // 模拟一个「朝着没点亮的展签去凑」的玩家
    for (let i = 0; i < 14; i += 1) {
      await ensureRecipesVisible(page);
      const litStamps = await page
        .locator('[data-testid^="stamp-"][data-lit="true"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid") ?? ""));
      const litWishes = new Set(
        litStamps.map((id) => id.replace("stamp-", "")),
      );

      // 优先做还没点亮展签的配方
      const order: { recipe: string; wish: string }[] = [
        { recipe: "tool", wish: "create" },
        { recipe: "training", wish: "body" },
        { recipe: "essay", wish: "echo" },
        { recipe: "demo", wish: "create" },
        { recipe: "evening", wish: "echo" },
      ];
      let crafted = false;
      for (const { recipe, wish } of order) {
        if (litWishes.has(wish)) continue;
        const button = page.locator(`[data-testid="craft-${recipe}"]:visible`);
        if ((await button.count()) > 0 && !(await button.isDisabled())) {
          await button.click();
          crafted = true;
          break;
        }
      }
      if (!crafted) {
        const fallback = craftButtons(page);
        if ((await fallback.count()) > 0) await fallback.first().click();
      }
      await closeRecipes(page);

      const cards = candidates(page);
      const count = await cards.count();
      if (count === 0) break;
      const texts = await cards.allTextContents();
      const costs: Record<string, Record<string, number>> = {
        tool: { research: 2, tinker: 1 },
        training: { flap: 2, record: 1 },
        essay: { stroll: 1, record: 1, share: 1 },
        demo: { research: 1, tinker: 1, share: 1 },
        evening: { flap: 1, stroll: 1, record: 1 },
      };
      const wishOf: Record<string, string> = {
        tool: "create",
        training: "body",
        essay: "echo",
        demo: "create",
        evening: "echo",
      };
      let bestIndex = 0;
      let bestScore = -1;
      for (let index = 0; index < count; index += 1) {
        const text = texts[index] ?? "";
        const type = (["research", "tinker", "flap", "stroll", "record", "share"] as const).find(
          (candidate) => ACTIVITY_LABELS[candidate] === text.slice(0, 2),
        );
        let score = 0;
        if (type) {
          for (const recipe of Object.keys(costs)) {
            if (litWishes.has(wishOf[recipe])) continue;
            if ((costs[recipe][type] ?? 0) > 0) score += 1;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
      await cards.nth(bestIndex).click();
      const cancel = page.getByTestId("cancel-replace");
      if (await cancel.isVisible().catch(() => false)) {
        await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
      }
    }

    await page.getByTestId("finish-run").click();
    await expect(page.locator('[data-testid^="stamp-"][data-lit="true"]')).toHaveCount(3);
    await expect(page.getByTestId("speech")).toHaveText("三种展签都在，夏天来过这里。");
  });

  test("未集齐三类展签也能开张并显示缺少的展签", async ({ page }) => {
    // seed=s3：贪心合成下本局只点亮 1 种展签，用来稳定复现「未集齐」分支
    await page.goto("/?seed=s3");
    await page.getByTestId("start-run").click();
    await expect(page.getByTestId("test-mode")).toContainText("测试模式");

    for (let i = 0; i < 14; i += 1) {
      await ensureRecipesVisible(page);
      const craftable = craftButtons(page);
      if ((await craftable.count()) > 0) await craftable.first().click();
      await closeRecipes(page);
      const cards = candidates(page);
      if ((await cards.count()) === 0) break;
      await cards.first().click();
      const cancel = page.getByTestId("cancel-replace");
      if (await cancel.isVisible().catch(() => false)) {
        await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
      }
    }

    // 最后整理阶段仍可合成（设计第 2.4 节）
    await ensureRecipesVisible(page);
    const lastCraft = craftButtons(page);
    if ((await lastCraft.count()) > 0) await lastCraft.first().click();
    await closeRecipes(page);

    await page.getByTestId("finish-run").click();
    const lit = await page.locator('[data-testid^="stamp-"][data-lit="true"]').count();
    expect(lit).toBeGreaterThan(0);
    expect(lit).toBeLessThan(3);
    await expect(page.getByTestId("speech")).toContainText("还差");
    await expect(page.getByTestId("speech")).toContainText("桌上这些先摆着");
    // 未集齐分支不出现惩罚性文案
    const speech = (await page.getByTestId("speech").textContent()) ?? "";
    expect(speech).not.toContain("失败");
    expect(speech).not.toContain("惩罚");
  });

  test("刷新后恢复满手替换状态", async ({ page }) => {
    await enterGame(page);
    for (let i = 0; i < 6; i += 1) {
      await candidates(page).first().click();
      const cancel = page.getByTestId("cancel-replace");
      if (await cancel.isVisible().catch(() => false)) {
        await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
      }
    }
    // 第 7 次选牌进入替换阶段
    await candidates(page).first().click();
    await expect(page.getByTestId("replace-panel")).toBeVisible();
    const pendingLabel = await page.getByTestId("replace-panel").textContent();

    await page.reload();
    await expect(page.getByTestId("replace-panel")).toBeVisible();
    await expect(page.getByTestId("replace-panel")).toHaveText(pendingLabel ?? "");
    await expect(page.getByTestId("cancel-replace")).toBeVisible();
    await expect(page.getByTestId("hand-grid").locator('[data-testid^="activity-"]')).toHaveCount(6);

    // 恢复后仍能完成替换并推进
    await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
    await expect(page.getByTestId("replace-panel")).toBeHidden();
    await expect(page.getByTestId("remaining")).toContainText("还剩 7 次");
  });
});

test.describe("损坏存档", () => {
  test("存档无法解析时提示开启新局，而不是静默开新局", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("summer.save.v1", "{ 这不是合法存档");
    });
    await page.reload();

    await expect(page.getByRole("heading", { name: "存档读不出来了" })).toBeVisible();
    await expect(page.getByTestId("day-label")).toHaveCount(0);

    await page.getByTestId("start-after-corrupt").click();
    await expect(page.getByTestId("day-label")).toHaveText("第 1 天 · 上午");
    await expect(page.getByTestId("remaining")).toContainText("还剩 14 次");

    // 开新局后损坏标记被清掉，刷新回到开始页而不是提示页
    await page.reload();
    await expect(page.getByRole("heading", { name: "存档读不出来了" })).toHaveCount(0);
    await expect(page.getByTestId("start-run")).toBeVisible();
  });
});

test.describe("布局", () => {  test("桌面与手机都无横向溢出", async ({ page }, testInfo) => {
    await enterGame(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `viewport=${testInfo.project.name}`).toBeLessThanOrEqual(1);
  });

  test("触控区域至少约 44px", async ({ page }) => {
    await enterGame(page);
    const box = await candidates(page).first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
