import { useCallback, useEffect, useRef, useState } from "react";
import { browserStorage } from "@/game/save";
import { planSfx, playSfx, readSoundPref, setSfxMuted, writeSoundPref } from "@/game/sfx";
import type { GameState } from "@/game/types";

/** 盯住对局状态，把每次推进翻译成音效。纯副作用，不碰规则。 */
export function useGameSfx(state: GameState): void {
  const prev = useRef<GameState | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    const ids = planSfx(before, state);
    if (ids.length > 0) playSfx(ids);
  }, [state]);
}

/** 静音开关；偏好跟着设备走，重新打开时响一声确认。 */
export function useSoundPref(): { on: boolean; toggle: () => void } {
  const [on, setOn] = useState(() => readSoundPref(browserStorage()));
  const toggle = useCallback(() => {
    setOn((current) => {
      const next = !current;
      writeSoundPref(browserStorage(), next);
      setSfxMuted(!next);
      if (next) playSfx(["pick"]);
      return next;
    });
  }, []);
  return { on, toggle };
}
