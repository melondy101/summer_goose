import { endingLetter } from "@/game/letter";
import { RECIPES, WISH_LABELS, WISH_ORDER } from "@/game/recipes";
import { litWishes } from "@/game/rules";
import { settlementLines } from "@/game/speech";
import type { GameState } from "@/game/types";
import { Button } from "@/components/ui/button";
import { ExhibitImage } from "./ExhibitImage";
import { SpeechBubble } from "./SpeechBubble";
import { StampRow } from "./StampRow";

interface EndingScreenProps {
  state: GameState;
  onRestart: () => void;
}

/** 结算就是小展览开张。三种分支：三类全亮、未集齐、零展品。 */
export function EndingScreen({ state, onRestart }: EndingScreenProps) {
  const lit = litWishes(state.souvenirs);
  const letter = endingLetter(state);
  const lines = settlementLines(state);
  const empty = state.souvenirs.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3 pb-10 sm:p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-ink">夏天来过的小证据</h1>
        <p className="text-sm text-ink/80">
          {empty
            ? "今天先晒晒桌子"
            : lit.length === WISH_ORDER.length
              ? "三种展签都盖上了"
              : `已完成 ${lit.length}/3 种展签`}
        </p>
      </header>

      <StampRow state={state} />

      <SpeechBubble state={state} />

      {empty ? null : (
        <section aria-label="展品" className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">桌上的展品</h2>
          <ul className="grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3">
            {state.souvenirs.map((souvenir) => (
              <li
                key={souvenir.id}
                className="flex flex-col items-center gap-1 rounded-card border-2 border-outline bg-card p-2"
              >
                <ExhibitImage
                  recipeId={souvenir.recipeId}
                  alt={RECIPES[souvenir.recipeId].name}
                  className="h-20 w-20"
                />
                <span className="text-center text-xs font-medium text-ink">
                  {RECIPES[souvenir.recipeId].name}
                </span>
                <span className="text-center text-[11px] leading-tight text-ink/70">
                  {RECIPES[souvenir.recipeId].template}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {empty ? (
        <section className="rounded-card border-2 border-dashed border-outline bg-card p-4">
          <p className="text-sm text-ink/85">今天先晒晒桌子</p>
          <p className="mt-1 text-xs text-outline">文字牌是场景提示，不计作展品。</p>
        </section>
      ) : null}

      {lines.choice ? (
        <p data-testid="ending-choice" className="text-sm text-ink/85">
          {lines.choice}
        </p>
      ) : null}
      {lines.unmade ? (
        <p data-testid="ending-unmade" className="text-sm text-ink/85">
          {lines.unmade}
        </p>
      ) : null}

      <section aria-label="阿满的信" className="flex flex-col gap-2 rounded-card border-2 border-outline bg-card p-4">
        <h2 className="text-sm font-semibold text-ink">{letter.title}</h2>
        <p data-testid="ending-letter" className="text-sm leading-relaxed text-ink/85">
          {letter.letter}
        </p>
        <p className="text-xs text-outline">这封信由固定模板写成，没有调用模型。</p>
      </section>

      <section aria-label="展签完成情况" className="flex flex-col gap-1 text-sm text-ink/85">
        {WISH_ORDER.map((wish) => (
          <p key={wish}>
            {WISH_LABELS[wish]}：{lit.includes(wish) ? "已盖章" : "未点亮"}
          </p>
        ))}
      </section>

      <Button size="lg" onClick={onRestart} data-testid="restart-run">
        再过一个暑假
      </Button>
    </main>
  );
}
