import { AMAN_IMAGE } from "@/game/artwork";
import { RECIPES } from "@/game/recipes";
import type { GameState } from "@/game/types";
import { ExhibitImage } from "./ExhibitImage";

interface ExhibitStageProps {
  state: GameState;
}

/** 河岸展桌：阿满 + 已做成的展品。零展品时显示「今天先晒晒桌子」文字牌。 */
export function ExhibitStage({ state }: ExhibitStageProps) {
  const empty = state.souvenirs.length === 0;
  return (
    <section
      aria-label="河边展桌"
      className="flex flex-col gap-3 rounded-card border-2 border-outline bg-card p-3"
    >
      <div className="flex items-end gap-3">
        <img
          src={AMAN_IMAGE}
          alt="大鹅阿满，挎着偏大的草绿色布袋，袋口露出一片叶子"
          className="h-24 w-24 shrink-0 rounded-card sm:h-32 sm:w-32"
          draggable={false}
        />
        <p className="pb-1 text-sm leading-relaxed text-ink/80">
          阿满在蝉鸣湾河边摆了一张空桌子，七天后这里要办夏日小集市。
        </p>
      </div>

      <div
        data-testid="exhibit-table"
        className="flex min-h-28 flex-wrap content-start items-end gap-2 rounded-card border-2 border-dashed border-outline/60 bg-ground p-2"
      >
        {empty ? (
          <p className="m-auto text-sm text-outline">今天先晒晒桌子</p>
        ) : (
          state.souvenirs.map((souvenir) => (
            <figure key={souvenir.id} className="m-0 flex flex-col items-center gap-1">
              <ExhibitImage
                recipeId={souvenir.recipeId}
                alt={RECIPES[souvenir.recipeId].name}
                className="h-16 w-16 sm:h-20 sm:w-20"
              />
              <figcaption className="max-w-20 text-center text-[11px] leading-tight text-ink/80">
                {RECIPES[souvenir.recipeId].name}
              </figcaption>
            </figure>
          ))
        )}
      </div>
    </section>
  );
}
