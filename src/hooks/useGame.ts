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
import { newRunSeed } from "@/game/challenge";
import { hashRandom } from "@/game/rules";
import type { Action, GameState, KeyedRandom, RulesContext } from "@/game/types";

interface BootSession {
  random: KeyedRandom;
  /** 本局种子；带种子的链接进来就是那一副牌，空串表示旧存档续玩 */
  runSeed: string;
  urlSeed: string | null;
}

function bootSession(): BootSession & {
  storage: ReturnType<typeof browserStorage>;
  loaded: GameState | null;
  resumed: boolean;
  corruptSave: boolean;
} {
  const storage = browserStorage();
  let loaded = loadSave(storage);
  const urlSeed = typeof window === "undefined" ? null : readSeed(window.location.search);
  // 挑战链接优先：带着别人的种子进来，就开同一副牌；旧进度让位给这一局
  if (urlSeed && loaded?.runSeed !== urlSeed) {
    clearSave(storage);
    loaded = null;
  }
  const runSeed = loaded ? loaded.runSeed : (urlSeed ?? newRunSeed());
  const random = runSeed ? seededRandom(runSeed) : hashRandom;
  return {
    storage,
    loaded,
    resumed: isResumable(loaded),
    corruptSave: loaded === null && hasCorruptSave(storage),
    urlSeed,
    runSeed,
    random,
  };
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
  /** 本局种子；非空时结算页可以生成「同一副牌挑战」链接 */
  runSeed: string;
  /** 有原始存档但无法通过校验，需要提示开启新局 */
  corruptSave: boolean;
  /** 直接用挂载时建好的新局开始，不重掷随机源 */
  beginFresh: () => void;
  restart: () => void;
}

export function useGame(): GameController {
  const [boot] = useState(bootSession);
  const [corruptSave, setCorruptSave] = useState(boot.corruptSave);
  const context = useMemo(
    () => ({ random: boot.random, seed: boot.runSeed || undefined }) as RulesContext,
    [boot.random, boot.runSeed],
  );

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
    seed: boot.urlSeed,
    runSeed: boot.runSeed,
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
