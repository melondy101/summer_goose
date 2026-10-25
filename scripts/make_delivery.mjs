// 生成提交材料：主角卡（三栏，第三栏为真实游戏画面）与作品封面。
// 用法：先起 vite preview 4199，再 node scripts/make_delivery.mjs
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = "http://localhost:4199";
const DELIVERY = path.join(ROOT, "assets", "delivery");
const AMAN = pathToFileURL(path.join(ROOT, "assets", "concepts", "aman-c-simple-v1.png")).href;
await mkdir(DELIVERY, { recursive: true });

const FONT = `'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif`;

const browser = await chromium.launch();

// ---------- 1. 游戏内真实画面（1440×900） ----------
const game = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await game.goto(`${BASE}/?seed=s3`);
await game.getByTestId("start-run").click();
await game.getByTestId("day-label").waitFor();
// 选几张牌、做一次合成，让桌面看起来在进行中
const pick = async () => {
  await game.getByTestId("candidate-row").locator('[data-testid^="activity-"]').first().click();
  const cancel = game.getByTestId("cancel-replace");
  if (await cancel.isVisible().catch(() => false)) {
    await game.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
  }
};
for (let i = 0; i < 4; i += 1) await pick();
const craftable = game.locator('[data-testid^="craft-"]:not([disabled]):visible');
if ((await craftable.count()) > 0) await craftable.first().click();
await game.waitForTimeout(400);
const shotPath = path.join(DELIVERY, "game-frame-tmp.png");
await game.screenshot({ path: shotPath });
await game.close();

// ---------- 2. 主角卡（1920×1080，按 protagonist-card-layout.svg 版式） ----------
const card = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const gameFrame = pathToFileURL(shotPath).href;
await card.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1920px; height: 1080px; background: #FBF4E7; font-family: ${FONT}; overflow: hidden; }
  .title { position: absolute; top: 44px; width: 100%; text-align: center; font-size: 44px; font-weight: 700; color: #3F342C; letter-spacing: 6px; }
  .sub { position: absolute; top: 108px; width: 100%; text-align: center; font-size: 20px; color: #807050; letter-spacing: 2px; }
  .col-title { position: absolute; top: 168px; width: 560px; text-align: center; font-size: 26px; color: #807050; letter-spacing: 3px; }
  .c1t { left: 60px; } .c2t { left: 680px; } .c3t { left: 1300px; }
  .sentence { position: absolute; left: 90px; top: 280px; width: 520px; font-size: 36px; line-height: 1.9; color: #3F342C; }
  .sentence b { color: #807050; font-weight: 400; }
  .aman { position: absolute; left: 690px; top: 240px; width: 540px; height: 540px; border: 2px solid #807050; border-radius: 16px; background: #F7F1E0; object-fit: contain; padding: 8px; }
  .frame { position: absolute; left: 1300px; top: 240px; width: 560px; height: 600px; border: 2px solid #807050; border-radius: 16px; overflow: hidden; background: #F7F1E0; }
  .frame img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
  .foot { position: absolute; bottom: 40px; width: 100%; text-align: center; font-size: 20px; color: #807050; }
</style></head><body>
  <div class="title">大鹅的奇怪暑假</div>
  <div class="sub">主角卡 · 大鹅阿满</div>
  <div class="col-title c1t">一句话</div>
  <div class="col-title c2t">生成的角色</div>
  <div class="col-title c3t">游戏里的样子</div>
  <div class="sentence">
    一只白白圆圆、挎着偏大的草绿色布袋、袋口露出一片叶子的大鹅，神情笃定又好奇，相信捡到的小东西都是宝贝，温暖治愈的手绘风格。
  </div>
  <img class="aman" src="${AMAN}" alt="阿满">
  <div class="frame"><img src="${gameFrame}" alt="游戏运行画面"></div>
  <div class="foot">角色与道具均由 AI 生成（ImageGen · 提示词见 assets/concepts/*.prompt.txt）｜游戏本体由 AI 编程工具 ZCode 实现</div>
</body></html>`);
await card.waitForTimeout(300);
await card.screenshot({ path: path.join(DELIVERY, "aman-protagonist-card.png") });
await card.close();

// ---------- 3. 作品封面（1200×630，JPG） ----------
const cover = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await cover.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; background: #FBF4E7; font-family: ${FONT}; overflow: hidden; position: relative; }
  .aman { position: absolute; right: 60px; top: 35px; height: 560px; width: 560px; object-fit: contain; }
  .name { position: absolute; left: 72px; top: 180px; font-size: 76px; font-weight: 700; color: #3F342C; letter-spacing: 4px; }
  .tag { position: absolute; left: 74px; top: 300px; font-size: 28px; color: #807050; line-height: 1.8; width: 480px; }
  .badge { position: absolute; left: 74px; top: 100px; font-size: 22px; color: #FBF4E7; background: #A0A078; border-radius: 999px; padding: 8px 22px; letter-spacing: 2px; }
</style></head><body>
  <div class="badge">1024 超能 Coding 周末 · 游戏赛道</div>
  <div class="name">大鹅的奇怪暑假</div>
  <div class="tag">帮一只把小破烂当宝贝的大鹅，<br>在七天里捡灵感、做展品，<br>办一场「夏天来过的小证据」小展览。</div>
  <img class="aman" src="${AMAN}" alt="大鹅阿满">
</body></html>`);
await cover.waitForTimeout(300);
await cover.screenshot({ path: path.join(DELIVERY, "cover.png") });
await cover.close();

await browser.close();

// 封面转 JPG（浏览器只出 PNG，统一成 jpg 便于上传）
const { execFileSync } = await import("node:child_process");
const ffmpeg = "D:\\ProgramFiles\\ffmpeg\\bin\\ffmpeg.exe";
execFileSync(ffmpeg, ["-y", "-i", path.join(DELIVERY, "cover.png"), "-q:v", "2", path.join(DELIVERY, "cover.jpg")], { stdio: "ignore" });

console.log("已生成：aman-protagonist-card.png / cover.jpg / （临时 game-frame-tmp.png 可删）");
