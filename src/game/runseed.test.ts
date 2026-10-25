import { describe, expect, it } from "vitest";
import {
  SAVE_SCHEMA_VERSION,
  createInitialState,
  hashRandom,
  reduce,
  type Action,
  type GameState,
  type RulesContext,
} from "./rules";
import {
  clearSave,
  hasCorruptSave,
  loadSave,
  saveState,
} from "./save";

function seeded(seed: string): RulesContext {
  return { random: hashRandom, seed };
}

function legacyCtx(): RulesContext {
  return { random: hashRandom };
}

function apply(state: GameState, ctx: RulesContext, ...actions: Action[]): GameState {
  return actions.reduce((acc, action) => reduce(acc, action, ctx), state);
}

function playThrough(state: GameState, ctx: RulesContext, pick: (s: GameState) => string): GameState {
  let current = state;
  while (current.phase === "picking" || current.phase === "replacing") {
    if (current.phase === "replacing") {
      current = apply(current, ctx, { kind: "REPLACE_CARD", cardId: current.hand[0].id });
      continue;
    }
    current = apply(current, ctx, { kind: "PICK_CARD", cardId: pick(current) });
  }
  return current;
}

describe("同一副牌挑战", () => {
  it("同一种子的两局，14 轮候选完全一致（与玩家选择无关）", () => {
    const ctxA = seeded("share-1");
    const ctxB = seeded("share-1");
    let a = createInitialState(ctxA);
    let b = createInitialState(ctxB);
    expect(a.candidates.map((card) => card.type)).toEqual(b.candidates.map((card) => card.type));

    // 两位玩家做出完全不同的选择
    for (let turn = 0; turn < 14; turn += 1) {
      if (a.phase === "replacing") {
        a = apply(a, ctxA, { kind: "REPLACE_CARD", cardId: a.hand[0].id });
      } else {
        a = apply(a, ctxA, { kind: "PICK_CARD", cardId: a.candidates[0].id });
      }
      if (b.phase === "replacing") {
        b = apply(b, ctxB, { kind: "REPLACE_CARD", cardId: b.hand[b.hand.length - 1].id });
      } else {
        b = apply(b, ctxB, { kind: "PICK_CARD", cardId: b.candidates[2].id });
      }
      expect(a.candidates.map((card) => card.type)).toEqual(
        b.candidates.map((card) => card.type),
      );
      expect(a.turn).toBe(b.turn);
    }
  });

  it("不同种子的两局候选几乎必然不同", () => {
    const a = createInitialState(seeded("seed-a"));
    const b = createInitialState(seeded("seed-b"));
    // 只比较首轮；36 种排列里撞车概率极低
    expect(a.candidates.map((card) => card.type).join(",")).not.toBe(
      b.candidates.map((card) => card.type).join(","),
    );
  });

  it("重开派生新种子，同起点的两位玩家重开后仍拿到同一副牌", () => {
    const ctxA = seeded("share-1");
    const ctxB = seeded("share-1");
    const a = playThrough(createInitialState(ctxA), ctxA, (s) => s.candidates[0].id);
    const b = playThrough(createInitialState(ctxB), ctxB, (s) => s.candidates[0].id);
    const nextA = apply(a, ctxA, { kind: "RESTART" });
    const nextB = apply(b, ctxB, { kind: "RESTART" });
    expect(nextA.runSeed).not.toBe("share-1");
    expect(nextA.runSeed).toBe(nextB.runSeed);
    expect(nextA.candidates).toEqual(nextB.candidates);
  });

  it("重开的候选与上一局不同（换了一副新牌）", () => {
    const ctx = seeded("share-1");
    const first = createInitialState(ctx);
    const next = apply(first, ctx, { kind: "RESTART" });
    expect(next.candidates.map((card) => card.type).join(",")).not.toBe(
      first.candidates.map((card) => card.type).join(","),
    );
  });

  it("无种子的旧局重开后也拿到可分享的种子", () => {
    const legacy = createInitialState(legacyCtx());
    expect(legacy.runSeed).toBe("");
    const next = apply(legacy, legacyCtx(), { kind: "RESTART" });
    expect(next.runSeed).not.toBe("");
    expect(next.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
  });
});

describe("存档迁移", () => {
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
    };
  }

  it("v1 存档自动迁移到 v2：补空种子，其余字段原样保留", () => {
    const state = createInitialState(seeded("share-1"));
    const v1: Record<string, unknown> = { ...state };
    delete v1.runSeed;
    v1.schemaVersion = 1;
    const loaded = loadSave(makeStorage({ "summer.save.v1": JSON.stringify(v1) }));
    expect(loaded?.schemaVersion).toBe(2);
    expect(loaded?.runSeed).toBe("");
    expect(loaded?.runId).toBe(state.runId);
    expect(loaded?.candidates).toEqual(state.candidates);
  });

  it("种子化的存档往返保留种子", () => {
    const ctx = seeded("share-1");
    let state = createInitialState(ctx);
    state = apply(state, ctx, { kind: "PICK_CARD", cardId: state.candidates[0].id });
    const storage = makeStorage();
    saveState(storage, state);
    const loaded = loadSave(storage);
    expect(loaded?.runSeed).toBe("share-1");
  });

  it("来自更新版本的存档判为损坏，需要明确开新局", () => {
    const state = createInitialState(legacyCtx());
    const storage = makeStorage({ "summer.save.v1": JSON.stringify({ ...state, schemaVersion: 99 }) });
    expect(loadSave(storage)).toBeNull();
    expect(hasCorruptSave(storage)).toBe(true);
    clearSave(storage);
    expect(hasCorruptSave(storage)).toBe(false);
  });

  it("runSeed 字段非法时判为损坏", () => {
    const state = createInitialState(legacyCtx());
    const bad = { ...state, runSeed: 123 };
    expect(loadSave(makeStorage({ "summer.save.v1": JSON.stringify(bad) }))).toBeNull();
    const tooLong = { ...state, runSeed: "x".repeat(65) };
    expect(loadSave(makeStorage({ "summer.save.v1": JSON.stringify(tooLong) }))).toBeNull();
  });
});
