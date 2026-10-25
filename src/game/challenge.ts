/** 结算页「同一副牌挑战」：把本局种子变成可以发给朋友的链接。 */

/** 生成 8 位 base36 新局种子；只做局标识，不做安全用途。 */
export function newRunSeed(): string {
  let seed = "";
  for (let i = 0; i < 8; i += 1) {
    seed += Math.floor(Math.random() * 36).toString(36);
  }
  return seed;
}

/** 挑战链接只保留 seed 参数，去掉其余查询串，方便直接发送。 */
export function buildChallengeUrl(origin: string, pathname: string, seed: string): string {
  const base = `${origin}${pathname === "" ? "/" : pathname}`;
  const joiner = base.endsWith("/") ? "" : "/";
  return `${base}${joiner}?seed=${encodeURIComponent(seed)}`;
}
