import { Volume2, VolumeX } from "lucide-react";
import { useSoundPref } from "@/hooks/useSfx";
import { cn } from "@/lib/utils";

/** 右上角常驻的音效开关。 */
export function SoundToggle() {
  const { on, toggle } = useSoundPref();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "关闭音效" : "打开音效"}
      data-testid="sound-toggle"
      title={on ? "关闭音效" : "打开音效"}
      className={cn(
        "fixed right-3 top-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-card border-2 border-outline bg-card text-ink transition-colors hover:bg-paper",
        "motion-safe:active:scale-95",
      )}
    >
      {on ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
    </button>
  );
}
