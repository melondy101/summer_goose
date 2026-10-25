// 录制讲解录屏：完整一局（固定种子）→ 结算挑战链接 → 再来一局。
// 产出 webm 后用 ffmpeg 转 H.264 MP4。用法：node scripts/record_demo.mjs
import { chromium } from "@playwright/test";
import { mkdir, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = "http://localhost:4199";
const VIDEO_DIR = path.join(ROOT, "test-results", "video");
const DELIVERY = path.join(ROOT, "assets", "delivery");
const ffmpeg = "D:\\ProgramFiles\\ffmpeg\\bin\\ffmpeg.exe";
await mkdir(VIDEO_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

// 开始页停 2.5 秒
await page.goto(`${BASE}/?seed=s3`);
await page.waitForTimeout(2500);
await page.getByTestId("start-run").click();
await page.waitForTimeout(1500);

// 完整一局：贪心合成 + 首选候选
for (let i = 0; i < 14; i += 1) {
  const craftable = page.locator('[data-testid^="craft-"]:not([disabled]):visible');
  if ((await craftable.count()) > 0) {
    await craftable.first().click();
    await page.waitForTimeout(900);
  }
  const row = page.getByTestId("candidate-row").locator('[data-testid^="activity-"]');
  if ((await row.count()) === 0) break;
  await row.first().click();
  await page.waitForTimeout(650);
  const cancel = page.getByTestId("cancel-replace");
  if (await cancel.isVisible().catch(() => false)) {
    await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
    await page.waitForTimeout(650);
  }
}
await page.getByTestId("finish-run").click();
await page.waitForTimeout(1200);

// 结算页：依次展示展品、挑战卡、图鉴（滚到画面内再停留）
await page.locator('[aria-label="展品"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(1600);
await page.getByTestId("challenge-section").scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.getByTestId("challenge-copy").click();
await page.waitForTimeout(2200);
await page.getByTestId("collection").scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);

// 再来一局
await page.getByTestId("restart-run").scrollIntoViewIfNeeded();
await page.getByTestId("restart-run").click();
await page.waitForTimeout(2500);

await context.close(); // 刷出视频文件
await browser.close();

const files = (await readdir(VIDEO_DIR)).filter((f) => f.endsWith(".webm"));
if (files.length === 0) throw new Error("没有录到视频");
const src = path.join(VIDEO_DIR, files[files.length - 1]);
const out = path.join(DELIVERY, "demo.mp4");
execFileSync(ffmpeg, [
  "-y", "-i", src,
  "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
  out,
], { stdio: "ignore" });
console.log(`已转换 ${path.basename(src)} -> assets/delivery/demo.mp4`);
