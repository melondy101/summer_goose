import { describe, expect, it } from "vitest";
import {
  HAND_LIMIT,
  SAVE_KEY,
  SAVE_SCHEMA_VERSION,
  TOTAL_PICKS,
  createInitialState,
  hashRandom,
  reduce,
  type Action,
  type ActivityType,
  type GameState,
} from "./rules";
import {
  clearSave,
  hasCorruptSave,
  loadSave,
  saveAvailable,
  saveState,
} from "./save";
function ctx() {
  return { random: hashRandom };
}

function apply(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((acc, action) => reduce(acc, action, ctx()), state);
}

function fresh(): GameState {
  return createInitialState(ctx());
}

function withHand(state: GameState, types: ActivityType[]): GameState {
  return { ...state, hand: types.map((type, i) => ({ id: `h${i}-${type}`, type })) };
}

function makeStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    get size() {
      return map.size;
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
  };
}

describe("存档往返", () => {
  it("保存后能原样恢复，包括当前候选", () => {
    const storage = makeStorage();
    const state = fresh();
    saveState(storage, state);
    const loaded = loadSave(storage);
    expect(loaded).toEqual(state);
    expect(loaded?.candidates).toEqual(state.candidates);
  });

  it("恢复满手替换中的待替换卡", () => {
    const storage = makeStorage();
    let state = withHand(fresh(), ["research", "research", "tinker", "flap", "stroll", "record"]);
    state = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
    expect(state.phase).toBe("replacing");
    saveState(storage, state);
    const loaded = loadSave(storage);
    expect(loaded?.phase).toBe("replacing");
    expect(loaded?.pendingCard).toEqual(state.pendingCard);
    expect(loaded?.hand).toHaveLength(HAND_LIMIT);
  });

  it("恢复最后整理阶段", () => {
    const storage = makeStorage();
    let state = fresh();
    for (let i = 0; i < TOTAL_PICKS; i += 1) {
      state = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
      if (state.phase === "replacing") {
        state = apply(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id });
      }
    }
    expect(state.phase).toBe("finalTidy");
    saveState(storage, state);
    expect(loadSave(storage)?.phase).toBe("finalTidy");
  });

  it("恢复结算阶段", () => {
    const storage = makeStorage();
    let state = fresh();
    for (let i = 0; i < TOTAL_PICKS; i += 1) {
      state = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
      if (state.phase === "replacing") {
        state = apply(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id });
      }
    }
    state = apply(state, { kind: "FINISH" });
    saveState(storage, state);
    const loaded = loadSave(storage);
    expect(loaded?.phase).toBe("settled");
    expect(loaded?.ending).toEqual(state.ending);
  });

  it("刷新后保留台词、满手已提示标记和材料提醒", () => {
    const storage = makeStorage();
    let state = withHand(fresh(), ["flap", "stroll", "record", "research", "tinker", "share"]);
    state = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
    state = apply(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id });
    saveState(storage, state);
    const loaded = loadSave(storage);
    expect(loaded?.speech).toEqual(state.speech);
    expect(loaded?.bagFullAnnounced).toBe(state.bagFullAnnounced);
    expect(loaded?.notedFork).toEqual(state.notedFork);
  });
});

describe("损坏存档", () => {
  it("空存储返回 null", () => {
    expect(loadSave(makeStorage())).toBeNull();
  });

  it("非 JSON 内容返回 null", () => {
    expect(loadSave(makeStorage({ [SAVE_KEY]: "not json" }))).toBeNull();
  });

  it("版本不匹配返回 null", () => {
    const state = fresh();
    const raw = JSON.stringify({ ...state, schemaVersion: 999 });
    expect(loadSave(makeStorage({ [SAVE_KEY]: raw }))).toBeNull();
  });

  it("缺少核心字段返回 null", () => {
    const raw = JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION, runId: "r1" });
    expect(loadSave(makeStorage({ [SAVE_KEY]: raw }))).toBeNull();
  });

  it("实例 ID 重复返回 null", () => {
    const state = fresh();
    const broken = {
      ...state,
      candidates: [state.candidates[0], state.candidates[0], state.candidates[1]],
    };
    expect(loadSave(makeStorage({ [SAVE_KEY]: JSON.stringify(broken) }))).toBeNull();
  });

  it("手牌超限返回 null", () => {
    const state = withHand(fresh(), [
      "research",
      "research",
      "tinker",
      "flap",
      "stroll",
      "record",
      "share",
    ]);
    expect(loadSave(makeStorage({ [SAVE_KEY]: JSON.stringify(state) }))).toBeNull();
  });

  it("turn 超过 14 返回 null", () => {
    const state = { ...fresh(), turn: 15 };
    expect(loadSave(makeStorage({ [SAVE_KEY]: JSON.stringify(state) }))).toBeNull();
  });

  it("阶段与 turn 不一致返回 null", () => {
    const state = { ...fresh(), phase: "finalTidy" as const, turn: 3 };
    expect(loadSave(makeStorage({ [SAVE_KEY]: JSON.stringify(state) }))).toBeNull();
  });

  it("替换阶段缺少待替换卡返回 null", () => {
    let state = withHand(fresh(), ["research", "research", "tinker", "flap", "stroll", "record"]);
    state = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
    const broken = { ...state, pendingCard: null };
    expect(loadSave(makeStorage({ [SAVE_KEY]: JSON.stringify(broken) }))).toBeNull();
  });

  it("speech 种类无法识别时视为没有台词，本局可继续", () => {
    const state = fresh();
    const broken = { ...state, speech: { kind: "nonsense" } };
    const loaded = loadSave(makeStorage({ [SAVE_KEY]: JSON.stringify(broken) }));
    expect(loaded).not.toBeNull();
    expect(loaded?.speech).toBeNull();
  });

  it("需要配方 ID 时缺失则视为没有台词", () => {
    const state = fresh();
    const broken = { ...state, speech: { kind: "firstSouvenir" } };
    const loaded = loadSave(makeStorage({ [SAVE_KEY]: JSON.stringify(broken) }));
    expect(loaded?.speech).toBeNull();
  });

  it("bagFullAnnounced 缺失时视为尚未提示", () => {
    const state = fresh();
    const rest = { ...state } as Partial<typeof state>;
    delete rest.bagFullAnnounced;
    const loaded = loadSave(makeStorage({ [SAVE_KEY]: JSON.stringify(rest) }));
    expect(loaded?.bagFullAnnounced).toBe(false);
  });

  it("非法的材料提醒被丢弃且本局可继续", () => {
    const state = withHand(fresh(), ["research", "research", "tinker"]);
    const cases: unknown[] = [
      { craftRecipeId: "nope", otherRecipeId: "demo", materials: ["research"] },
      { craftRecipeId: "tool", otherRecipeId: "tool", materials: ["research"] },
      { craftRecipeId: "tool", otherRecipeId: "demo", materials: [] },
      { craftRecipeId: "tool", otherRecipeId: "demo", materials: ["nope"] },
      "garbage",
    ];
    for (const notedFork of cases) {
      const loaded = loadSave(
        makeStorage({ [SAVE_KEY]: JSON.stringify({ ...state, notedFork }) }),
      );
      expect(loaded, JSON.stringify(notedFork)).not.toBeNull();
      expect(loaded?.notedFork).toBeNull();
    }
  });
});

describe("损坏存档要有明确入口", () => {
  it("有原始存档但解析失败时判定为损坏", () => {
    const storage = makeStorage({ [SAVE_KEY]: "{ 这不是 JSON" });
    expect(loadSave(storage)).toBeNull();
    expect(hasCorruptSave(storage)).toBe(true);
  });

  it("核心字段缺失时判定为损坏", () => {
    const storage = makeStorage({ [SAVE_KEY]: JSON.stringify({ schemaVersion: 1 }) });
    expect(loadSave(storage)).toBeNull();
    expect(hasCorruptSave(storage)).toBe(true);
  });

  it("没有存档时不算损坏", () => {
    const storage = makeStorage();
    expect(hasCorruptSave(storage)).toBe(false);
  });

  it("存档可正常解析时不算损坏", () => {
    const storage = makeStorage();
    saveState(storage, fresh());
    expect(hasCorruptSave(storage)).toBe(false);
  });

  it("清掉存档后不再判定为损坏", () => {
    const storage = makeStorage({ [SAVE_KEY]: "坏数据" });
    clearSave(storage);
    expect(hasCorruptSave(storage)).toBe(false);
  });

  it("存储不可用时不算损坏", () => {
    expect(hasCorruptSave(undefined)).toBe(false);
  });
});

describe("存储不可用", () => {  it("saveAvailable 在无 storage 时为 false", () => {
    expect(saveAvailable(undefined)).toBe(false);
  });

  it("storage 抛错时保存不崩溃且读取返回 null", () => {
    const hostile = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(saveAvailable(hostile)).toBe(false);
    expect(() => saveState(hostile, fresh())).not.toThrow();
    expect(loadSave(hostile)).toBeNull();
    expect(() => clearSave(hostile)).not.toThrow();
  });
});
