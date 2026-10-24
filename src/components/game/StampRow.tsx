import { cn } from "@/lib/utils";
import { WISH_LABELS, WISH_ORDER } from "@/game/recipes";
import { litWishes } from "@/game/rules";
import type { GameState, WishId } from "@/game/types";

interface StampRowProps {
  state: GameState;
}

/** 三种展签。未点亮只有轮廓，点亮后填充。 */
export function StampRow({ state }: StampRowProps) {
  const lit = litWishes(state.souvenirs);
  return (
    <ul aria-label="三种展签" className="flex list-none flex-wrap gap-2 p-0">
      {WISH_ORDER.map((wish: WishId) => {
        const on = lit.includes(wish);
        return (
          <li key={wish}>
            <span
              data-testid={`stamp-${wish}`}
              data-lit={on ? "true" : "false"}
              className={cn(
                "inline-flex min-h-11 items-center rounded-card border-2 px-3 text-sm font-medium",
                on ? "border-bag bg-bag text-ground" : "border-outline bg-card text-outline",
              )}
            >
              {WISH_LABELS[wish]}
              <span className="ml-1 text-xs">{on ? "已盖章" : "未点亮"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
