import { FORK_EXAMPLE, RESIDENT_HINT } from "@/game/rules";
import { AMAN_IMAGE } from "@/game/artwork";
import { Button } from "@/components/ui/button";

const INTRO =
  "帮一只把小破烂当宝贝的大鹅，在七天暑假里收集灵感、合成奇怪又可爱的展品，办一场叫作「夏天来过的小证据」的小展览。";

interface StartScreenProps {
  hasSave: boolean;
  onStart: () => void;
  onContinue: () => void;
  onRestart: () => void;
  storageReady: boolean;
}

/** 规则说明即开始页，选牌前不再弹一层教程。 */
export function StartScreen({
  hasSave,
  onStart,
  onContinue,
  onRestart,
  storageReady,
}: StartScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 p-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <img
            src={AMAN_IMAGE}
            alt="大鹅阿满"
            data-testid="hero-goose"
            className="h-24 w-24 shrink-0 rounded-card border-2 border-outline bg-card object-cover p-1"
            draggable={false}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-bold text-ink">大鹅的奇怪暑假</h1>
            <p className="text-xs font-medium text-outline">主角：阿满，一只爱捡东西的大鹅</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-ink/85">{INTRO}</p>
      </header>

      <section className="flex flex-col gap-2 rounded-card border-2 border-outline bg-card p-4">
        <h2 className="text-sm font-semibold text-ink">怎么玩</h2>
        <p className="text-sm leading-relaxed text-ink/85">{RESIDENT_HINT}</p>
        <p className="text-sm leading-relaxed text-ink/85">{FORK_EXAMPLE}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink/85">
          <li>每次从三张候选里选一张放进布袋，布袋最多装 6 张。</li>
          <li>凑齐三张就能做一件展品，合成不花时间。</li>
          <li>七天后小展览开张，没集齐也能开张。</li>
        </ul>
      </section>

      {!storageReady ? (
        <p className="text-xs text-outline">这台设备暂时不能保存进度，本次页面内仍然可以完整玩一局。</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {hasSave ? (
          <>
            <Button size="lg" onClick={onContinue} data-testid="continue-run">
              继续
            </Button>
            <Button size="lg" variant="outline" onClick={onRestart} data-testid="restart-from-start">
              再过一个暑假
            </Button>
          </>
        ) : (
          <Button size="lg" onClick={onStart} data-testid="start-run">
            开始暑假
          </Button>
        )}
      </div>
    </main>
  );
}
