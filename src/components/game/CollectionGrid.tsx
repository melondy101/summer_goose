import { collectionView } from "@/game/collection";
import type { GameState } from "@/game/types";
import { ExhibitImage } from "./ExhibitImage";
import { cn } from "@/lib/utils";

/** 结算页的展品图鉴：五件展品的本局收集进度，是「再来一局」的钩子。 */
export function CollectionGrid({ state }: { state: GameState }) {
  const view = collectionView(state);
  return (
    <section aria-label="展品图鉴" data-testid="collection" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <h2 data-testid="collection-count" className="text-sm font-semibold text-ink">
          {view.countLabel}
        </h2>
        {view.nextRunTease ? (
          <p data-testid="collection-tease" className="text-xs text-ink/75">
            {view.nextRunTease}
          </p>
        ) : null}
      </div>
      <ul className="grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-5">
        {view.progress.map((item) => {
          const made = item.count > 0;
          return (
            <li
              key={item.recipeId}
              data-testid={`collection-${item.recipeId}`}
              data-made={made ? "true" : "false"}
              className={cn(
                "flex flex-col items-center gap-1 rounded-card border-2 p-2 text-center",
                made ? "border-outline bg-card" : "border-dashed border-outline/50 bg-ground",
              )}
            >
              <ExhibitImage
                recipeId={item.recipeId}
                alt={item.name}
                className={cn("h-14 w-14", !made && "opacity-40 grayscale")}
              />
              <span className="text-xs font-medium text-ink">{item.name}</span>
              <span className="text-[11px] leading-tight text-ink/70">
                {made ? (item.count > 1 ? `本局做了 ${item.count} 件` : "本局做过") : "还没做过"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
