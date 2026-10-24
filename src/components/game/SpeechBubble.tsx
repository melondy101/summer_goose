import { speechLine } from "@/game/speech";
import type { GameState } from "@/game/types";

/** 阿满的台词。没有台词时不留空框。 */
export function SpeechBubble({ state }: { state: GameState }) {
  const line = speechLine(state);
  if (!line) return null;
  return (
    <p
      data-testid="speech"
      className="rounded-card border-2 border-outline bg-paper px-3 py-2 text-sm leading-relaxed text-ink"
    >
      {line}
    </p>
  );
}
