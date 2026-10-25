// 讲解录屏（配音版）：按解说时长控制节奏录制完整一局，然后混音＋烧字幕。
// 前置：vite preview 4199 已启动；test-results/narration/*.wav 已生成。
// 用法：node scripts/make_demo_video.mjs
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = "http://localhost:4199";
const VIDEO_DIR = path.join(ROOT, "test-results", "video2");
const NARR_DIR = path.join(ROOT, "test-results", "narration");
const DELIVERY = path.join(ROOT, "assets", "delivery");
const FFMPEG = "D:\\ProgramFiles\\ffmpeg\\bin\\ffmpeg.exe";
const FFPROBE = "D:\\ProgramFiles\\ffmpeg\\bin\\ffprobe.exe";
await mkdir(VIDEO_DIR, { recursive: true });
await mkdir(DELIVERY, { recursive: true });

const PHASES = [
  "p_intro",
  "p_pick",
  "p_craft",
  "p_replace",
  "p_finish",
  "p_ending",
  "p_challenge",
  "p_collection",
  "p_restart",
];

function probe(file) {
  const out = execFileSync(FFPROBE, [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file,
  ]).toString().trim();
  return Number(out);
}

const narration = {};
for (const phase of PHASES) {
  narration[phase] = probe(path.join(NARR_DIR, `${phase}.wav`));
}
console.log("解说时长", narration);

// ---------- 录制 ----------
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

const t0 = Date.now();
const timeline = [];

async function phase(name, fn) {
  const minDur = narration[name] + 0.9;
  const start = (Date.now() - t0) / 1000;
  await fn();
  const elapsed = (Date.now() - t0) / 1000 - start;
  if (elapsed < minDur) await page.waitForTimeout((minDur - elapsed) * 1000);
  const end = (Date.now() - t0) / 1000;
  timeline.push({ name, start, end });
  console.log(`${name} ${start.toFixed(2)} -> ${end.toFixed(2)}`);
}

const pick = async (ms = 650) => {
  await page.getByTestId("candidate-row").locator('[data-testid^="activity-"]').first().click();
  await page.waitForTimeout(ms);
  const cancel = page.getByTestId("cancel-replace");
  if (await cancel.isVisible().catch(() => false)) {
    await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
    await page.waitForTimeout(ms);
  }
};

const craftIfPossible = async () => {
  const craftable = page.locator('[data-testid^="craft-"]:not([disabled]):visible');
  if ((await craftable.count()) > 0) {
    await craftable.first().click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
};

await page.goto(`${BASE}/?seed=s3`);

await phase("p_intro", async () => {
  await page.waitForTimeout(1200); // 等页面稳定
});

let crafted = false;
await phase("p_pick", async () => {
  await page.getByTestId("start-run").click();
  await page.getByTestId("day-label").waitFor();
  await pick(1000);
  await pick(1000);
});

await phase("p_craft", async () => {
  for (let i = 0; i < 6 && !crafted; i += 1) {
    crafted = await craftIfPossible();
    if (!crafted) await pick(400);
  }
  if (!crafted) crafted = await craftIfPossible();
});

await phase("p_replace", async () => {
  // 只选不做，直到触发满手替换（最多 10 次保底）
  for (let i = 0; i < 10; i += 1) {
    await page.getByTestId("candidate-row").locator('[data-testid^="activity-"]').first().click();
    await page.waitForTimeout(350);
    if (await page.getByTestId("cancel-replace").isVisible().catch(() => false)) return;
  }
});

await phase("p_finish", async () => {
  // 完成替换 + 快速过完剩余天数，然后开张
  if (await page.getByTestId("cancel-replace").isVisible().catch(() => false)) {
    await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
    await page.waitForTimeout(300);
  }
  for (let i = 0; i < 14; i += 1) {
    const row = page.getByTestId("candidate-row").locator('[data-testid^="activity-"]');
    if ((await row.count()) === 0) break;
    await row.first().click();
    await page.waitForTimeout(280);
    if (await page.getByTestId("cancel-replace").isVisible().catch(() => false)) {
      await page.getByTestId("hand-grid").locator('[data-testid^="activity-"]').first().click();
      await page.waitForTimeout(280);
    }
  }
  await page.getByTestId("finish-run").click();
  await page.waitForTimeout(800);
});

await phase("p_ending", async () => {
  await page.locator('[aria-label="展品"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
});

await phase("p_challenge", async () => {
  await page.getByTestId("challenge-section").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.getByTestId("challenge-copy").click();
  await page.waitForTimeout(600);
});

await phase("p_collection", async () => {
  await page.getByTestId("collection").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
});

await phase("p_restart", async () => {
  await page.getByTestId("restart-run").scrollIntoViewIfNeeded();
  await page.getByTestId("restart-run").click();
  await page.waitForTimeout(1200);
});

const totalRaw = (Date.now() - t0) / 1000 + 0.4;
await context.close();
await browser.close();

const files = (await readdir(VIDEO_DIR)).filter((f) => f.endsWith(".webm"));
const src = path.join(VIDEO_DIR, files[files.length - 1]);
const videoDur = probe(src);
console.log(`视频 ${videoDur.toFixed(2)}s，时间轴总长 ${totalRaw.toFixed(2)}s`);
const total = Math.min(videoDur, totalRaw);

// ---------- 字幕（ASS） ----------
const ts = (sec) => {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${r.toFixed(2).padStart(5, "0")}`;
};

const TEXTS = JSON.parse(await readFile(path.join(ROOT, "test-results", "narration.json"), "utf8"));
const assLines = [
  "[Script Info]",
  "ScriptType: v4.00+",
  "PlayResX: 1280",
  "PlayResY: 720",
  "",
  "[V4+ Styles]",
  "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
  "Style: Default,Microsoft YaHei,17,&H002C343F,&H002C343F,&H60E7F4FB,&H60E7F4FB,0,0,0,0,100,100,0,0,3,2,0,2,40,40,30,1",
  "",
  "[Events]",
  "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
];
for (const item of timeline) {
  const start = Math.max(0, item.start - 0.15);
  const end = Math.min(total, item.end + 0.25);
  assLines.push(`Dialogue: 0,${ts(start)},${ts(end)},Default,,0,0,0,,${TEXTS[item.name]}`);
}
const assPath = path.join(VIDEO_DIR, "subs.ass");
await writeFile(assPath, assLines.join("\n"), "utf8");

// ---------- 混音 ----------
// 解说比时间轴略晚一点开始（对齐录屏启动偏差），音量放大 1.3
// 字幕用相对路径：Windows 盘符冒号会破坏 subtitles 滤镜的选项解析
const assRel = path.relative(ROOT, assPath).replaceAll("\\", "/");
const filters = [];
const mixLabels = [];
PHASES.forEach((phase, index) => {
  const item = timeline.find((entry) => entry.name === phase);
  if (!item) return;
  const delayMs = Math.max(0, Math.round((item.start + 0.05) * 1000));
  filters.push(`[${index + 1}:a]adelay=${delayMs}|${delayMs},volume=1.3[a${index}]`);
  mixLabels.push(`[a${index}]`);
});
filters.push(`[0:v]subtitles=${assRel}[vout]`);
filters.push(`${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=longest:normalize=0[aout]`);

const args = ["-y"];
args.push("-i", src);
for (const phase of PHASES) args.push("-i", path.join(NARR_DIR, `${phase}.wav`));
args.push(
  "-filter_complex", filters.join(";"),
  "-map", "[vout]", "-map", "[aout]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
  "-t", total.toFixed(2),
  path.join(DELIVERY, "demo.mp4"),
);
console.log("混合中…");
execFileSync(FFMPEG, args, { stdio: "inherit", cwd: ROOT });
console.log(`完成：assets/delivery/demo.mp4（${probe(path.join(DELIVERY, "demo.mp4")).toFixed(1)}s）`);
