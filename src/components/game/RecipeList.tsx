import { ACTIVITY_LABELS, RECIPES, RECIPE_ORDER } from "@/game/recipes";
import { canCraft } from "@/game/rules";
import { forkReminder } from "@/game/rules";
import type { GameState, RecipeId } from "@/game/types";
import { Button } from "@/components/ui/button";
import { ExhibitImage } from "./ExhibitImage";

interface RecipeListProps {
  state: GameState;
  onCraft: (recipeId: RecipeId) => void;
  craftingEnabled: boolean;
}

/** 配方面板：所有配方一开始可查阅，显示已持有/所需数量，缺卡时禁用合成。 */
export function RecipeList({ state, onCraft, craftingEnabled }: RecipeListProps) {
  const reminder = forkReminder(state);
  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {RECIPE_ORDER.map((recipeId) => {
        const recipe = RECIPES[recipeId];
        const ok = canCraft(state.hand, recipeId);
        const isReminder = reminder?.craftRecipeId === recipeId;
        return (
          <li
            key={recipeId}
            data-testid={`recipe-${recipeId}`}
            className={[
              "flex items-center gap-3 rounded-card border-2 bg-card p-2",
              isReminder ? "border-accent" : "border-outline",
            ].join(" ")}
          >
            <ExhibitImage
              recipeId={recipeId}
              alt={recipe.name}
              className="h-12 w-12 shrink-0"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-semibold text-ink">{recipe.name}</span>
              <span className="text-xs text-ink/75">{recipe.template}</span>
              <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-outline">
                {Object.entries(recipe.cost).map(([type, need]) => {
                  const have = state.hand.filter((card) => card.type === type).length;
                  return (
                    <span key={type} data-testid={`cost-${recipeId}-${type}`}>
                      {ACTIVITY_LABELS[type as keyof typeof ACTIVITY_LABELS]} {have}/{need}
                    </span>
                  );
                })}
              </span>
            </div>
            <Button
              size="sm"
              variant={ok ? "default" : "outline"}
              disabled={!ok || !craftingEnabled}
              onClick={() => onCraft(recipeId)}
              data-testid={`craft-${recipeId}`}
            >
              做成
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
