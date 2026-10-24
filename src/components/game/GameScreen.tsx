import { useState } from "react";
import { ACTIVITY_LABELS } from "@/game/recipes";
import { RESIDENT_HINT, TOTAL_PICKS, forkReminder } from "@/game/rules";
import { dayLabel } from "@/game/day";
import { forkSentence } from "@/game/speech";
import type { Action, GameState, RecipeId } from "@/game/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActivityCard } from "./ActivityCard";
import { ExhibitStage } from "./ExhibitStage";
import { ForkNote } from "./ForkNote";
import { HandGrid } from "./HandGrid";
import { RecipeList } from "./RecipeList";
import { SpeechBubble } from "./SpeechBubble";
import { StampRow } from "./StampRow";

interface GameScreenProps {
  state: GameState;
  dispatch: (action: Action) => void;
  /** 开发测试种子，非空时在界面标注测试模式 */
  seed?: string | null;
}

export function GameScreen({ state, dispatch, seed }: GameScreenProps) {
  const [recipesOpen, setRecipesOpen] = useState(false);
  const reminder = forkReminder(state);
  const forkLine = forkSentence(reminder);
  const finalTidy = state.phase === "finalTidy";
  const replacing = state.phase === "replacing";
  const settled = state.phase === "settled";
  const craftingEnabled = !replacing && !settled;

  const craft = (recipeId: RecipeId) => dispatch({ kind: "CRAFT", recipeId });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 p-3 pb-8 sm:p-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-ink">大鹅的奇怪暑假</h1>
          <p data-testid="day-label" className="text-sm font-medium text-ink">
            {dayLabel(state.turn)}
          </p>
        </div>
        <p data-testid="resident-hint" className="text-sm leading-relaxed text-ink/85">
          {RESIDENT_HINT}
        </p>
        <StampRow state={state} />
        <p data-testid="remaining" className="text-xs text-outline">
          {finalTidy || settled ? "可以开张" : `还剩 ${TOTAL_PICKS - state.turn} 次`}
        </p>
        {seed ? (
          <p data-testid="test-mode" className="text-xs font-medium text-accent">
            测试模式：种子 {seed}，本局候选可复现
          </p>
        ) : null}
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <ExhibitStage state={state} />
          <SpeechBubble state={state} />
          <ForkNote state={state} />
        </div>

        <div className="flex flex-col gap-3">
          {replacing ? (
            <section
              data-testid="replace-panel"
              className="flex flex-col gap-2 rounded-card border-2 border-accent bg-card p-3"
            >
              <h2 className="text-sm font-semibold text-ink">满手替换</h2>
              <p className="text-sm text-ink/85">选择要移出布袋的旧牌，新牌会保留。</p>
              <p className="text-sm text-ink/85">
                新牌：
                <span className="font-medium">
                  {state.pendingCard ? ACTIVITY_LABELS[state.pendingCard.type] : ""}
                </span>
              </p>
              <Button
                variant="outline"
                onClick={() => dispatch({ kind: "CANCEL_REPLACE" })}
                data-testid="cancel-replace"
              >
                取消替换
              </Button>
            </section>
          ) : null}

          {!settled ? (
            <section aria-label="候选活动" className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-ink">
                {finalTidy
                  ? "不再发牌，还可以做成展品"
                  : replacing
                    ? "先处理布袋里的旧牌"
                    : "选一张放进布袋"}
              </h2>
              {finalTidy ? null : (
                <div className="grid grid-cols-3 gap-2" data-testid="candidate-row">
                  {state.candidates.map((card) => (
                    <ActivityCard
                      key={card.id}
                      type={card.type}
                      onSelect={() => dispatch({ kind: "PICK_CARD", cardId: card.id })}
                      disabled={replacing}
                    />
                  ))}
                </div>
              )}
              {finalTidy ? (
                <Button
                  size="lg"
                  onClick={() => dispatch({ kind: "FINISH" })}
                  data-testid="finish-run"
                >
                  小展览开张
                </Button>
              ) : null}
            </section>
          ) : null}

          <HandGrid
            state={state}
            onDiscard={replacing ? (cardId) => dispatch({ kind: "REPLACE_CARD", cardId }) : undefined}
          />

          <div className="flex flex-col gap-2">
            <Dialog open={recipesOpen} onOpenChange={setRecipesOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="open-recipes" className="lg:hidden">
                  查看配方{reminder ? "（有一处可以商量）" : ""}
                </Button>
              </DialogTrigger>
              <DialogContent aria-label="配方">
                <DialogHeader>
                  <DialogTitle>五个配方</DialogTitle>
                </DialogHeader>
                <RecipeList state={state} onCraft={craft} craftingEnabled={craftingEnabled} />
              </DialogContent>
            </Dialog>

            {forkLine ? (
              <p data-testid="fork-note-entry" className="text-xs leading-relaxed text-ink/80">
                {forkLine}
              </p>
            ) : null}

            <section className="hidden flex-col gap-2 lg:flex">
              <h2 className="text-sm font-semibold text-ink">配方</h2>
              <RecipeList state={state} onCraft={craft} craftingEnabled={craftingEnabled} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
