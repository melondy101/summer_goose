import { describe, expect, it } from "vitest";
import { buildChallengeUrl, newRunSeed } from "./challenge";

describe("挑战链接", () => {
  it("拼出只带 seed 的干净链接", () => {
    expect(buildChallengeUrl("https://summergoose.vercel.app", "/", "abc123")).toBe(
      "https://summergoose.vercel.app/?seed=abc123",
    );
  });

  it("保留路径并编码特殊字符", () => {
    expect(buildChallengeUrl("http://localhost:4173", "/game/", "鹅 42")).toBe(
      "http://localhost:4173/game/?seed=%E9%B9%85%2042",
    );
  });

  it("本地预览地址也能拼", () => {
    expect(buildChallengeUrl("http://127.0.0.1:4173", "/", "s3")).toBe(
      "http://127.0.0.1:4173/?seed=s3",
    );
  });
});

describe("新局种子", () => {
  it("格式为 8 位小写字母数字", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(newRunSeed()).toMatch(/^[0-9a-z]{8}$/);
    }
  });

  it("两次生成几乎不会相同", () => {
    const seeds = new Set(Array.from({ length: 50 }, () => newRunSeed()));
    expect(seeds.size).toBeGreaterThan(45);
  });
});
