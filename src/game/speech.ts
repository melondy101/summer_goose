import {
  ACTIVITY_LABELS,
  RECIPES,
  RECIPE_ORDER,
  WISH_LABELS,
  WISH_ORDER,
} from "./recipes";
import type { ActivityType, GameState, RecipeId, Speech, WishId } from "./types";

function book(name: string): string {
  return `《${name}》`;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join("、")}和${labels[labels.length - 1]}`;
}

/** 按设计第 2.5 节台词表把 speech 渲染成一句话。 */
export function speechLine(state: GameState): string | null {
  const speech: Speech | null = state.speech;
  if (!speech) return null;
  switch (speech.kind) {
    case "opening":
      return "空桌子也是桌子，先去捡。";
    case "firstSouvenir":
      return `${book(RECIPES[speech.recipeId].name)}，这可是好东西。`;
    case "newStamp":
      return `${book(RECIPES[speech.recipeId].name)}摆上来了，展签名盖上了。`;
    case "recraft":
      return RECIPES[speech.recipeId].recraftLine;
    case "bagFull":
      return "布袋满了，可以先做一件，也可以换掉一张旧的。";
    case "discard":
      return "先留在这里，下次路过再看看。";
    case "lastTidy":
      return "到最后一下午了，桌上和布袋里就是这次的暑假。";
    case "endingAll":
      return "三种展签都在，夏天来过这里。";
    case "endingPartial": {
      const names = missingStampLabels(state);
      return `还差${joinLabels(names)}，桌上这些先摆着。`;
    }
    case "endingEmpty":
      return "布袋还是鼓的，这些都是好东西，今天先不摆。";
    default:
      return null;
  }
}

/** 未点亮的展签名，按小小创造、身体出过门、日子有回声排列。 */
export function missingStampLabels(state: GameState): string[] {
  const missing: WishId[] = state.ending?.missingWishes ?? [];
  return WISH_ORDER.filter((wish) => missing.includes(wish)).map((wish) => WISH_LABELS[wish]);
}

export interface SettlementLines {
  /** 记下的两件恰好做成一句；否则为 null */
  choice: string | null;
  /** 「下个暑假可以试试」；出现选择句时为 null */
  unmade: string | null;
}

function craftedRecipeIds(state: GameState): Set<RecipeId> {
  return new Set(state.souvenirs.map((souvenir) => souvenir.recipeId));
}

function firstUnmadeRecipeId(state: GameState): RecipeId | null {
  const crafted = craftedRecipeIds(state);
  return RECIPE_ORDER.find((id) => !crafted.has(id)) ?? null;
}

/** 结算时的选择句与未制作提示，二者互斥。 */
export function settlementLines(state: GameState): SettlementLines {
  const fork = state.notedFork;
  if (fork) {
    const crafted = craftedRecipeIds(state);
    const madeCraft = crafted.has(fork.craftRecipeId);
    const madeOther = crafted.has(fork.otherRecipeId);
    if (madeCraft !== madeOther) {
      const made = madeCraft ? fork.craftRecipeId : fork.otherRecipeId;
      const missed = madeCraft ? fork.otherRecipeId : fork.craftRecipeId;
      return {
        choice: `${book(RECIPES[made].name)}做成了，${book(RECIPES[missed].name)}那次没做。`,
        unmade: null,
      };
    }
  }
  const unmade = firstUnmadeRecipeId(state);
  return {
    choice: null,
    unmade: unmade ? `下个暑假可以试试${book(RECIPES[unmade].name)}。` : null,
  };
}

export interface ForkReminderView {
  craftRecipeId: RecipeId;
  otherRecipeId: RecipeId;
  materials: ActivityType[];
}

/** 材料提醒句子，按当前手牌重算材料列表。 */
export function forkSentence(reminder: ForkReminderView | null): string | null {
  if (!reminder) return null;
  const craft = RECIPES[reminder.craftRecipeId];
  const other = RECIPES[reminder.otherRecipeId];
  if (!craft || !other) return null;
  const labels = reminder.materials.map((type) => ACTIVITY_LABELS[type]);
  return `现在做${book(craft.name)}，会用掉${joinLabels(labels)}。${book(other.name)}也要用到。`;
}
