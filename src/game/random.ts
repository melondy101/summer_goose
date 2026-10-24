import type { KeyedRandom } from "./types";

/** 默认随机源：以稳定键为种子，同一键永远得到同一个数。 */
export function hashRandom(key: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let t = (h + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * 开发测试种子：把 ?seed=<值> 混入键名，使整局候选可复现。
 * 只用于试玩与自动化，不作为随机平衡已通过的证据。
 */
export function seededRandom(seed: string): KeyedRandom {
  return (key: string) => hashRandom(`${seed}::${key}`);
}

export function readSeed(search: string): string | null {
  const value = new URLSearchParams(search).get("seed");
  if (!value) return null;
  return value.trim() === "" ? null : value;
}
