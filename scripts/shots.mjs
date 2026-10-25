// 视觉自检：截取开始页 / 对局页 / 结算页三张图。用法：bun scripts/shots.mjs
import { chromium } from "@playwright/test";

const base = "http://localhost:4199";
const out = (name) => `test-results/shot-${name}.png`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// 开始页
await page.goto(base);
await page.waitForTimeout(400);
await page.screenshot({ path: out("start"), fullPage: true });

// 对局页
await page.getByTestId("start-run").click();
await page.getByTestId("day-label").waitFor();
await page.waitForTimeout(300);
await page.screenshot({ path: out("game"), fullPage: true });

// 打完一局到结算页（固定种子 s3，贪心合成 + 首选候选）
await page.goto(`${base}/?seed=s3`);
await page.getByTestId("start-run").click();
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
await page.getByRole("heading", { level: 1, name: "夏天来过的小证据" }).waitFor();
await page.waitForTimeout(700); // 等展品入场动画结束
await page.screenshot({ path: out("ending"), fullPage: true });

// 移动端结算页
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: out("ending-mobile"), fullPage: true });

await browser.close();
console.log("截图完成：start / game / ending / ending-mobile");
