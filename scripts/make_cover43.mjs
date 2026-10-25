// 生成 4:3 作品封面（1600×1200 JPG），用于官方提交。用法：node scripts/make_cover43.mjs
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const AMAN = pathToFileURL(path.join(ROOT, "assets", "concepts", "aman-c-simple-v1.png")).href;
const DELIVERY = path.join(ROOT, "assets", "delivery");
const ffmpeg = "D:\\ProgramFiles\\ffmpeg\\bin\\ffmpeg.exe";
const FONT = `'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1600px; height: 1200px; background: #FBF4E7; font-family: ${FONT}; overflow: hidden; position: relative; }
  .aman { position: absolute; right: 90px; top: 130px; width: 900px; height: 900px; object-fit: contain; }
  .badge { position: absolute; left: 110px; top: 210px; font-size: 34px; color: #FBF4E7; background: #A0A078; border-radius: 999px; padding: 14px 36px; letter-spacing: 3px; }
  .name { position: absolute; left: 110px; top: 340px; width: 620px; font-size: 118px; font-weight: 700; color: #3F342C; line-height: 1.22; letter-spacing: 6px; }
  .tag { position: absolute; left: 112px; top: 720px; width: 560px; font-size: 42px; color: #807050; line-height: 1.75; }
  .foot { position: absolute; left: 110px; bottom: 72px; font-size: 30px; color: #807050; letter-spacing: 2px; }
</style></head><body>
  <div class="badge">1024 切磋大会 · 游戏赛道</div>
  <div class="name">大鹅的<br>奇怪暑假</div>
  <div class="tag">七天 · 选牌 · 合成展品<br>办一场「夏天来过的小证据」<br>小展览，还能发给朋友<br>挑战同一副牌。</div>
  <img class="aman" src="${AMAN}" alt="大鹅阿满">
  <div class="foot">角色与展品 AI 生成 · 游戏本体 AI 编程实现</div>
</body></html>`);
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(DELIVERY, "cover43.png") });
await browser.close();
execFileSync(ffmpeg, ["-y", "-i", path.join(DELIVERY, "cover43.png"), "-q:v", "2", path.join(DELIVERY, "cover43.jpg")], { stdio: "ignore" });
console.log("已生成 cover43.jpg (1600x1200)");
