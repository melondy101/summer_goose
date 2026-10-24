import type { ActivityType, RecipeId, WishId } from "./types";

export const ACTIVITY_ORDER: ActivityType[] = [
  "research",
  "tinker",
  "flap",
  "stroll",
  "record",
  "share",
];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  research: "研究",
  tinker: "捣鼓",
  flap: "扑腾",
  stroll: "溜达",
  record: "记录",
  share: "分享",
};

export const ACTIVITY_LINES: Record<ActivityType, string> = {
  research: "蹲下来，看看它为什么是这样。",
  tinker: "先拼起来，说不定能用。",
  flap: "翅膀伸开，脚掌也动起来。",
  stroll: "往树荫多的地方走走。",
  record: "这个得记下来。",
  share: "给你看看，先别笑。",
};

export interface Recipe {
  id: RecipeId;
  /** 纪念物基础名 */
  name: string;
  wish: WishId;
  cost: Partial<Record<ActivityType, number>>;
  /** 固定造型 */
  shape: string;
  /** 模板文案 */
  template: string;
  /** 同一展签再次合成时的台词 */
  recraftLine: string;
}

export const RECIPE_ORDER: RecipeId[] = ["tool", "training", "essay", "demo", "evening"];

export const RECIPES: Record<RecipeId, Recipe> = {
  tool: {
    id: "tool",
    name: "一颗石头的单间",
    wish: "create",
    cost: { research: 2, tinker: 1 },
    shape: "一个只装得下一颗圆石头的小布口袋",
    template: "容量很小，但那颗石头住得很舒服。",
    recraftLine: "口袋很小，石头住进去刚好。",
  },
  training: {
    id: "training",
    name: "绕树远征纪念章",
    wish: "body",
    cost: { flap: 2, record: 1 },
    shape: "树叶形小纸章，画着一圈歪歪的路线",
    template: "最远去到树的另一边，也值得盖个章。",
    recraftLine: "最远到树的另一边，章可以再盖一枚。",
  },
  essay: {
    id: "essay",
    name: "树荫体验报告",
    wish: "echo",
    cost: { stroll: 1, record: 1, share: 1 },
    shape: "叶片压着的一张简短观察纸",
    template: "结论只有一句：「下午这边比较凉。」",
    recraftLine: "下午这边比较凉，又记了一张。",
  },
  demo: {
    id: "demo",
    name: "瓶盖碰碰棋",
    wish: "create",
    cost: { research: 1, tinker: 1, share: 1 },
    shape: "几枚瓶盖摆在手画的棋盘上",
    template: "规则还没讲完，阿满已经很想再摆一盘。",
    recraftLine: "规则还是可以以后再讲。",
  },
  evening: {
    id: "evening",
    name: "风的迟到记录",
    wish: "echo",
    cost: { flap: 1, stroll: 1, record: 1 },
    shape: "一张被风掀起边角的记录纸",
    template: "等了半天，风来的时候把记录吹跑了。",
    recraftLine: "风又来晚了，记录还在。",
  },
};

export const WISH_ORDER: WishId[] = ["create", "body", "echo"];

export const WISH_LABELS: Record<WishId, string> = {
  create: "小小创造",
  body: "身体出过门",
  echo: "日子有回声",
};

export function wishOfRecipe(recipeId: RecipeId): WishId {
  return RECIPES[recipeId].wish;
}

export function recipeName(recipeId: RecipeId): string {
  return RECIPES[recipeId].name;
}
