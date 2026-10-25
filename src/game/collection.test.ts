import { describe, expect, it } from "vitest";
import { collectionView } from "./collection";
import { createInitialState, hashRandom, type GameState } from "./rules";
import type { RecipeId, Souvenir } from "./types";

function fresh(): GameState {
  return createInitialState({ random: hashRandom });
}

function withSouvenirs(state: GameState, recipeIds: RecipeId[]): GameState {
  const souvenirs: Souvenir[] = recipeIds.map((recipeId, i) => ({
    id: `s${i}`,
    recipeId,
    craftedAtTurn: i,
  }));
  return { ...state, souvenirs };
}

describe("展品图鉴", () => {
  it("零展品时 0/5，预告提到前两件", () => {
    const view = collectionView(fresh());
    expect(view.madeCount).toBe(0);
    expect(view.countLabel).toBe("展品图鉴 0/5");
    expect(view.unmadeNames).toHaveLength(5);
    expect(view.nextRunTease).toContain("一颗石头的单间");
    expect(view.nextRunTease).toContain("绕树远征纪念章");
  });

  it("重复做同一件只计一种，但件数累计", () => {
    const view = collectionView(withSouvenirs(fresh(), ["tool", "tool"]));
    expect(view.madeCount).toBe(1);
    expect(view.countLabel).toBe("展品图鉴 1/5");
    const tool = view.progress.find((item) => item.recipeId === "tool");
    expect(tool?.count).toBe(2);
  });

  it("只差一件时预告点名那一件", () => {
    const view = collectionView(
      withSouvenirs(fresh(), ["tool", "training", "essay", "demo"]),
    );
    expect(view.madeCount).toBe(4);
    expect(view.unmadeNames).toEqual(["风的迟到记录"]);
    expect(view.nextRunTease).toBe("下个暑假，风的迟到记录还在等阿满。");
  });

  it("五件都做过时不再预告", () => {
    const view = collectionView(
      withSouvenirs(fresh(), ["tool", "training", "essay", "demo", "evening"]),
    );
    expect(view.madeCount).toBe(5);
    expect(view.countLabel).toBe("展品图鉴 5/5");
    expect(view.unmadeNames).toEqual([]);
    expect(view.nextRunTease).toBeNull();
  });

  it("进度按配方顺序排列且名字齐全", () => {
    const view = collectionView(withSouvenirs(fresh(), ["evening"]));
    expect(view.progress.map((item) => item.recipeId)).toEqual([
      "tool",
      "training",
      "essay",
      "demo",
      "evening",
    ]);
    expect(view.progress.every((item) => item.name.length > 0)).toBe(true);
    const evening = view.progress.find((item) => item.recipeId === "evening");
    expect(evening?.count).toBe(1);
  });
});
