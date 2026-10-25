import { RECIPES, RECIPE_ORDER } from "./recipes";
import type { GameState, RecipeId, Souvenir } from "./types";

export interface RecipeProgress {
  recipeId: RecipeId;
  name: string;
  /** 本局做成件数，0 表示还没做过 */
  count: number;
}

export interface CollectionView {
  /** 五件展品各自的本局完成件数 */
  progress: RecipeProgress[];
  /** 本局至少做过一次的展品种类数，0–5 */
  madeCount: number;
  total: number;
  /** 还没做过的展品名，按配方顺序 */
  unmadeNames: string[];
  /** 图鉴标题里的计数文案，如「展品图鉴 3/5」 */
  countLabel: string;
  /** 下一局预告；五件都做过时为 null */
  nextRunTease: string | null;
}

function countByRecipe(souvenirs: Souvenir[]): Map<RecipeId, number> {
  const counts = new Map<RecipeId, number>();
  for (const souvenir of souvenirs) {
    counts.set(souvenir.recipeId, (counts.get(souvenir.recipeId) ?? 0) + 1);
  }
  return counts;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join("、")}和${names[names.length - 1]}`;
}

/**
 * 结算页的展品图鉴视图：把本局做成的展品整理成收集进度，
 * 并给出一句「下个暑假」的预告，作为再玩一局的钩子。
 */
export function collectionView(state: GameState): CollectionView {
  const counts = countByRecipe(state.souvenirs);
  const progress: RecipeProgress[] = RECIPE_ORDER.map((recipeId) => ({
    recipeId,
    name: RECIPES[recipeId].name,
    count: counts.get(recipeId) ?? 0,
  }));
  const made = progress.filter((item) => item.count > 0);
  const unmadeNames = progress.filter((item) => item.count === 0).map((item) => item.name);
  const total = progress.length;

  let nextRunTease: string | null = null;
  if (unmadeNames.length === 1) {
    nextRunTease = `下个暑假，${unmadeNames[0]}还在等阿满。`;
  } else if (unmadeNames.length > 1) {
    nextRunTease = `下个暑假，${joinNames(unmadeNames.slice(0, 2))}都还没试过。`;
  }

  return {
    progress,
    madeCount: made.length,
    total,
    unmadeNames,
    countLabel: `展品图鉴 ${made.length}/${total}`,
    nextRunTease,
  };
}
