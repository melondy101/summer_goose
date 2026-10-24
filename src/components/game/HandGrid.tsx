import { HAND_LIMIT } from "@/game/rules";
import type { GameState } from "@/game/types";
import { ActivityCard } from "./ActivityCard";

interface HandGridProps {
  state: GameState;
  /** 满手替换阶段：点击一张旧牌弃掉 */
  onDiscard?: (cardId: string) => void;
}

/** 布袋手牌。满手替换时每张卡可点击移出。 */
export function HandGrid({ state, onDiscard }: HandGridProps) {
  const replacing = state.phase === "replacing" && Boolean(onDiscard);
  const slots = Array.from({ length: HAND_LIMIT }, (_, index) => state.hand[index] ?? null);
  return (
    <section aria-label="布袋" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-ink">
        布袋 {state.hand.length}/{HAND_LIMIT}
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3" data-testid="hand-grid">
        {slots.map((card, index) =>
          card ? (
            <ActivityCard
              key={card.id}
              type={card.type}
              compact
              disabled={!replacing}
              onSelect={replacing ? () => onDiscard?.(card.id) : undefined}
              label={replacing ? "点我移出" : undefined}
            />
          ) : (
            <div
              key={`empty-${index}`}
              aria-hidden="true"
              className="min-h-11 rounded-card border-2 border-dashed border-outline/40 bg-ground"
            />
          ),
        )}
      </div>
      {replacing ? (
        <p className="text-xs text-outline">选择要移出布袋的旧牌，新牌会保留。</p>
      ) : null}
    </section>
  );
}
