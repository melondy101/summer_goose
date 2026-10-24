import { TOTAL_PICKS } from "./rules";

/** 天数写成「第 3 天 · 下午」，从第 1 天上午到第 7 天下午。 */
export function dayLabel(turn: number): string {
  const index = Math.min(turn, TOTAL_PICKS - 1);
  const day = Math.floor(index / 2) + 1;
  const period = index % 2 === 0 ? "上午" : "下午";
  return `第 ${day} 天 · ${period}`;
}
