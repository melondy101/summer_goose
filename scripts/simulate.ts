import { createInitialState, reduce, litWishes } from "../src/game/rules";
import { seededRandom } from "../src/game/random";
import { RECIPE_ORDER } from "../src/game/recipes";
import type { RecipeId } from "../src/game/types";

/** 与 e2e「未集齐三类展签」完全相同的贪心策略：每次先做第一个可做的配方，再选第一张候选。 */
function simulate(seed: string) {
  const random = seededRandom(seed);
  let state = createInitialState({ random });

  const craftFirst = () => {
    for (const id of RECIPE_ORDER) {
      const next = reduce(state, { kind: "CRAFT", recipeId: id as RecipeId }, { random });
      if (next !== state) {
        state = next;
        return;
      }
    }
  };

  for (let turn = 0; turn < 14; turn += 1) {
    craftFirst();
    state = reduce(
      state,
      { kind: "PICK_CARD", cardId: state.candidates[0].id },
      { random },
    );
    if (state.phase === "replacing") {
      state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, { random });
    }
  }
  craftFirst();

  return {
    stamps: litWishes(state.souvenirs).length,
    souvenirs: state.souvenirs.length,
    recipes: state.souvenirs.map((s) => s.recipeId),
  };
}

for (const seed of ["s3", "summer", "seed-6", "goose-1024"]) {
  console.log(seed, JSON.stringify(simulate(seed)));
}

const partial: string[] = [];
for (let i = 1; i <= 300; i += 1) {
  const seed = `s${i}`;
  const r = simulate(seed);
  if (r.stamps > 0 && r.stamps < 3) {
    partial.push(`${seed} ${JSON.stringify(r)}`);
    if (partial.length >= 5) break;
  }
}
console.log("partial candidates:\n" + (partial.join("\n") || "none"));
