import { RECIPES, RECIPE_ORDER, WISH_LABELS, WISH_ORDER } from "./recipes";
import { litWishes } from "./rules";
import type { GameState } from "./types";

export interface EndingLetter {
  title: string;
  letter: string;
  /** 模板来源标识，不能冒充真实 AI 成果 */
  source: "template";
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join("、")}和${names[names.length - 1]}`;
}

/**
 * 结尾信的模板版本。只陈述本局实际发生的展品与展签，不夸大完成情况，
 * 也不声称发生过额外活动或获得额外道具。
 */
export function endingLetter(state: GameState): EndingLetter {
  const made = state.souvenirs.map((souvenir) => RECIPES[souvenir.recipeId].name);
  const lit = litWishes(state.souvenirs);
  const missing = WISH_ORDER.filter((wish) => !lit.includes(wish));

  const title =
    missing.length === 0 ? "夏天来过的小证据" : `还剩${joinNames(missing.map((w) => WISH_LABELS[w]))}的暑假`;

  const lines: string[] = [];
  lines.push("玩家你好，我是阿满。");
  if (made.length === 0) {
    lines.push("这七天我一直在捡东西，布袋到现在还是鼓的。");
    lines.push("桌上的东西先不摆了，桌子今天先晒晒太阳。");
  } else {
    lines.push(`这七天我做成了${joinNames(made)}。`);
    if (missing.length === 0) {
      lines.push("三种展签都盖上了，夏天真的来过这里。");
    } else {
      lines.push(`展签还差${joinNames(missing.map((w) => WISH_LABELS[w]))}，不过桌上这些我都喜欢。`);
    }
  }
  lines.push("下次路过，我们再一起捡东西。");

  const unmade = RECIPE_ORDER.find(
    (id) => !state.souvenirs.some((souvenir) => souvenir.recipeId === id),
  );
  if (unmade) lines.push(`我还在想${RECIPES[unmade].name}要怎么做。`);

  return { title, letter: lines.join(""), source: "template" };
}
