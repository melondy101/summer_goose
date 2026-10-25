import { useEffect, useRef, useState } from "react";
import { AMAN_IMAGE } from "@/game/artwork";
import { buildChallengeUrl } from "@/game/challenge";
import { Button } from "@/components/ui/button";

interface ChallengeCardProps {
  /** 本局种子；空串（旧存档续玩的局）时整卡不显示 */
  runSeed: string;
  madeCount: number;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 走下面的兜底
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** 结算页的「同一副牌挑战」卡：把本局种子变成可以发给朋友的链接。 */
export function ChallengeCard({ runSeed, madeCount }: ChallengeCardProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  if (!runSeed) return null;

  const url = buildChallengeUrl(window.location.origin, window.location.pathname, runSeed);

  const onCopy = async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <section
      aria-label="同一副牌挑战"
      data-testid="challenge-section"
      className="flex flex-col gap-3 rounded-card border-2 border-accent bg-paper p-4"
    >
      <div className="flex items-center gap-3">
        <img
          src={AMAN_IMAGE}
          alt="大鹅阿满"
          className="h-14 w-14 shrink-0 rounded-card border-2 border-outline bg-card object-cover p-0.5"
          draggable={false}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-ink">同一副牌，换你来捡</h2>
          <p className="text-xs leading-relaxed text-ink/75">
            这局{madeCount > 0 ? `阿满做成了 ${madeCount} 件展品` : "阿满一件都没做成"}。
            把链接发给朋友，你们拿到的 14 轮候选牌一模一样，看谁的小展览更热闹。
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          data-testid="challenge-code"
          className="rounded-card border-2 border-outline bg-card px-2 py-1 font-mono text-xs text-ink"
        >
          {runSeed}
        </span>
        <Button variant="outline" onClick={onCopy} data-testid="challenge-copy" className="sm:h-9 sm:px-3 sm:text-xs">
          {copied ? "已复制，去发给朋友" : "复制挑战链接"}
        </Button>
      </div>
    </section>
  );
}
