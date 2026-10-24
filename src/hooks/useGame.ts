import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { createInitialState, reduce } from "@/game/rules";
import {
  browserStorage,
  clearSave,
  hasCorruptSave,
  isResumable,
  loadSave,
  saveState,
} from "@/game/save";
import { readSeed, seededRandom } from "@/game/random";
import { hashRandom } from "@/game/rules";
import type { Action, GameState, KeyedRandom } from "@/game/types";

function resolveRandom(): { random: KeyedRandom; seed: string | null } {
  if (typeof window === "undefined") return { random: hashRandom, seed: null };
  const seed = readSeed(window.location.search);
  return { random: seed ? seededRandom(seed) : hashRandom, seed };
}

export interface GameController {
  state: GameState;
  dispatch: (action: Action) => void;
  /** 存档是否可用；不可用时降级为本次页面内游玩 */
  storageReady: boolean;
  /** 进入时是否带回了可继续的进度 */
  resumed: boolean;
  /** 开发测试种子，非空时整局候选可复现 */
  seed: string | null;
  /** 有原始存档但无法通过校验，需要提示开启新局 */
  corruptSave: boolean;
  /** 直接用挂载时建好的新局开始，不重掷随机源 */
  beginFresh: () => void;
  restart: () => void;
}

export function useGame(): GameController {
  const [boot] = useState(() => {
    const storage = browserStorage();
    const loaded = loadSave(storage);
    return {
      storage,
      loaded,
      resumed: isResumable(loaded),
      corruptSave: loaded === null && hasCorruptSave(storage),
    };
  });
  const [source] = useState(() => resolveRandom());
  const [corruptSave, setCorruptSave] = useState(boot.corruptSave);
  const context = useMemo(() => ({ random: source.random }), [source.random]);

  const boundReduce = useMemo(
    () => (state: GameState, action: Action) => reduce(state, action, context),
    [context],
  );

  const [state, dispatch] = useReducer(boundReduce, boot.loaded, (saved) => {
    return saved ?? createInitialState(context);
  });

  useEffect(() => {
    saveState(boot.storage, state);
  }, [boot.storage, state]);

  const beginFresh = useCallback(() => {
    clearSave(boot.storage);
    setCorruptSave(false);
  }, [boot.storage]);

  const restart = useCallback(() => {
    clearSave(boot.storage);
    setCorruptSave(false);
    dispatch({ kind: "RESTART" });
  }, [boot.storage]);

  return {
    state,
    dispatch,
    storageReady: Boolean(boot.storage),
    resumed: boot.resumed,
    seed: source.seed,
    corruptSave,
    beginFresh,
    restart,
  };
}

/** 开始页是否需要「继续」按钮。 */
export function useHasSave(): boolean {
  const [hasSave] = useState(() => isResumable(loadSave(browserStorage())));
  return hasSave;
}
