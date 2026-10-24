import { forkReminder } from "@/game/rules";
import { forkSentence } from "@/game/speech";
import type { GameState } from "@/game/types";

/** 材料提醒。替换阶段合成暂停，这句先隐藏。 */
export function ForkNote({ state }: { state: GameState }) {
  const sentence = forkSentence(forkReminder(state));
  if (!sentence) return null;
  return (
    <p
      data-testid="fork-note"
      className="rounded-card border-2 border-accent bg-card px-3 py-2 text-sm leading-relaxed text-ink"
    >
      {sentence}
    </p>
  );
}
